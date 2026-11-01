/**
 * Script para atualizar as posições finais dos times classificados
 * 
 * Executa a mesma lógica que deveria acontecer automaticamente após
 * cada resultado, mas para todos os times de uma vez.
 */

import { prisma } from "../src/database/prisma";

async function main() {
  console.log("🔄 Atualizando posições dos classificados...\n");

  // Buscar todos os times com 3+ vitórias (classificados)
  const classified = await prisma.swissCampaign.findMany({
    where: { wins: { gte: 3 } },
    include: { team: { select: { name: true, tag: true } } },
    orderBy: [
      { wins: "desc" },
      { roundDiff: "desc" },
      { losses: "asc" },
    ],
  });

  if (classified.length === 0) {
    console.log("❌ Nenhum time classificado encontrado (wins >= 3)");
    return;
  }

  console.log(`✅ Encontrados ${classified.length} times classificados\n`);

  // Atualizar finalPosition para cada um
  const updates = [];
  for (let i = 0; i < classified.length; i++) {
    const campaign = classified[i]!;
    const position = i + 1;

    updates.push(
      prisma.swissCampaign.update({
        where: { id: campaign.id },
        data: {
          finalPosition: position,
          isEliminated: false,
        },
      })
    );

    console.log(
      `${position}º: ${campaign.team.tag || campaign.team.name} (${campaign.wins}-${campaign.losses}) | Saldo: ${campaign.roundDiff}`
    );
  }

  // Executar todas as atualizações
  await prisma.$transaction(updates);

  console.log("\n✅ Posições atualizadas com sucesso!");
  console.log(`📊 ${classified.length} times agora têm finalPosition definida`);
  console.log("\n💡 Acesse a aba Playoffs no torneio para ver os classificados no bracket!");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
