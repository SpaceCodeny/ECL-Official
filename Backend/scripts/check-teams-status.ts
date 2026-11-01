import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.team.count();
  const active = await prisma.team.count({ where: { isActive: true } });
  const inactive = await prisma.team.count({ where: { isActive: false } });
  const deleted = await prisma.team.count({ where: { deletedAt: { not: null } } });

  console.log(`Total de times: ${total}`);
  console.log(`  isActive=true : ${active}`);
  console.log(`  isActive=false: ${inactive}`);
  console.log(`  deletedAt!=null: ${deleted}`);

  if (inactive > 0) {
    const list = await prisma.team.findMany({ where: { isActive: false }, select: { name: true, slug: true } });
    console.log("\nTimes inativos:", list.map(t => t.name));
  }
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
