const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Hash de ECL@2026
  const hash = '$2a$10$kVoFrVjAAt1lgk9/0bKd9.CtQcELjmn2WRrd4.Hzcz8grkmxJWVgS';
  
  try {
    const admin = await prisma.admin.create({
      data: {
        username: 'ECL-master',
        passwordHash: hash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
    
    console.log('✅ Super Admin criado com sucesso!');
    console.log('   Username:', admin.username);
    console.log('   Role:', admin.role);
    console.log('   ID:', admin.id);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️  Super Admin já existe no banco');
    } else {
      console.error('❌ Erro ao criar Super Admin:', error);
      throw error;
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
