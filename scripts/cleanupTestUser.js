const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupTestUser() {
  try {
    console.log('🧹 Limpiando usuario de prueba...');
    
    // Eliminar usuario de prueba
    const result = await prisma.user.deleteMany({
      where: {
        email: 'prueba@test.com'
      }
    });

    console.log(`✅ ${result.count} usuario(s) de prueba eliminado(s)`);

    // Verificar usuarios restantes
    const remainingUsers = await prisma.user.findMany({
      select: {
        name: true,
        email: true,
        role: true
      }
    });

    console.log('\n👥 Usuarios restantes:');
    remainingUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestUser();
