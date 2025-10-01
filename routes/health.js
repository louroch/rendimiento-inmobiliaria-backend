/**
 * Health Check Avanzado para Monitoreo del Sistema
 * Proporciona información detallada sobre el estado de todos los componentes
 */

const express = require('express');
const { getConnectionPoolStatus } = require('../config/database');
const { logger } = require('../config/logger');
const { initializeRedis } = require('../config/cache');
const os = require('os');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/**
 * Health check básico (rápido)
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Verificar conexión a la base de datos
    const dbStatus = await getConnectionPoolStatus();
    
    const responseTime = Date.now() - startTime;
    
    const health = {
      status: dbStatus.status === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: {
        status: dbStatus.status,
        responseTime: dbStatus.responseTime
      }
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Health check detallado (completo)
 */
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Verificar todos los componentes en paralelo
    const [dbStatus, redisStatus, systemStatus, diskStatus] = await Promise.allSettled([
      getConnectionPoolStatus(),
      checkRedisStatus(),
      getSystemStatus(),
      getDiskStatus()
    ]);
    
    const responseTime = Date.now() - startTime;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      components: {
        database: dbStatus.status === 'fulfilled' ? dbStatus.value : { status: 'error', error: dbStatus.reason?.message },
        redis: redisStatus.status === 'fulfilled' ? redisStatus.value : { status: 'error', error: redisStatus.reason?.message },
        system: systemStatus.status === 'fulfilled' ? systemStatus.value : { status: 'error', error: systemStatus.reason?.message },
        disk: diskStatus.status === 'fulfilled' ? diskStatus.value : { status: 'error', error: diskStatus.reason?.message }
      },
      logs: {
        directory: './logs',
        files: getLogFiles(),
        totalSize: getLogsTotalSize()
      }
    };
    
    // Determinar estado general
    const componentStatuses = Object.values(health.components).map(comp => comp.status);
    if (componentStatuses.includes('error') || componentStatuses.includes('disconnected')) {
      health.status = 'degraded';
    }
    if (componentStatuses.includes('error') && componentStatuses.filter(s => s === 'error').length > 1) {
      health.status = 'unhealthy';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    logger.error('Detailed health check failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Health check para métricas de performance
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss,
        percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: os.loadavg()
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length
      },
      node: {
        version: process.version,
        pid: process.pid,
        title: process.title
      }
    };
    
    res.json(metrics);
    
  } catch (error) {
    logger.error('Metrics health check failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message
    });
  }
});

/**
 * Health check para readiness (Kubernetes)
 */
router.get('/ready', async (req, res) => {
  try {
    const dbStatus = await getConnectionPoolStatus();
    
    if (dbStatus.status === 'connected') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not connected'
      });
    }
    
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Health check para liveness (Kubernetes)
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Verificar estado de Redis
 */
async function checkRedisStatus() {
  try {
    const Redis = require('ioredis');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      connectTimeout: 5000,
      lazyConnect: true
    });
    
    const startTime = Date.now();
    await redis.ping();
    const responseTime = Date.now() - startTime;
    
    await redis.disconnect();
    
    return {
      status: 'connected',
      responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Obtener estado del sistema
 */
function getSystemStatus() {
  try {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      status: 'healthy',
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        systemUsed: usedMem,
        systemTotal: totalMem,
        percentage: Math.round((usedMem / totalMem) * 100)
      },
      cpu: {
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length
      },
      uptime: os.uptime(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Obtener estado del disco
 */
function getDiskStatus() {
  try {
    const stats = fs.statSync('./logs');
    const logDirSize = getLogsTotalSize();
    
    return {
      status: 'healthy',
      logs: {
        directory: './logs',
        exists: true,
        size: logDirSize,
        files: getLogFiles().length
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Obtener archivos de log
 */
function getLogFiles() {
  try {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      return [];
    }
    
    return fs.readdirSync(logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(logDir, file),
        size: fs.statSync(path.join(logDir, file)).size
      }));
  } catch (error) {
    return [];
  }
}

/**
 * Obtener tamaño total de logs
 */
function getLogsTotalSize() {
  try {
    const logFiles = getLogFiles();
    return logFiles.reduce((total, file) => total + file.size, 0);
  } catch (error) {
    return 0;
  }
}

module.exports = router;
