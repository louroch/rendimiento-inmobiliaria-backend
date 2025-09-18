const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Lista de agentes a crear
const agentsToCreate = [
  { name: 'Alex Solorzano', email: 'agente1@inmobiliaria.com' },
  { name: 'Emiliano Sosa', email: 'agente2@inmobiliaria.com' },
  { name: 'Enrique Perez', email: 'agente3@inmobiliaria.com' },
  { name: 'Graciela Reynoso', email: 'agente4@inmobiliaria.com' },
  { name: 'Ignacio Rosconi', email: 'agente5@inmobiliaria.com' },
  { name: 'Jose Sosa', email: 'agente6@inmobiliaria.com' },
  { name: 'Leila Velasco', email: 'agente7@inmobiliaria.com' },
  { name: 'Lourdes Chaumont', email: 'agente8@inmobiliaria.com' },
  { name: 'Rocio Cristal', email: 'agente9@inmobiliaria.com' },
  { name: 'Sofia Aparicio', email: 'agente10@inmobiliaria.com' },
  { name: 'Tomas Carrizo', email: 'agente11@inmobiliaria.com' },
  { name: 'Andrea Soria', email: 'agente12@inmobiliaria.com' }
];

async function createAgents() {
  try {
    console.log('🚀 Iniciando creación de agentes...');
    console.log(`📊 Total de agentes a crear: ${agentsToCreate.length}`);
    
    const results = {
      created: [],
      updated: [],
      errors: []
    };

    // Contraseña temporal para todos los agentes
    const tempPassword = 'TempPassword123!';
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    for (let i = 0; i < agentsToCreate.length; i++) {
      const agent = agentsToCreate[i];
      
      try {
        console.log(`\n${i + 1}/${agentsToCreate.length} - Procesando: ${agent.name}`);
        
        // Verificar si el agente ya existe
        const existingAgent = await prisma.user.findUnique({
          where: { email: agent.email }
        });

        if (existingAgent) {
          // Actualizar agente existente
          const updatedAgent = await prisma.user.update({
            where: { email: agent.email },
            data: {
              name: agent.name,
              role: 'agent',
              password: hashedPassword // Actualizar contraseña
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true
            }
          });
          
          results.updated.push(updatedAgent);
          console.log(`   ✅ Actualizado: ${agent.name} - ${agent.email}`);
        } else {
          // Crear nuevo agente
          const newAgent = await prisma.user.create({
            data: {
              name: agent.name,
              email: agent.email,
              password: hashedPassword,
              role: 'agent'
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true
            }
          });
          
          results.created.push(newAgent);
          console.log(`   ✅ Creado: ${agent.name} - ${agent.email}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error con ${agent.name}:`, error.message);
        results.errors.push({
          agent: agent,
          error: error.message
        });
      }
    }

    // Mostrar resumen
    console.log('\n📊 RESUMEN DE OPERACIÓN:');
    console.log(`   ✅ Creados: ${results.created.length}`);
    console.log(`   🔄 Actualizados: ${results.updated.length}`);
    console.log(`   ❌ Errores: ${results.errors.length}`);

    if (results.created.length > 0) {
      console.log('\n🆕 AGENTES CREADOS:');
      results.created.forEach(agent => {
        console.log(`   • ${agent.name} - ${agent.email} (ID: ${agent.id})`);
      });
    }

    if (results.updated.length > 0) {
      console.log('\n🔄 AGENTES ACTUALIZADOS:');
      results.updated.forEach(agent => {
        console.log(`   • ${agent.name} - ${agent.email} (ID: ${agent.id})`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      results.errors.forEach(error => {
        console.log(`   • ${error.agent.name}: ${error.error}`);
      });
    }

    console.log('\n🔐 INFORMACIÓN DE ACCESO:');
    console.log(`   Contraseña temporal para todos: ${tempPassword}`);
    console.log('   ⚠️  IMPORTANTE: Los agentes deben cambiar su contraseña en el primer login');

    // Verificar que todos los agentes estén en la base de datos
    console.log('\n🔍 VERIFICACIÓN FINAL:');
    const allAgents = await prisma.user.findMany({
      where: { role: 'agent' },
      select: { name: true, email: true, role: true },
      orderBy: { email: 'asc' }
    });

    console.log(`   Total de agentes en BD: ${allAgents.length}`);
    allAgents.forEach(agent => {
      console.log(`   • ${agent.name} - ${agent.email}`);
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para eliminar agentes existentes (solo si es necesario)
async function deleteExistingAgents() {
  try {
    console.log('🗑️ Eliminando agentes existentes...');
    
    // Obtener todos los agentes
    const agents = await prisma.user.findMany({
      where: { role: 'agent' },
      select: { id: true, name: true, email: true }
    });

    console.log(`📊 Encontrados ${agents.length} agentes para eliminar`);

    if (agents.length === 0) {
      console.log('ℹ️ No hay agentes para eliminar');
      return;
    }

    // Mostrar agentes que se van a eliminar
    console.log('\n📋 Agentes a eliminar:');
    agents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.name} - ${agent.email}`);
    });

    // Eliminar agentes (esto también eliminará sus registros de performance por CASCADE)
    const deleteResult = await prisma.user.deleteMany({
      where: { role: 'agent' }
    });

    console.log(`✅ ${deleteResult.count} agentes eliminados exitosamente`);
    console.log('⚠️  NOTA: También se eliminaron todos los registros de performance asociados');

  } catch (error) {
    console.error('❌ Error eliminando agentes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para mostrar agentes existentes
async function listAgents() {
  try {
    console.log('📋 Listando agentes existentes...');
    
    const agents = await prisma.user.findMany({
      where: { role: 'agent' },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        createdAt: true 
      },
      orderBy: { email: 'asc' }
    });

    if (agents.length === 0) {
      console.log('ℹ️ No hay agentes en la base de datos');
      return;
    }

    console.log(`\n📊 Total de agentes: ${agents.length}`);
    console.log('\n📋 Lista de agentes:');
    agents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.name} - ${agent.email} (Creado: ${agent.createdAt.toISOString().split('T')[0]})`);
    });

  } catch (error) {
    console.error('❌ Error listando agentes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar según el argumento
const action = process.argv[2];

switch (action) {
  case 'create':
    createAgents();
    break;
  case 'delete':
    deleteExistingAgents();
    break;
  case 'list':
    listAgents();
    break;
  case 'reset':
    console.log('🔄 Reseteando agentes (eliminar y crear)...');
    deleteExistingAgents()
      .then(() => {
        console.log('\n⏳ Esperando 2 segundos...');
        return new Promise(resolve => setTimeout(resolve, 2000));
      })
      .then(() => createAgents());
    break;
  default:
    console.log('👥 Script de gestión de agentes');
    console.log('');
    console.log('Uso:');
    console.log('  node scripts/createAgents.js create  - Crear/actualizar agentes');
    console.log('  node scripts/createAgents.js list    - Listar agentes existentes');
    console.log('  node scripts/createAgents.js delete  - Eliminar todos los agentes');
    console.log('  node scripts/createAgents.js reset   - Eliminar y crear agentes');
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - El comando "delete" eliminará TODOS los agentes y sus registros de performance');
    console.log('   - El comando "reset" es equivalente a delete + create');
    console.log('   - Todos los agentes tendrán la contraseña temporal: TempPassword123!');
}
