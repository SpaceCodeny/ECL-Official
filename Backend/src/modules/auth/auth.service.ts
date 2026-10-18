import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { PrismaService } from "@/database/prisma.service";
import type { EnvConfig } from "@/config/configuration";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";

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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  // ─── Registro ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, ipAddress?: string): Promise<{ message: string }> {
    // Verifica duplicidade
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      if (existing.email === dto.email) throw new ConflictException("E-mail já cadastrado");
      throw new ConflictException("Nome de usuário já em uso");
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        displayName: dto.displayName,
        role: UserRole.VISITOR,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });

    // TODO (Fase 3): Disparar e-mail de verificação via MailService quando configurado.
    this.logger.log(`Novo usuário registrado: ${dto.email} (IP: ${ipAddress ?? "desconhecido"})`);

    return { message: "Cadastro realizado. Verifique seu e-mail para ativar a conta." };
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokens & { user: UserProfile }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
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

    if (!user) throw new UnauthorizedException("Credenciais inválidas");

    const passwordMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatch) throw new UnauthorizedException("Credenciais inválidas");

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException("Conta suspensa. Entre em contato com o suporte.");
    }
    if (user.status === UserStatus.DELETED) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    // Permite login com conta PENDING (mas avisa via status na resposta).

    const tokens = await this.generateTokens(user.id, user.email, user.username, user.role, user.status);

    // Persiste refresh token hasheado.
    await this.storeRefreshToken(user.id, tokens.refreshToken, userAgent, ipAddress);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { passwordHash: _, ...profile } = user;
    return { ...tokens, user: profile };
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.userSession.updateMany({
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

    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, username: true, role: true, status: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Sessão expirada ou inválida");
    }
    if (session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Conta inativa");
    }

    // Rota de token: revoga o token antigo, emite novos.
    await this.prisma.userSession.update({
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Sempre retorna a mesma mensagem para não vazar informações.
    const genericMsg = "Se o e-mail estiver cadastrado, você receberá as instruções em breve.";
    if (!user || user.status === UserStatus.DELETED) return { message: genericMsg };

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalida tokens anteriores não usados.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // TODO: Enviar e-mail com rawToken quando MAIL_PROVIDER !== 'none'.
    const mailConfigured = this.config.get("MAIL_PROVIDER", { infer: true }) !== "none";
    if (!mailConfigured) {
      this.logger.warn(
        `[forgot-password] MAIL_PROVIDER=none — e-mail não enviado para ${user.email}. Configure o provedor de e-mail em .env.`,
      );
    } else {
      this.logger.log(`[forgot-password] E-mail de reset enviado para ${user.email}`);
    }

    return { message: genericMsg };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Token inválido ou expirado");
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Revoga todas as sessões existentes por segurança.
      this.prisma.userSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: "Senha redefinida com sucesso. Faça login novamente." };
  }

  // ─── Perfil do usuário autenticado ──────────────────────────────────────────

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
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
    if (!user) throw new NotFoundException("Usuário não encontrado");
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
    const payload: Record<string, unknown> = { sub: userId, email, username, role, status };

    const accessSecret = this.config.get("JWT_ACCESS_SECRET", { infer: true });
    const refreshSecret = this.config.get("JWT_REFRESH_SECRET", { infer: true });
    const accessTtl = this.config.get("JWT_ACCESS_TTL", { infer: true });
    const refreshTtl = this.config.get("JWT_REFRESH_TTL", { infer: true });

    // cast necessário: @nestjs/jwt 11 usa StringValue de 'ms' que não aceita
    // string literal em modo strict, mas o valor "15m"/"7d" é válido em runtime.
    type JwtSignOpts = Parameters<typeof this.jwt.sign>[1];
    const accessOpts = { secret: accessSecret, expiresIn: accessTtl } as unknown as JwtSignOpts;
    const refreshOpts = { secret: refreshSecret, expiresIn: refreshTtl } as unknown as JwtSignOpts;

    const accessToken = this.jwt.sign(payload, accessOpts);
    const refreshToken = this.jwt.sign({ sub: userId } as Record<string, unknown>, refreshOpts);

    const decoded = this.jwt.decode(accessToken) as { exp: number; iat: number };
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
    const refreshTtl = this.config.get("JWT_REFRESH_TTL", { infer: true });

    // Converte "7d" / "15m" em milissegundos.
    const expiresAt = new Date(Date.now() + this.parseTtl(refreshTtl));

    await this.prisma.userSession.create({
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
