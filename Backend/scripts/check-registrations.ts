import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🔍 Verificando inscrições no torneio Swiss...\n");
  
  const tournament = await prisma.tournament.findUnique({
    where: { slug: "ecl-swiss-test-2024" },
    include: {
      registrations: {
        include: {
          team: true
        },
        where: {
          status: "APPROVED"
        }
      }
    }
  });
  
  if (!tournament) {
    console.log("❌ Torneio não encontrado");
    return;
  }
  
  console.log(`Torneio: ${tournament.name}`);
  console.log(`Total de inscrições: ${tournament.registrations.length}\n`);
  
  console.log("Times inscritos:");
  tournament.registrations.forEach((reg, index) => {
    console.log(`${index + 1}. ${reg.team.name} (${reg.team.tag}) - Logo: ${reg.team.logoUrl}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
