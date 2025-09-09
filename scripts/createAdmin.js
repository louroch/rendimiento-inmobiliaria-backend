const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Creando/verificando usuario administrador...');
    
    const hashedPassword = await bcrypt.hash('rayuela2025violeta**', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'rayuelaagenciadigital@gmail.com' },
      update: {},
      create: {
        email: 'rayuelaagenciadigital@gmail.com',
        password: hashedPassword,
        name: 'Administrador Rayuela',
        role: 'ADMIN',
      },
    });

    console.log('✅ Admin creado/verificado exitosamente:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Nombre: ${admin.name}`);
    console.log(`   Rol: ${admin.role}`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Contraseña: rayuela2025violeta**`);

  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('🎉 Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((e) => {
    console.error('💥 Error ejecutando script:', e);
    process.exit(1);
  });
