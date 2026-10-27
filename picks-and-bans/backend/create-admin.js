const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  require('dotenv').config();
}

const prisma = new PrismaClient();

const username = process.argv[2];
const password = process.argv[3];
const role    = (process.argv[4] || 'ADMIN').toUpperCase();

async function main() {
  if (!username || !password) {
    console.error('Uso: node create-admin.js <username> <password> [ADMIN|SUPER_ADMIN]');
    process.exit(1);
  }

  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) {
    console.log(`⚠️  Usuário "${username}" já existe (status: ${existing.status})`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.create({
    data: { username, passwordHash, role, status: 'ACTIVE' },
  });

  console.log('✅ Admin criado com sucesso!');
  console.log('   ID      :', admin.id);
  console.log('   Usuário :', admin.username);
  console.log('   Role    :', admin.role);
  console.log('   Status  :', admin.status);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Erro:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
