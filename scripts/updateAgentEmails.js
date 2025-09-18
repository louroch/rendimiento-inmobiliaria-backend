const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAgentEmails() {
  try {
    console.log('🔧 Iniciando actualización de emails de agentes...');
    
    // Obtener todos los agentes (no administradores)
    const agents = await prisma.user.findMany({
      where: {
        role: 'agent'
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    console.log(`📊 Encontrados ${agents.length} agentes para actualizar`);

    if (agents.length === 0) {
      console.log('ℹ️ No hay agentes para actualizar');
      return;
    }

    // Mostrar agentes actuales
    console.log('\n📋 Agentes actuales:');
    agents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.name} - ${agent.email}`);
    });

    // Actualizar cada agente
    const updatePromises = agents.map(async (agent, index) => {
      const newEmail = `agente${index + 1}@inmobiliaria.com`;
      
      try {
        const updatedAgent = await prisma.user.update({
          where: { id: agent.id },
          data: { email: newEmail },
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        });

        console.log(`✅ ${agent.name}: ${agent.email} → ${newEmail}`);
        return updatedAgent;
      } catch (error) {
        console.error(`❌ Error actualizando ${agent.name}:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(updatePromises);
    const successful = results.filter(r => r !== null);
    const failed = results.filter(r => r === null);

    console.log(`\n📊 Resumen de actualización:`);
    console.log(`   ✅ Exitosos: ${successful.length}`);
    console.log(`   ❌ Fallidos: ${failed.length}`);

    if (successful.length > 0) {
      console.log('\n📋 Agentes actualizados:');
      successful.forEach(agent => {
        console.log(`   • ${agent.name} - ${agent.email}`);
      });
    }

  } catch (error) {
    console.error('❌ Error en la actualización:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para crear agentes de prueba (opcional)
async function createTestAgents() {
  try {
    console.log('🔧 Creando agentes de prueba...');
    
    const testAgents = [
      { name: 'Juan Pérez', email: 'juan@empresa.com' },
      { name: 'María García', email: 'maria@empresa.com' },
      { name: 'Carlos López', email: 'carlos@empresa.com' }
    ];

    for (const agent of testAgents) {
      try {
        await prisma.user.create({
          data: {
            ...agent,
            password: 'password123', // Contraseña temporal
            role: 'agent'
          }
        });
        console.log(`✅ Agente creado: ${agent.name} - ${agent.email}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`ℹ️ Agente ya existe: ${agent.name} - ${agent.email}`);
        } else {
          console.error(`❌ Error creando ${agent.name}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error creando agentes de prueba:', error);
  }
}

// Función para revertir cambios (en caso de necesitarlo)
async function revertEmailChanges() {
  try {
    console.log('🔄 Revirtiendo cambios de emails...');
    
    const agents = await prisma.user.findMany({
      where: {
        role: 'agent',
        email: {
          contains: '@inmobiliaria.com'
        }
      }
    });

    console.log(`📊 Encontrados ${agents.length} agentes con emails de inmobiliaria.com`);

    for (const agent of agents) {
      // Generar email temporal basado en el nombre
      const tempEmail = `${agent.name.toLowerCase().replace(/\s+/g, '.')}@empresa.com`;
      
      try {
        await prisma.user.update({
          where: { id: agent.id },
          data: { email: tempEmail }
        });
        console.log(`✅ ${agent.name}: ${agent.email} → ${tempEmail}`);
      } catch (error) {
        console.error(`❌ Error revirtiendo ${agent.name}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error revirtiendo cambios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar según el argumento pasado
const action = process.argv[2];

switch (action) {
  case 'update':
    updateAgentEmails();
    break;
  case 'create-test':
    createTestAgents();
    break;
  case 'revert':
    revertEmailChanges();
    break;
  default:
    console.log('🔧 Script de actualización de emails de agentes');
    console.log('');
    console.log('Uso:');
    console.log('  node scripts/updateAgentEmails.js update     - Actualizar emails existentes');
    console.log('  node scripts/updateAgentEmails.js create-test - Crear agentes de prueba');
    console.log('  node scripts/updateAgentEmails.js revert     - Revertir cambios');
    console.log('');
    console.log('⚠️  IMPORTANTE: Haz backup de la base de datos antes de ejecutar');
}
