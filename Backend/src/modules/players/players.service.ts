import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, PlayerStatus, UserRole, UserStatus } from "@prisma/client";
import { PrismaService } from "@/database/prisma.service";
import * as argon2 from "argon2";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { hasAnyRole } from "@/common/utils/role-check";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface AdminCreatePlayerDto {
  /** Dados de conta */
  username: string;
  email: string;
  password: string;
  displayName: string;
  /** Dados de perfil (opcionais) */
  standoffId?: string;
  bio?: string;
  country?: string;
}

export interface TransferPlayerDto {
  /** ID do time de destino. Null = enviar para o banco. */
  toTeamId: string | null;
  /**
   * Se o jogador já estiver em time, o frontend envia force=true
   * após o usuário confirmar o modal de aviso.
   */
  force?: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Criar jogador com login ────────────────────────────────────────────────

  async adminCreatePlayer(dto: AdminCreatePlayerDto, actor: JwtPayload) {
    this.assertAdmin(actor);

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? "E-mail já cadastrado" : "Username já em uso",
      );
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          role: UserRole.PLAYER,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(), // admin cria ativo diretamente
        },
      });

      await tx.playerProfile.create({
        data: {
          userId: newUser.id,
          standoffId: dto.standoffId,
          bio: dto.bio,
          country: dto.country,
          status: PlayerStatus.BENCH,
        },
      });

      return newUser;
    });

    return this.findPlayerByUserId(user.id);
  }

  // ─── Listar jogadores ───────────────────────────────────────────────────────

  async listPlayers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: PlayerStatus;
  }) {
    const { page = 1, pageSize = 30, search, status } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      playerProfile: status ? { status } : { isNot: null },
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { displayName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { displayName: "asc" },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          role: true,
          status: true,
          createdAt: true,
          playerProfile: {
            select: {
              id: true,
              standoffId: true,
              bio: true,
              country: true,
              status: true,
              memberships: {
                where: { leftAt: null },
                select: {
                  id: true,
                  role: true,
                  joinedAt: true,
                  team: { select: { id: true, name: true, slug: true, tag: true, logoUrl: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── Detalhe do jogador ─────────────────────────────────────────────────────

  async getPlayerDetail(userId: string) {
    const player = await this.findPlayerByUserId(userId);

    const history = await this.prisma.playerTransferHistory.findMany({
      where: { playerId: player.playerProfile!.id },
      orderBy: { createdAt: "desc" },
    });

    return { ...player, transferHistory: history };
  }

  // ─── Transferir jogador / enviar para o banco ───────────────────────────────

  /**
   * Regras:
   * 1. Se toTeamId é null → envia para o banco (remove do time atual).
   * 2. Se toTeamId aponta para um time → transfere.
   *    - Se o jogador já está em algum time e force !== true → retorna 409 com
   *      informações do time atual para o frontend mostrar o modal de confirmação.
   *    - Se force === true → remove do time atual e adiciona ao novo.
   */
  async transferPlayer(userId: string, dto: TransferPlayerDto, actor: JwtPayload) {
    this.assertAdmin(actor);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { playerProfile: { include: { memberships: { where: { leftAt: null }, include: { team: true } } } } },
    });
    if (!user?.playerProfile) throw new NotFoundException("Jogador não encontrado");

    const profile = user.playerProfile;
    const activeMembership = profile.memberships[0] ?? null;
    const currentTeam = activeMembership?.team ?? null;

    // ── Enviar para o banco (toTeamId = null) ──
    if (!dto.toTeamId) {
      if (!currentTeam) {
        return { message: "Jogador já está no banco.", alreadyBench: true };
      }
      return this.sendToBench(profile.id, activeMembership!, currentTeam, actor);
    }

    // ── Transferir para outro time ──
    const toTeam = await this.prisma.team.findFirst({
      where: { id: dto.toTeamId, deletedAt: null },
    });
    if (!toTeam) throw new NotFoundException("Time de destino não encontrado");

    // Já está nesse time
    if (currentTeam?.id === dto.toTeamId) {
      throw new ConflictException("Jogador já faz parte deste time");
    }

    // Está em outro time e não confirmou
    if (currentTeam && !dto.force) {
      // Retorna 409 com dados do time atual para o frontend mostrar o modal
      throw new ConflictException(
        JSON.stringify({
          code: "PLAYER_IN_TEAM",
          currentTeam: { id: currentTeam.id, name: currentTeam.name, tag: currentTeam.tag },
          message: `${user.displayName} está atualmente no time "${currentTeam.name}". Confirmar transferência?`,
        }),
      );
    }

    return this.doTransfer(profile.id, user.displayName, activeMembership ?? null, currentTeam, toTeam, actor);
  }

  // ─── Helpers privados ────────────────────────────────────────────────────────

  private async sendToBench(
    profileId: string,
    membership: { id: string },
    currentTeam: { id: string; name: string },
    actor: JwtPayload,
  ) {
    const user = await this.prisma.playerProfile.findUnique({
      where: { id: profileId },
      include: { user: { select: { displayName: true } } },
    });

    await this.prisma.$transaction(async (tx) => {
      // Encerra membership atual
      await tx.teamMembership.update({
        where: { id: membership.id },
        data: { leftAt: new Date() },
      });

      // Atualiza status para BENCH
      await tx.playerProfile.update({
        where: { id: profileId },
        data: { status: PlayerStatus.BENCH },
      });

      // Registra no histórico
      await tx.playerTransferHistory.create({
        data: {
          playerId: profileId,
          fromTeamId: currentTeam.id,
          fromTeamName: currentTeam.name,
          description: `${currentTeam.name} moveu ${user?.user.displayName ?? "jogador"} para o banco.`,
          transferredBy: actor.sub,
        },
      });
    });

    return { message: "Jogador enviado para o banco com sucesso." };
  }

  private async doTransfer(
    profileId: string,
    playerName: string,
    currentMembership: { id: string } | null,
    fromTeam: { id: string; name: string } | null,
    toTeam: { id: string; name: string },
    actor: JwtPayload,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // Remove do time atual, se houver
      if (currentMembership) {
        await tx.teamMembership.update({
          where: { id: currentMembership.id },
          data: { leftAt: new Date() },
        });
      }

      // Adiciona ao novo time
      await tx.teamMembership.create({
        data: { teamId: toTeam.id, playerId: profileId, role: "PLAYER" },
      });

      // Atualiza status para ACTIVE
      await tx.playerProfile.update({
        where: { id: profileId },
        data: { status: PlayerStatus.ACTIVE },
      });

      // Registra no histórico
      const desc = fromTeam
        ? `${playerName} transferido de "${fromTeam.name}" para "${toTeam.name}".`
        : `${playerName} contratado pelo time "${toTeam.name}".`;

      await tx.playerTransferHistory.create({
        data: {
          playerId: profileId,
          fromTeamId: fromTeam?.id,
          fromTeamName: fromTeam?.name,
          toTeamId: toTeam.id,
          toTeamName: toTeam.name,
          description: desc,
          transferredBy: actor.sub,
        },
      });
    });

    return { message: "Transferência realizada com sucesso." };
  }

  private async findPlayerByUserId(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true, username: true, displayName: true, email: true,
        avatarUrl: true, role: true, status: true, createdAt: true,
        playerProfile: {
          select: {
            id: true, standoffId: true, bio: true, country: true, status: true,
            memberships: {
              where: { leftAt: null },
              select: {
                id: true, role: true, joinedAt: true,
                team: { select: { id: true, name: true, slug: true, tag: true, logoUrl: true } },
              },
            },
          },
        },
      },
    });
    if (!user?.playerProfile) throw new NotFoundException("Jogador não encontrado");
    return user;
  }

  private assertAdmin(actor: JwtPayload) {
    if (!hasAnyRole(actor.role, UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException("Apenas administradores podem executar esta ação");
    }
  }
}
