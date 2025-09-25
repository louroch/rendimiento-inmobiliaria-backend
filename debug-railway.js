// Script de diagnóstico para Railway
console.log('=== DIAGNÓSTICO RAILWAY ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

// Verificar si Prisma puede encontrar el schema
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
console.log('Schema path:', schemaPath);
console.log('Schema exists:', fs.existsSync(schemaPath));

if (fs.existsSync(schemaPath)) {
  console.log('Schema content preview:', fs.readFileSync(schemaPath, 'utf8').substring(0, 200));
}

// Verificar package.json
const packagePath = path.join(__dirname, 'package.json');
console.log('Package.json exists:', fs.existsSync(packagePath));

if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('Scripts:', pkg.scripts);
  console.log('Dependencies:', Object.keys(pkg.dependencies));
}

console.log('=== FIN DIAGNÓSTICO ===');
