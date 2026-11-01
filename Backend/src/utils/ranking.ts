/**
 * ranking.ts
 * Utilitário para garantir que um time tenha entrada no ranking
 * quando sua inscrição for aprovada em um campeonato.
 *
 * Chamado automaticamente pelo webhook do Mercado Pago, pelo polling
 * de payment-link e pela rota de aprovação manual (/approve).
 */

import { prisma } from "../database/prisma";

/**
 * Garante que o time possui uma entrada no RankingSnapshot para a season
 * derivada do torneio (ex: "2025"). Se já existir, não faz nada.
 *
 * A posição inicial é calculada como (total de entradas existentes + 1),
 * garantindo que o time entre ao final da lista sem deslocar ninguém.
 */
export async function ensureRankingEntry(teamId: string, tournamentId: string): Promise<void> {
  try {
    // Busca o torneio para determinar a season (usa o ano de startDate ou ano atual).
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { startDate: true, season: true },
    });

    const year = tournament?.startDate
      ? tournament.startDate.getFullYear().toString()
      : new Date().getFullYear().toString();

    // Usa o campo season do torneio se disponível (ex: "Season 1"), senão usa o ano.
    const season = tournament?.season ?? year;

    // Verifica se já existe entrada para este time nesta season.
    const existing = await prisma.rankingSnapshot.findFirst({
      where: { teamId, season },
    });

    if (existing) {
      // Já existe — não altera posição nem pontuação.
      return;
    }

    // Calcula a próxima posição disponível.
    const count = await prisma.rankingSnapshot.count({ where: { season } });

    await prisma.rankingSnapshot.create({
      data: {
        teamId,
        season,
        position: count + 1,
        previousPosition: null,
        points: 0,
        wins: 0,
        losses: 0,
        titles: 0,
        snapshotAt: new Date(),
      },
    });

    console.log(`[Ranking] ✅ Time ${teamId} adicionado ao ranking da season "${season}" na posição ${count + 1}`);
  } catch (err) {
    // Nunca bloqueia o fluxo principal — apenas loga o erro.
    console.error(`[Ranking] ❌ Falha ao adicionar time ${teamId} ao ranking:`, err);
  }
}
