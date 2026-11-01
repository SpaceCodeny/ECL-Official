import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { UserRole, RegistrationStatus, TournamentStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { optionalAuth } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { AppError, getParam } from "../utils/app-error";
import { getPayment, createPixPayment, paymentToResult, getPaymentByExternalReference } from "../services/mercadopago.service";
import { ensureRankingEntry } from "../utils/ranking";

export const registrationsRouter = Router();

const CreateRegistrationSchema = z.object({
  teamId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

// Schema para inscrição com criação de time em uma única chamada (fluxo do líder)
const PlayerEntrySchema = z.object({
  nick: z.string().min(1).max(50),
  role: z.enum(["PLAYER", "SUBSTITUTE"]).default("PLAYER"),
});

const RegisterWithTeamSchema = z.object({
  tournamentId: z.string().uuid(),
  teamName: z.string().min(3).max(50),
  teamTag: z.string().min(1).max(6),
  leaderName: z.string().min(2).max(80),
  leaderPhone: z.string().min(8).max(20),
  players: z.array(PlayerEntrySchema).min(5, "Mínimo 5 jogadores").max(7, "Máximo 7 jogadores (5 titulares + 2 reservas)"),
});

const ReviewRegistrationSchema = z.object({
  notes: z.string().max(500).optional(),
});

/**
 * @openapi
 * /api/v1/registrations/with-team:
 *   post:
 *     tags:
 *       - Registrations
 *     summary: Criar time e inscrever no torneio (fluxo público do líder)
 *     description: |
 *       Não requer autenticação. Cria um time com os dados fornecidos,
 *       armazena nome do líder, telefone e nicks dos jogadores no campo notes,
 *       e inscreve o time no torneio com status PENDING aguardando aprovação do admin.
 */
registrationsRouter.post(
  "/with-team",
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tournamentId, teamName, teamTag, leaderName, leaderPhone, players } =
        RegisterWithTeamSchema.parse(req.body);

      // 1. Valida o torneio
      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");
      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        throw AppError.badRequest("As inscrições não estão abertas para este torneio");
      }

      // 2. Verifica nome duplicado
      const slugCandidate = teamName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      const existingTeam = await prisma.team.findFirst({
        where: { OR: [{ name: teamName }, { slug: slugCandidate }], deletedAt: null },
      });
      if (existingTeam) throw AppError.conflict("Já existe um time com este nome");

      // 3. Monta notes com todos os dados do líder e jogadores
      const titulares = players.filter((p) => p.role === "PLAYER");
      const reservas = players.filter((p) => p.role === "SUBSTITUTE");
      const notes = [
        `� Líder: ${leaderName}`,
        `�📱 Telefone: ${leaderPhone}`,
        `👥 Titulares: ${titulares.map((p) => p.nick).join(", ")}`,
        ...(reservas.length > 0 ? [`🔄 Reservas: ${reservas.map((p) => p.nick).join(", ")}`] : []),
      ].join("\n");

      // 4. Usa o organizador do torneio como captainId temporário
      // (captainId não tem FK no schema, sem constraint de User)
      const captainId = req.user?.sub ?? tournament.organizerId;

      // 5. Cria o time e a inscrição em transação
      const result = await prisma.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: { name: teamName, slug: slugCandidate, tag: teamTag, captainId },
        });

        const registration = await tx.tournamentRegistration.create({
          data: {
            tournamentId,
            teamId: team.id,
            // Sempre PENDING — admin aprova manualmente após conferir os dados
            status: RegistrationStatus.PENDING,
            paymentStatus: tournament.paymentRequired
              ? PaymentStatus.PENDING
              : PaymentStatus.NOT_REQUIRED,
            notes,
          },
          include: {
            team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
            tournament: { select: { id: true, name: true, slug: true } },
          },
        });

        return { team, registration };
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/registrations:
 *   get:
 *     tags:
 *       - Registrations
 *     summary: Listar inscrições (admin) ou por torneio via query param
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tournamentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de inscrições
 */
