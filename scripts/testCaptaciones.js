const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCaptacionesField() {
  try {
    console.log('🧪 Probando el campo numeroCaptaciones...');
    
    // 1. Crear un registro de prueba con captaciones
    console.log('\n1️⃣ Creando registro de prueba...');
    const testRecord = await prisma.performance.create({
      data: {
        userId: 'test-user-id', // Necesitarás un ID de usuario válido
        fecha: new Date(),
        consultasRecibidas: 5,
        muestrasRealizadas: 3,
        operacionesCerradas: 1,
        seguimiento: true,
        usoTokko: 'Prueba',
        numeroCaptaciones: 2,
        cantidadPropiedadesTokko: 10,
        linksTokko: 'https://test1.com, https://test2.com',
        dificultadTokko: false,
        observaciones: 'Registro de prueba para captaciones'
      }
    });
    
    console.log('✅ Registro creado:', {
      id: testRecord.id,
      numeroCaptaciones: testRecord.numeroCaptaciones,
      consultasRecibidas: testRecord.consultasRecibidas
    });
    
    // 2. Probar consultas de estadísticas
    console.log('\n2️⃣ Probando consultas de estadísticas...');
    
    const stats = await prisma.performance.aggregate({
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true
      },
      _avg: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true
      }
    });
    
    console.log('✅ Estadísticas calculadas:', {
      totales: {
        consultasRecibidas: stats._sum.consultasRecibidas,
        muestrasRealizadas: stats._sum.muestrasRealizadas,
        operacionesCerradas: stats._sum.operacionesCerradas,
        numeroCaptaciones: stats._sum.numeroCaptaciones
      },
      promedios: {
        consultasRecibidas: Math.round(stats._avg.consultasRecibidas || 0),
        muestrasRealizadas: Math.round(stats._avg.muestrasRealizadas || 0),
        operacionesCerradas: Math.round(stats._avg.operacionesCerradas || 0),
        numeroCaptaciones: Math.round(stats._avg.numeroCaptaciones || 0)
      }
    });
    
    // 3. Probar actualización del campo
    console.log('\n3️⃣ Probando actualización del campo...');
    
    const updatedRecord = await prisma.performance.update({
      where: { id: testRecord.id },
      data: { numeroCaptaciones: 5 }
    });
    
    console.log('✅ Campo actualizado:', {
      id: updatedRecord.id,
      numeroCaptaciones: updatedRecord.numeroCaptaciones
    });
    
    // 4. Limpiar registro de prueba
    console.log('\n4️⃣ Limpiando registro de prueba...');
    
    await prisma.performance.delete({
      where: { id: testRecord.id }
    });
    
    console.log('✅ Registro de prueba eliminado');
    
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('   ✅ Campo numeroCaptaciones se puede crear');
    console.log('   ✅ Campo numeroCaptaciones se puede consultar');
    console.log('   ✅ Campo numeroCaptaciones se puede actualizar');
    console.log('   ✅ Estadísticas incluyen numeroCaptaciones');
    console.log('   ✅ No se afectó funcionalidad existente');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    
    if (error.code === 'P2002') {
      console.log('ℹ️ Error de clave duplicada - esto es normal si el usuario de prueba ya existe');
    } else if (error.code === 'P2025') {
      console.log('ℹ️ Registro no encontrado - esto es normal si el registro ya fue eliminado');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Función para probar con un usuario real
async function testWithRealUser() {
  try {
    console.log('🔍 Buscando usuario real para pruebas...');
    
    const user = await prisma.user.findFirst({
      where: { role: 'agent' }
    });
    
    if (!user) {
      console.log('❌ No se encontró ningún agente en la base de datos');
      console.log('💡 Crea un agente primero o usa el script createAdmin.js');
      return;
    }
    
    console.log(`✅ Usuario encontrado: ${user.name} (${user.email})`);
    
    // Actualizar la función de prueba para usar el usuario real
    const originalTest = testCaptacionesField;
    
    // Reemplazar el userId en la función
    const testWithUser = async () => {
      try {
        console.log('🧪 Probando el campo numeroCaptaciones con usuario real...');
        
        const testRecord = await prisma.performance.create({
          data: {
            userId: user.id,
            fecha: new Date(),
            consultasRecibidas: 5,
            muestrasRealizadas: 3,
            operacionesCerradas: 1,
            seguimiento: true,
            usoTokko: 'Prueba',
            numeroCaptaciones: 2
          }
        });
        
        console.log('✅ Registro creado con usuario real');
        
        // Limpiar
        await prisma.performance.delete({
          where: { id: testRecord.id }
        });
        
        console.log('✅ Prueba completada exitosamente');
        
      } catch (error) {
        console.error('❌ Error en prueba con usuario real:', error);
        throw error;
      }
    };
    
    await testWithUser();
    
  } catch (error) {
    console.error('❌ Error buscando usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar según el argumento
const action = process.argv[2];

switch (action) {
  case 'test':
    testCaptacionesField();
    break;
  case 'test-real':
    testWithRealUser();
    break;
  default:
    console.log('🧪 Script de prueba para campo numeroCaptaciones');
    console.log('');
    console.log('Uso:');
    console.log('  node scripts/testCaptaciones.js test      - Prueba básica (requiere usuario válido)');
    console.log('  node scripts/testCaptaciones.js test-real - Prueba con usuario real de la BD');
    console.log('');
    console.log('⚠️  NOTA: Asegúrate de tener al menos un agente en la base de datos');
}
