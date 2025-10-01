#!/usr/bin/env node

/**
 * Script de prueba para verificar los health checks
 * Uso: node test-health.js [port]
 */

const http = require('http');

const PORT = process.argv[2] || 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function testHealthCheck(endpoint, description) {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ ${description}: ${res.statusCode} - ${json.status || 'OK'}`);
          resolve({ success: true, status: res.statusCode, data: json });
        } catch (e) {
          console.log(`❌ ${description}: ${res.statusCode} - Error parsing JSON`);
          resolve({ success: false, status: res.statusCode, error: e.message });
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${description}: Connection failed - ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${description}: Timeout after 5s`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function runTests() {
  console.log(`🧪 Testing health checks on ${BASE_URL}\n`);
  
  const tests = [
    { endpoint: '/api/health', description: 'Main Health Check' },
    { endpoint: '/api/health/simple', description: 'Simple Health Check' },
    { endpoint: '/api/health/live', description: 'Liveness Check' },
    { endpoint: '/api/health/ready', description: 'Readiness Check' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testHealthCheck(test.endpoint, test.description);
    results.push({ ...test, ...result });
  }
  
  console.log('\n📊 Test Results Summary:');
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  
  if (successful < total) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.description}: ${r.error || 'Unknown error'}`);
    });
  }
  
  process.exit(successful === total ? 0 : 1);
}

runTests().catch(console.error);
