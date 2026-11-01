import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🔍 Verificando times BLOCKS e SilentFury 3...\n");
  
  const blocks = await prisma.team.findUnique({
    where: { slug: "blocks" },
    select: { id: true, name: true, tag: true, logoUrl: true }
  });
  
  const silentfury = await prisma.team.findUnique({
    where: { slug: "silentfury-3" },
    select: { id: true, name: true, tag: true, logoUrl: true }
  });
  
  console.log("BLOCKS:");
  console.log(blocks ? `  ✓ Existe: ${blocks.name} (${blocks.tag})` : "  ✗ Não encontrado");
  if (blocks?.logoUrl) console.log(`  Logo: ${blocks.logoUrl}`);
  
  console.log("\nSilentFury 3:");
  console.log(silentfury ? `  ✓ Existe: ${silentfury.name} (${silentfury.tag})` : "  ✗ Não encontrado");
  if (silentfury?.logoUrl) console.log(`  Logo: ${silentfury.logoUrl}`);
  
  console.log("");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
