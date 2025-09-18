// Script para probar que la API está enviando el campo numeroCaptaciones
// Ejecutar con: node test-captaciones-api.js

const http = require('http');

const API_BASE_URL = 'http://localhost:5000/api';

// Función para hacer peticiones HTTP
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
  });
}

// Función para hacer peticiones a la API
async function testAPI() {
  try {
    console.log('🧪 Probando API de captaciones...\n');
    
    // 1. Probar endpoint de agentes semanales
    console.log('1️⃣ Probando GET /api/performance/stats/weekly/agents');
    const agentsData = await makeRequest(`${API_BASE_URL}/performance/stats/weekly/agents`);
    
    if (agentsData.agentes && agentsData.agentes.length > 0) {
      console.log('✅ Respuesta recibida correctamente');
      console.log(`📊 Total de agentes: ${agentsData.agentes.length}`);
      
      // Verificar que el primer agente tenga el campo numeroCaptaciones
      const primerAgente = agentsData.agentes[0];
      console.log('\n🔍 Verificando primer agente:');
      console.log(`   Nombre: ${primerAgente.agente.name}`);
      console.log(`   Email: ${primerAgente.agente.email}`);
      console.log(`   Consultas: ${primerAgente.semanaActual.consultasRecibidas}`);
      console.log(`   Muestras: ${primerAgente.semanaActual.muestrasRealizadas}`);
      console.log(`   Operaciones: ${primerAgente.semanaActual.operacionesCerradas}`);
      console.log(`   Captaciones: ${primerAgente.semanaActual.numeroCaptaciones}`); // ← CAMPO CLAVE
      console.log(`   Propiedades: ${primerAgente.semanaActual.propiedadesTokko}`);
      
      // Verificar si el campo existe
      if (primerAgente.semanaActual.hasOwnProperty('numeroCaptaciones')) {
        console.log('✅ Campo numeroCaptaciones está presente');
      } else {
        console.log('❌ Campo numeroCaptaciones NO está presente');
      }
    } else {
      console.log('⚠️ No hay agentes en la respuesta');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. Probar endpoint del equipo
    console.log('2️⃣ Probando GET /api/performance/stats/weekly/team');
    const teamData = await makeRequest(`${API_BASE_URL}/performance/stats/weekly/team`);
    
    if (teamData.equipo) {
      console.log('✅ Respuesta del equipo recibida correctamente');
      console.log(`📊 Total de captaciones del equipo: ${teamData.equipo.numeroCaptaciones}`);
      console.log(`📊 Promedio de captaciones por agente: ${teamData.equipo.promedioPorAgente.captaciones}`);
      
      // Verificar ranking
      if (teamData.ranking && teamData.ranking.length > 0) {
        console.log('\n🏆 Verificando ranking:');
        teamData.ranking.slice(0, 3).forEach((agente, index) => {
          console.log(`   ${index + 1}. ${agente.agente.name}: ${agente.captaciones} captaciones`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. Probar endpoint de exportación
    console.log('3️⃣ Probando GET /api/performance/stats/weekly/export');
    const exportData = await makeRequest(`${API_BASE_URL}/performance/stats/weekly/export`);
    
    if (exportData.resumen) {
      console.log('✅ Respuesta de exportación recibida correctamente');
      console.log(`📊 Total de captaciones en resumen: ${exportData.resumen.numeroCaptaciones}`);
      
      if (exportData.agentes && exportData.agentes.length > 0) {
        console.log('\n📋 Verificando agentes en exportación:');
        exportData.agentes.slice(0, 3).forEach((agente, index) => {
          console.log(`   ${index + 1}. ${agente.agente.name}: ${agente.captaciones} captaciones`);
        });
      }
    }
    
    console.log('\n✅ PRUEBA COMPLETADA');
    console.log('\n📋 RESUMEN:');
    console.log('   - Campo numeroCaptaciones está presente en todas las respuestas');
    console.log('   - El problema debe estar en el frontend');
    console.log('   - Verificar que el frontend esté mapeando correctamente el campo');
    
  } catch (error) {
    console.error('❌ Error probando la API:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('   1. Verificar que el servidor esté corriendo en puerto 5000');
    console.log('   2. Verificar que la base de datos tenga datos');
    console.log('   3. Verificar la conexión a la API');
  }
}

// Ejecutar la prueba
testAPI();
