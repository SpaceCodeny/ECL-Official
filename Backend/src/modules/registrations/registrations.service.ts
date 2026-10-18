import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";
import { RegistrationStatus, TournamentStatus, UserRole } from "@prisma/client";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { hasAnyRole } from "@/common/utils/role-check";

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Capitão inscreve sua equipe em um campeonato.
   * Usa transação para evitar race condition na reserva de vagas.
   */
  async register(tournamentId: string, teamId: string, actor: JwtPayload) {
    return this.prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findFirst({
        where: { id: tournamentId, deletedAt: null },
      });
      if (!tournament) throw new NotFoundException("Campeonato não encontrado");
      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        throw new BadRequestException("Inscrições não estão abertas para este campeonato");
      }
      if (tournament.registrationDeadline && tournament.registrationDeadline < new Date()) {
        throw new BadRequestException("Prazo de inscrição encerrado");
      }

      const team = await tx.team.findFirst({ where: { id: teamId, deletedAt: null } });
      if (!team) throw new NotFoundException("Equipe não encontrada");

      // Apenas o capitão pode inscrever
      const isAdmin = hasAnyRole(actor.role, UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN);
      if (!isAdmin && team.captainId !== actor.sub) {
        throw new ForbiddenException("Apenas o capitão pode inscrever a equipe");
      }

      // Verifica duplicidade
      const existing = await tx.tournamentRegistration.findFirst({
        where: {
          tournamentId,
          teamId,
          status: { not: RegistrationStatus.WITHDRAWN },
        },
      });
      if (existing) throw new ConflictException("Equipe já inscrita neste campeonato");

      // Conta vagas (dentro da transação para evitar race condition)
      const approvedCount = await tx.tournamentRegistration.count({
        where: { tournamentId, status: RegistrationStatus.APPROVED },
      });
      if (approvedCount >= tournament.maxTeams) {
        throw new BadRequestException("Vagas esgotadas para este campeonato");
      }

      const status = tournament.autoApprove
        ? RegistrationStatus.APPROVED
        : RegistrationStatus.PENDING;

      return tx.tournamentRegistration.create({
        data: { tournamentId, teamId, status },
        include: { team: { select: { id: true, name: true, slug: true } } },
      });
    });
  }

  async list(tournamentId: string, statusFilter?: string) {
    const statuses = statusFilter
      ? (statusFilter.split(",") as RegistrationStatus[])
      : undefined;

    return this.prisma.tournamentRegistration.findMany({
      where: {
        tournamentId,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: {
        team: { select: { id: true, slug: true, name: true, tag: true, logoUrl: true } },
      },
      orderBy: { submittedAt: "asc" },
    });
  }

  async review(
    registrationId: string,
    newStatus: "APPROVED" | "REJECTED",
    actor: JwtPayload,
  ) {
    this.assertAdmin(actor);

    const reg = await this.prisma.tournamentRegistration.findUnique({
      where: { id: registrationId },
      include: { tournament: true },
    });
    if (!reg) throw new NotFoundException("Inscrição não encontrada");
    if (reg.status !== RegistrationStatus.PENDING) {
      throw new BadRequestException("Inscrição já foi revisada");
    }

    return this.prisma.tournamentRegistration.update({
      where: { id: registrationId },
      data: { status: newStatus, reviewedAt: new Date(), reviewedById: actor.sub },
    });
  }

  async withdraw(registrationId: string, actor: JwtPayload) {
    const reg = await this.prisma.tournamentRegistration.findUnique({
      where: { id: registrationId },
      include: { team: true, tournament: true },
    });
    if (!reg) throw new NotFoundException("Inscrição não encontrada");

    const isAdmin = hasAnyRole(actor.role, UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN);
    const isCaptain = actor.sub === reg.team.captainId;
    if (!isAdmin && !isCaptain) throw new ForbiddenException("Sem permissão");

    if (reg.status === RegistrationStatus.WITHDRAWN) {
      throw new BadRequestException("Inscrição já retirada");
    }

    return this.prisma.tournamentRegistration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.WITHDRAWN },
    });
  }

  private assertAdmin(actor: JwtPayload) {
    if (!hasAnyRole(actor.role, UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ORGANIZER)) {
      throw new ForbiddenException("Sem permissão para revisar inscrições");
    }
  }
}
