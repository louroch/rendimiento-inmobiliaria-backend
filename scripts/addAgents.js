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

async function addAgents() {
  try {
    console.log('🚀 Agregando agentes al sistema...');
    console.log(`📊 Total de agentes a crear: ${agentsToCreate.length}`);
    
    const results = {
      created: [],
      errors: []
    };

    // Contraseña para todos los agentes
    const agentPassword = 'TempPassword123!';
    const hashedPassword = await bcrypt.hash(agentPassword, 12);

    for (let i = 0; i < agentsToCreate.length; i++) {
      const agent = agentsToCreate[i];
      
      try {
        console.log(`\n${i + 1}/${agentsToCreate.length} - Creando: ${agent.name}`);
        
        // Crear agente
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
        
      } catch (error) {
        console.error(`   ❌ Error con ${agent.name}:`, error.message);
        results.errors.push({
          agent: agent,
          error: error.message
        });
      }
    }

    // Mostrar resumen
    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Creados: ${results.created.length}`);
    console.log(`   ❌ Errores: ${results.errors.length}`);

    if (results.created.length > 0) {
      console.log('\n🆕 AGENTES CREADOS:');
      results.created.forEach(agent => {
        console.log(`   • ${agent.name} - ${agent.email}`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      results.errors.forEach(error => {
        console.log(`   • ${error.agent.name}: ${error.error}`);
      });
    }

    console.log('\n🔐 CREDENCIALES DE ACCESO:');
    console.log(`   Contraseña para todos los agentes: ${agentPassword}`);
    console.log('   ⚠️  Los agentes deben cambiar su contraseña en el primer login');

    // Verificar usuarios finales
    console.log('\n🔍 VERIFICACIÓN FINAL:');
    const allUsers = await prisma.user.findMany({
      select: { name: true, email: true, role: true },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`   Total de usuarios: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`   • ${user.name} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para probar login de un agente
async function testAgentLogin() {
  try {
    console.log('🧪 Probando login de agente...');
    
    const agent = await prisma.user.findFirst({
      where: { role: 'agent' }
    });

    if (!agent) {
      console.log('❌ No hay agentes en la base de datos');
      return;
    }

    console.log(`✅ Agente encontrado: ${agent.name} (${agent.email})`);
    console.log('🔐 Puedes probar el login con:');
    console.log(`   Email: ${agent.email}`);
    console.log(`   Password: TempPassword123!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar según el argumento
const action = process.argv[2];

switch (action) {
  case 'add':
    addAgents();
    break;
  case 'test':
    testAgentLogin();
    break;
  default:
    console.log('👥 Script para agregar agentes');
    console.log('');
    console.log('Uso:');
    console.log('  node scripts/addAgents.js add  - Crear los 12 agentes');
    console.log('  node scripts/addAgents.js test - Probar login de agente');
    console.log('');
    console.log('⚠️  IMPORTANTE: Asegúrate de que el servidor esté corriendo');
}
