import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...\n');

  // Criar Super Admin
  const passwordHash = await hashPassword('admin123');

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@ecl.com',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Super Admin criado');
  console.log('   Username: admin');
  console.log('   Password: admin123\n');

  // Criar campeonato de exemplo
  const tournament = await prisma.tournament.upsert({
    where: { slug: 'ecl-season-1-2024' },
    update: {},
    create: {
      name: 'ECL Season 1 2024',
      slug: 'ecl-season-1-2024',
      game: 'Standoff 2',
      edition: '2024 Season 1',
      description: 'Primeira temporada da Elite Champions League 2024',
      status: 'DRAFT',
      createdById: admin.id,
    },
  });

  console.log('✅ Campeonato criado:', tournament.name);

  // Criar times de exemplo
  const teamsData = [
    { name: 'BLOCKS', slug: 'blocks', shortName: 'BLK', logoUrl: 'https://placehold.co/200x200/1e40af/ffffff?text=BLOCKS' },
    { name: 'ECL Academy', slug: 'ecl-academy', shortName: 'ECLA', logoUrl: 'https://placehold.co/200x200/dc2626/ffffff?text=ECLA' },
    { name: 'Phantom Squad', slug: 'phantom-squad', shortName: 'PHS', logoUrl: 'https://placehold.co/200x200/16a34a/ffffff?text=PHS' },
    { name: 'Crimson Wolves', slug: 'crimson-wolves', shortName: 'CW', logoUrl: 'https://placehold.co/200x200/9333ea/ffffff?text=CW' },
    { name: 'Thunder Strike', slug: 'thunder-strike', shortName: 'TS', logoUrl: 'https://placehold.co/200x200/ea580c/ffffff?text=TS' },
    { name: 'Void Gaming', slug: 'void-gaming', shortName: 'VOID', logoUrl: 'https://placehold.co/200x200/0891b2/ffffff?text=VOID' },
    { name: 'Phoenix Rising', slug: 'phoenix-rising', shortName: 'PHX', logoUrl: 'https://placehold.co/200x200/ca8a04/ffffff?text=PHX' },
    { name: 'Steel Legion', slug: 'steel-legion', shortName: 'STL', logoUrl: 'https://placehold.co/200x200/64748b/ffffff?text=STL' },
  ];

  console.log('\n✅ Times criados:');
  
  for (const teamData of teamsData) {
    const team = await prisma.team.upsert({
      where: { slug: teamData.slug },
      update: {},
      create: teamData,
    });

    // Adicionar ao torneio
    await prisma.tournamentTeam.upsert({
      where: {
        tournamentId_teamId: {
          tournamentId: tournament.id,
          teamId: team.id,
        },
      },
      update: {},
      create: {
        tournamentId: tournament.id,
        teamId: team.id,
        pot: Math.floor(Math.random() * 2) + 1, // Pote 1 ou 2 aleatório
        status: 'ACTIVE',
      },
    });

    console.log(`   - ${team.name}`);
  }

  console.log('\n🎉 Seed concluído com sucesso!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