registrationsRouter.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tournamentId, teamId, status } = req.query;

      const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER]
        .includes(req.user!.role as any);

      const where = {
        ...(tournamentId && { tournamentId: tournamentId as string }),
        ...(teamId && { teamId: teamId as string }),
        ...(status && { status: status as RegistrationStatus }),
      };

      const registrations = await prisma.tournamentRegistration.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        include: {
          team: { select: { id: true, name: true, slug: true, logoUrl: true, tag: true } },
          tournament: { select: { id: true, name: true, slug: true, status: true } },
        },
      });

      res.json(registrations);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/registrations:
 *   post:
 *     tags:
 *       - Registrations
 *     summary: Inscrever time em torneio
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamId
 *               - tournamentId
 *             properties:
 *               teamId:
 *                 type: string
 *               tournamentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inscrição realizada
 *       409:
 *         description: Time já inscrito
 */
registrationsRouter.post(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { teamId, tournamentId } = z.object({
        teamId: z.string().uuid(),
        tournamentId: z.string().uuid(),
      }).parse(req.body);

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");
      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        throw AppError.badRequest("As inscrições não estão abertas para este torneio");
      }

      const team = await prisma.team.findFirst({
        where: { id: teamId, deletedAt: null },
      });
      if (!team) throw AppError.notFound("Time não encontrado");

      const isAdmin = (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.ADMINISTRATOR);
      if (team.captainId !== req.user!.sub && !isAdmin) {
        throw AppError.forbidden("Apenas o capitão pode inscrever o time");
      }

      const existing = await prisma.tournamentRegistration.findUnique({
        where: { tournamentId_teamId: { tournamentId, teamId } },
      });
      if (existing) throw AppError.conflict("Time já está inscrito neste torneio");

      const count = await prisma.tournamentRegistration.count({
        where: { tournamentId, status: RegistrationStatus.APPROVED },
      });
      if (count >= tournament.maxTeams) {
        throw AppError.badRequest("Torneio já atingiu o número máximo de times");
      }

      // Admin sempre aprova automaticamente; usuários comuns seguem a regra do torneio.
      // Com paymentRequired, inscrições de usuários ficam PENDING até o pagamento ser confirmado.
      const shouldAutoApprove = isAdmin || (tournament.autoApprove && !tournament.paymentRequired);
      const paymentStatus = tournament.paymentRequired
        ? (isAdmin ? PaymentStatus.NOT_REQUIRED : PaymentStatus.PENDING)
        : PaymentStatus.NOT_REQUIRED;

      const registration = await prisma.tournamentRegistration.create({
        data: {
          tournamentId,
          teamId,
          status: shouldAutoApprove ? RegistrationStatus.APPROVED : RegistrationStatus.PENDING,
          paymentStatus,
        },
        include: {
          team: { select: { id: true, name: true, slug: true, logoUrl: true } },
          tournament: { select: { id: true, name: true, slug: true } },
        },
      });

      res.status(201).json(registration);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/registrations/{id}/approve:
 *   patch:
 *     tags:
 *       - Registrations
 *     summary: Aprovar inscrição (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inscrição aprovada
 */
registrationsRouter.patch(
  "/:id/approve",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  validate(ReviewRegistrationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: getParam(req.params, "id") },
        include: {
          tournament: { select: { paymentRequired: true } },
        },
      });
      if (!reg) throw AppError.notFound("Inscrição não encontrada");
      if (reg.status !== RegistrationStatus.PENDING) {
        throw AppError.badRequest("Apenas inscrições pendentes podem ser aprovadas");
      }

      // Em torneios pagos, a aprovação só pode ocorrer após pagamento confirmado.
      // Bloqueia aprovação manual quando o pagamento ainda está pendente ou falhou.
      if (reg.tournament.paymentRequired && reg.paymentStatus !== PaymentStatus.PAID) {
        // Tenta verificar o status atual do pagamento no Mercado Pago antes de rejeitar.
        if (reg.mpPaymentId) {
          try {
            const mpPayment = await getPaymentByExternalReference(reg.id);
            if (mpPayment?.status === "approved") {
              // Pagamento confirmado no MP mas ainda não refletido no banco — corrige e aprova.
              const updated = await prisma.tournamentRegistration.update({
                where: { id: reg.id },
                data: {
                  paymentStatus: PaymentStatus.PAID,
                  paidAt: new Date(),
                  status: RegistrationStatus.APPROVED,
                  reviewedAt: new Date(),
                  reviewedById: req.user!.sub,
                  notes: req.body.notes,
                },
                include: {
                  team: { select: { id: true, name: true, slug: true } },
                  tournament: { select: { id: true, name: true } },
                },
              });
              console.log(`[Approve] ✅ Pagamento confirmado via polling ao aprovar — inscrição ${reg.id}`);
              return res.json(updated);
            }
          } catch {
            // Falha ao consultar o MP — segue com o bloqueio abaixo.
          }
        }
        throw AppError.badRequest(
          "Este campeonato requer pagamento. A inscrição só pode ser aprovada após a confirmação do pagamento."
        );
      }

      const updated = await prisma.tournamentRegistration.update({
        where: { id: getParam(req.params, "id") },
        data: {
          status: RegistrationStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: req.user!.sub,
          notes: req.body.notes,
        },
        include: {
          team: { select: { id: true, name: true, slug: true } },
          tournament: { select: { id: true, name: true } },
        },
      });

      // Adiciona o time ao ranking automaticamente ao aprovar
      await ensureRankingEntry(reg.teamId, reg.tournamentId);

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/registrations/{id}/reject:
 *   patch:
 *     tags:
 *       - Registrations
 *     summary: Rejeitar inscrição (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inscrição rejeitada
 */
registrationsRouter.patch(
  "/:id/reject",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER),
  validate(ReviewRegistrationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: getParam(req.params, "id") },
      });
      if (!reg) throw AppError.notFound("Inscrição não encontrada");
      if (reg.status !== RegistrationStatus.PENDING) {
        throw AppError.badRequest("Apenas inscrições pendentes podem ser rejeitadas");
      }

      const updated = await prisma.tournamentRegistration.update({
        where: { id: getParam(req.params, "id") },
        data: {
          status: RegistrationStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedById: req.user!.sub,
          notes: req.body.notes,
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/registrations/{id}/withdraw:
 *   patch:
 *     tags:
 *       - Registrations
 *     summary: Retirar inscrição (capitão do time)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inscrição retirada
 */
registrationsRouter.patch(
  "/:id/withdraw",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: getParam(req.params, "id") },
        include: { team: true },
      });
      if (!reg) throw AppError.notFound("Inscrição não encontrada");
      if (reg.status === RegistrationStatus.WITHDRAWN) {
        throw AppError.badRequest("Inscrição já foi retirada");
      }

      const isAdmin = (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.ADMINISTRATOR);
      if (reg.team.captainId !== req.user!.sub && !isAdmin) {
        throw AppError.forbidden("Apenas o capitão pode retirar a inscrição");
      }

      const updated = await prisma.tournamentRegistration.update({
        where: { id: getParam(req.params, "id") },
        data: { status: RegistrationStatus.WITHDRAWN },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /registrations/:id/payment-link ─────────────────────────────────────
// Gera (ou reutiliza) um pagamento PIX no Mercado Pago para uma inscrição.
// Funciona com ou sem login (fluxo público de inscrição sem conta).
registrationsRouter.post(
  "/:id/payment-link",
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: getParam(req.params, "id") },
        include: {
          team: { select: { id: true, name: true, captainId: true } },
          tournament: {
            select: {
              id: true, name: true,
              paymentRequired: true,
              entryFeeAmount: true,
              whatsappGroupUrl: true,
            },
          },
        },
      });

      if (!reg) throw AppError.notFound("Inscrição não encontrada");

      // Se houver usuário logado, valida permissão; sem login, permite (fluxo público).
      if (req.user) {
        const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR].includes(
          req.user!.role as any,
        );
        if (reg.team.captainId !== req.user!.sub && !isAdmin) {
          throw AppError.forbidden("Apenas o capitão do time pode gerar o link de pagamento");
        }
      }

      if (!reg.tournament.paymentRequired) {
        throw AppError.badRequest("Este campeonato não requer pagamento");
      }

      // Se já foi pago, retorna o status PAID (para o frontend detectar via polling).
      if (reg.paymentStatus === PaymentStatus.PAID) {
        return res.json({
          paymentUrl: reg.paymentUrl ?? "",
          qrCode: "",
          qrCodeBase64: "",
          mpPaymentId: reg.mpPaymentId ?? "",
          amountCents: reg.tournament.entryFeeAmount ?? 0,
          registrationId: reg.id,
          status: PaymentStatus.PAID,
          registrationStatus: reg.status,
          whatsappGroupUrl: reg.tournament.whatsappGroupUrl ?? null,
        });
      }

      if (reg.status === RegistrationStatus.REJECTED || reg.status === RegistrationStatus.WITHDRAWN) {
        throw AppError.badRequest("Inscrição inativa — não é possível gerar link de pagamento");
      }

      const amountCents = reg.tournament.entryFeeAmount ?? 0;
      if (amountCents <= 0) {
        throw AppError.badRequest("Valor de inscrição inválido");
      }

      // Se já existe um pagamento pendente, busca o status atual no Mercado Pago.
      // IMPORTANTE: o MP cria dois payments distintos por transação PIX — o QR (pending)
      // e o pagamento real (approved, com ID diferente). Por isso buscamos por
      // external_reference (= reg.id) e não pelo mpPaymentId salvo no banco.
      if (reg.mpPaymentId && reg.paymentStatus === PaymentStatus.PENDING) {
        try {
          const mpPayment = await getPaymentByExternalReference(reg.id);

          // Pagamento confirmado no MP → atualiza o banco e retorna PAID.
          if (mpPayment?.status === "approved") {
            await prisma.tournamentRegistration.update({
              where: { id: reg.id },
              data: {
                paymentStatus: PaymentStatus.PAID,
                paidAt: new Date(),
                status: RegistrationStatus.APPROVED,
                // Salva o ID do payment approved (pode ser diferente do pending)
                mpPaymentId: String(mpPayment.id),
              },
            });
            // Adiciona o time ao ranking automaticamente
            await ensureRankingEntry(reg.team.id, reg.tournament.id);
            console.log(`[Payment Link] ✅ Pagamento confirmado via polling MP — inscrição ${reg.id} aprovada (paymentId: ${mpPayment.id})`);
            return res.json({
              paymentUrl: reg.paymentUrl ?? "",
              qrCode: "",
              qrCodeBase64: "",
              mpPaymentId: String(mpPayment.id),
              amountCents,
              registrationId: reg.id,
              status: PaymentStatus.PAID,
              registrationStatus: RegistrationStatus.APPROVED,
              whatsappGroupUrl: reg.tournament.whatsappGroupUrl ?? null,
            });
          }

          // Pagamento falhou no MP → atualiza para FAILED.
          if (mpPayment?.status === "rejected" || mpPayment?.status === "cancelled" || mpPayment?.status === "expired") {
            await prisma.tournamentRegistration.update({
              where: { id: reg.id },
              data: { paymentStatus: PaymentStatus.FAILED },
            });
            return res.json({
              paymentUrl: reg.paymentUrl ?? "",
              qrCode: "",
              qrCodeBase64: "",
              mpPaymentId: reg.mpPaymentId,
              amountCents,
              registrationId: reg.id,
              status: PaymentStatus.FAILED,
            });
          }

          // Ainda pendente — retorna QR Code atualizado pelo payment original.
          const livePmt = await getPayment(reg.mpPaymentId).catch(() => null);
          if (livePmt) {
            const live = paymentToResult(livePmt);
            return res.json({
              paymentUrl: live.paymentUrl || reg.paymentUrl,
              qrCode: live.qrCode,
              qrCodeBase64: live.qrCodeBase64,
              mpPaymentId: reg.mpPaymentId,
              expiresAt: live.expiresAt,
              amountCents,
              registrationId: reg.id,
              status: reg.paymentStatus,
            });
          }
        } catch {
          // Se a busca ao MP falhar, devolve os dados persistidos (sem a imagem).
          return res.json({
            paymentUrl: reg.paymentUrl,
            qrCode: "",
            qrCodeBase64: "",
            mpPaymentId: reg.mpPaymentId,
            amountCents,
            registrationId: reg.id,
            status: reg.paymentStatus,
          });
        }
      }

      // Cria novo pagamento PIX no Mercado Pago
      const payment = await createPixPayment({
        amountCents,
        description: `Inscrição — ${reg.tournament.name} · ${reg.team.name}`,
        externalReference: reg.id,
        payerEmail: req.user?.email,
        expiresInHours: 0.25, // 15 minutos
      });

      // Persiste os dados do pagamento na inscrição
      const updated = await prisma.tournamentRegistration.update({
        where: { id: reg.id },
        data: {
          mpPaymentId: payment.paymentId,
          paymentUrl: payment.paymentUrl,
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      return res.json({
        paymentUrl: payment.paymentUrl,
        qrCode: payment.qrCode,
        qrCodeBase64: payment.qrCodeBase64,
        mpPaymentId: payment.paymentId,
        expiresAt: payment.expiresAt,
        amountCents,
        registrationId: reg.id,
        status: updated.paymentStatus,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ─── GET /registrations/:id/payment-status ───────────────────────────────────
// Verifica o status do pagamento de uma inscrição, consultando ativamente o
// Mercado Pago quando há um pagamento pendente. Projetado para polling periódico
// pelo frontend — leve e sem necessidade de autenticação (fluxo público).
registrationsRouter.get(
  "/:id/payment-status",
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: getParam(req.params, "id") },
        select: {
          id: true,
          teamId: true,
          tournamentId: true,
          status: true,
          paymentStatus: true,
          mpPaymentId: true,
          paidAt: true,
          tournament: {
            select: {
              paymentRequired: true,
              whatsappGroupUrl: true,
            },
          },
        },
      });

      if (!reg) throw AppError.notFound("Inscrição não encontrada");

      // Torneio gratuito — sem pagamento a verificar.
      if (!reg.tournament.paymentRequired) {
        return res.json({
          registrationId: reg.id,
          registrationStatus: reg.status,
          paymentStatus: PaymentStatus.NOT_REQUIRED,
          paidAt: null,
          whatsappGroupUrl: null,
        });
      }

      // Já confirmado no banco — retorna diretamente sem chamar o MP.
      if (reg.paymentStatus === PaymentStatus.PAID) {
        return res.json({
          registrationId: reg.id,
          registrationStatus: reg.status,
          paymentStatus: PaymentStatus.PAID,
          paidAt: reg.paidAt,
          whatsappGroupUrl: reg.tournament.whatsappGroupUrl ?? null,
        });
      }

      // Sem pagamento iniciado ainda.
      if (!reg.mpPaymentId) {
        return res.json({
          registrationId: reg.id,
          registrationStatus: reg.status,
          paymentStatus: reg.paymentStatus,
          paidAt: null,
          whatsappGroupUrl: null,
        });
      }

      // Consulta ativa no Mercado Pago para verificar o status real do pagamento.
      // Busca por external_reference (reg.id) para encontrar o payment approved,
      // que tem ID diferente do payment pending salvo no banco.
      try {
        const mpPayment = await getPaymentByExternalReference(reg.id);

        if (mpPayment?.status === "approved") {
          // Pagamento confirmado — atualiza o banco e aprova a inscrição automaticamente.
          await prisma.tournamentRegistration.update({
            where: { id: reg.id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              paidAt: new Date(),
              status: RegistrationStatus.APPROVED,
              mpPaymentId: String(mpPayment.id),
            },
          });
          // Adiciona o time ao ranking automaticamente
          await ensureRankingEntry(reg.teamId, reg.tournamentId);
          console.log(`[Payment Status] ✅ Pagamento confirmado via polling — inscrição ${reg.id} aprovada`);
          return res.json({
            registrationId: reg.id,
            registrationStatus: RegistrationStatus.APPROVED,
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date().toISOString(),
            whatsappGroupUrl: reg.tournament.whatsappGroupUrl ?? null,
          });
        }

        if (
          mpPayment?.status === "rejected" ||
          mpPayment?.status === "cancelled" ||
          mpPayment?.status === "expired"
        ) {
          await prisma.tournamentRegistration.update({
            where: { id: reg.id },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
          return res.json({
            registrationId: reg.id,
            registrationStatus: reg.status,
            paymentStatus: PaymentStatus.FAILED,
            paidAt: null,
            whatsappGroupUrl: null,
          });
        }

        // Ainda pending/in_process — retorna o status atual sem mudar nada.
        return res.json({
          registrationId: reg.id,
          registrationStatus: reg.status,
          paymentStatus: reg.paymentStatus,
          paidAt: null,
          whatsappGroupUrl: null,
        });
      } catch {
        // Falha ao consultar o MP — retorna o que está no banco sem erro.
        return res.json({
          registrationId: reg.id,
          registrationStatus: reg.status,
          paymentStatus: reg.paymentStatus,
          paidAt: reg.paidAt,
          whatsappGroupUrl: null,
        });
      }
    } catch (error) {
      next(error);
    }
  },
);
