// Script de prueba para verificar CORS
const https = require('https');

function testCORS(endpoint, origin) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'rendimiento-inmobiliaria-production.up.railway.app',
      port: 443,
      path: endpoint,
      method: 'GET',
      headers: {
        'Origin': origin,
        'User-Agent': 'CORS-Test'
      }
    };

    console.log(`\n=== Probando ${endpoint} con Origin: ${origin} ===`);

    const req = https.request(options, (res) => {
      console.log('Status:', res.statusCode);
      console.log('Headers CORS:');
      console.log('  Access-Control-Allow-Origin:', res.headers['access-control-allow-origin'] || 'NO ENCONTRADO');
      console.log('  Access-Control-Allow-Methods:', res.headers['access-control-allow-methods'] || 'NO ENCONTRADO');
      console.log('  Access-Control-Allow-Headers:', res.headers['access-control-allow-headers'] || 'NO ENCONTRADO');
      console.log('  Access-Control-Allow-Credentials:', res.headers['access-control-allow-credentials'] || 'NO ENCONTRADO');
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response Body:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
        resolve({
          status: res.statusCode,
          corsHeaders: {
            origin: res.headers['access-control-allow-origin'],
            methods: res.headers['access-control-allow-methods'],
            headers: res.headers['access-control-allow-headers'],
            credentials: res.headers['access-control-allow-credentials']
          }
        });
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error.message);
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  try {
    // Probar health check
    await testCORS('/api/health', 'https://rendimiento-inmobiliaria-frontend.vercel.app');
    
    // Probar con origin diferente
    await testCORS('/api/health', 'http://localhost:3000');
    
    // Probar sin origin
    await testCORS('/api/health', undefined);
    
  } catch (error) {
    console.error('Error en las pruebas:', error);
  }
}

runTests();
