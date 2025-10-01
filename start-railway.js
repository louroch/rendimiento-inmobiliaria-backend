#!/usr/bin/env node

/**
 * Script de inicio específico para Railway
 * Maneja la configuración de puerto y variables de entorno
 */

// Configurar variables de entorno para Railway
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Railway proporciona el puerto en la variable PORT
const PORT = process.env.PORT || 5000;

console.log('🚀 Iniciando aplicación en Railway...');
console.log(`📋 Puerto: ${PORT}`);
console.log(`🌍 Entorno: ${process.env.NODE_ENV}`);
console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurada' : 'No configurada'}`);
console.log(`🔑 JWT_SECRET: ${process.env.JWT_SECRET ? 'Configurada' : 'No configurada'}`);
console.log(`🤖 GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Configurada' : 'No configurada'}`);

// Importar y ejecutar la aplicación principal
require('./index.js');
