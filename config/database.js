const { PrismaClient } = require('@prisma/client');
const { logger } = require('./logger');

// Configuración optimizada de Prisma con connection pooling
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Configuración de connection pooling
  __internal: {
    engine: {
      // Configuración de pool de conexiones
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT) || 10000,
      // Configuración de timeouts
      connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
      // Configuración de retry
      maxRetries: parseInt(process.env.DB_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.DB_RETRY_DELAY) || 1000
    }
  }
});

// Función para conectar a la base de datos
async function connectDatabase() {
  try {
    await prisma.$connect();
    
    // Verificar conexión con una consulta simple compatible con MongoDB
    // Usar $runCommandRaw para MongoDB en lugar de $queryRaw
    await prisma.$runCommandRaw({ ping: 1 });
    
    logger.info('Base de datos conectada exitosamente', {
      connectionPool: {
        limit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        timeout: parseInt(process.env.DB_POOL_TIMEOUT) || 10000
      },
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Conectado a MongoDB exitosamente');
    console.log(`🔗 Connection Pool: ${parseInt(process.env.DB_CONNECTION_LIMIT) || 10} conexiones máximas`);
  } catch (error) {
    logger.error('Error conectando a la base de datos', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

// Función para monitorear el estado del pool de conexiones
async function getConnectionPoolStatus() {
  try {
    // Obtener métricas básicas de la base de datos usando MongoDB ping
    const startTime = Date.now();
    await prisma.$runCommandRaw({ ping: 1 });
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'connected',
      responseTime,
      timestamp: new Date().toISOString(),
      pool: {
        limit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        timeout: parseInt(process.env.DB_POOL_TIMEOUT) || 10000
      }
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Función para desconectar de la base de datos
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('Conexión a la base de datos cerrada correctamente');
    console.log('🔌 Desconectado de MongoDB');
  } catch (error) {
    logger.error('Error cerrando conexión a la base de datos', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Middleware para monitorear queries lentas
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;
  
  // Log queries lentas (>1000ms)
  if (duration > 1000) {
    logger.warn('Slow database query detected', {
      model: params.model,
      action: params.action,
      duration,
      args: params.args
    });
  }
  
  return result;
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

module.exports = { 
  prisma, 
  connectDatabase, 
  disconnectDatabase, 
  getConnectionPoolStatus 
};
