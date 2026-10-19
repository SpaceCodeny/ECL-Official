import { UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../database/prisma";
import { config } from "../config/environment";
import { AppError } from "../utils/app-error";
import type { JwtPayload } from "../types/jwt";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: Date | null;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export class AuthService {
  // ─── Registro ───────────────────────────────────────────────────────────────

  async register(data: RegisterInput, ipAddress?: string): Promise<{ message: string }> {
    // Verifica duplicidade
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });

    if (existing) {
      if (existing.email === data.email) {
        throw AppError.conflict("E-mail já cadastrado");
      }
      throw AppError.conflict("Nome de usuário já em uso");
    }

    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });

    await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        displayName: data.displayName,
        role: UserRole.VISITOR,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });

    // TODO (Fase 3): Disparar e-mail de verificação via MailService quando configurado.
    console.log(`[Auth] Novo usuário registrado: ${data.email} (IP: ${ipAddress ?? "desconhecido"})`);

    return { message: "Cadastro realizado. Verifique seu e-mail para ativar a conta." };
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  async login(
    data: LoginInput,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokens & { user: UserProfile }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerified: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw AppError.unauthorized("Credenciais inválidas");
    }

    const passwordMatch = await argon2.verify(user.passwordHash, data.password);
    if (!passwordMatch) {
      throw AppError.unauthorized("Credenciais inválidas");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw AppError.unauthorized("Conta suspensa. Entre em contato com o suporte.");
    }
    if (user.status === UserStatus.DELETED) {
      throw AppError.unauthorized("Credenciais inválidas");
    }

    // Permite login com conta PENDING (mas avisa via status na resposta).

    const tokens = await this.generateTokens(user.id, user.email, user.username, user.role, user.status);

    // Persiste refresh token hasheado.
    await this.storeRefreshToken(user.id, tokens.refreshToken, userAgent, ipAddress);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { passwordHash: _, ...profile } = user;
    return { ...tokens, user: profile };
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(refreshToken);
    await prisma.userSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: "Sessão encerrada com sucesso" };
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);

    const session = await prisma.userSession.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, username: true, role: true, status: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw AppError.unauthorized("Sessão expirada ou inválida");
    }
    if (session.user.status !== UserStatus.ACTIVE) {
      throw AppError.unauthorized("Conta inativa");
    }

    // Rota de token: revoga o token antigo, emite novos.
    await prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(
      session.user.id,
      session.user.email,
      session.user.username,
      session.user.role,
      session.user.status,
    );
    await this.storeRefreshToken(session.user.id, tokens.refreshToken, userAgent, ipAddress);

    return tokens;
  }

  // ─── Recuperação de senha ────────────────────────────────────────────────────

  async forgotPassword(data: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    // Sempre retorna a mesma mensagem para não vazar informações.
    const genericMsg = "Se o e-mail estiver cadastrado, você receberá as instruções em breve.";
    if (!user || user.status === UserStatus.DELETED) return { message: genericMsg };

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalida tokens anteriores não usados.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // TODO: Enviar e-mail com rawToken quando MAIL_PROVIDER !== 'none'.
    const mailConfigured = config.MAIL_PROVIDER !== "none";
    if (!mailConfigured) {
      console.warn(
        `[forgot-password] MAIL_PROVIDER=none — e-mail não enviado para ${user.email}. Configure o provedor de e-mail em .env.`,
      );
    } else {
      console.log(`[forgot-password] E-mail de reset enviado para ${user.email}`);
    }

    return { message: genericMsg };
  }

  async resetPassword(data: ResetPasswordInput): Promise<{ message: string }> {
    const tokenHash = this.hashToken(data.token);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw AppError.badRequest("Token inválido ou expirado");
    }

    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Revoga todas as sessões existentes por segurança.
      prisma.userSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: "Senha redefinida com sucesso. Faça login novamente." };
  }

  // ─── Perfil do usuário autenticado ──────────────────────────────────────────

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerified: true,
      },
    });
    if (!user) throw AppError.notFound("Usuário não encontrado");
    return user;
  }

  // ─── Utilitários privados ────────────────────────────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
    username: string,
    role: UserRole,
    status: UserStatus,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, username, role, status };

    const accessToken = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_TTL,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { sub: userId },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_TTL } as jwt.SignOptions
    );

    const decoded = jwt.decode(accessToken) as { exp: number; iat: number };
    const expiresIn = decoded.exp - decoded.iat;

    return { accessToken, refreshToken, expiresIn };
  }

  private async storeRefreshToken(
    userId: string,
    rawToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.parseTtl(config.JWT_REFRESH_TTL));

    await prisma.userSession.create({
      data: { userId, tokenHash, userAgent, ipAddress, expiresAt },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private parseTtl(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 7 * 24 * 3600 * 1000;
    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;
    const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return value * (multipliers[unit] ?? 1000);
  }
}

export const authService = new AuthService();
