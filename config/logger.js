/**
 * Configuración de logging estructurado con Winston
 * Proporciona logging con diferentes niveles y rotación de archivos
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuración de formato personalizado
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Configuración de formato para consola (más legible)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Configuración de transportes
const transports = [
  // Consola (solo en desarrollo)
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: consoleFormat,
    silent: process.env.NODE_ENV === 'test'
  }),

  // Archivo de errores (todos los entornos)
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true
  }),

  // Archivo de logs generales (todos los entornos)
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true
  }),

  // Archivo de logs de performance (solo en producción)
  ...(process.env.NODE_ENV === 'production' ? [
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true,
      filter: (info) => info.category === 'performance'
    })
  ] : [])
];

// Crear logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Logger específico para performance
const performanceLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'test'
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true
    })
  ]
});

// Logger específico para base de datos
const dbLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'test'
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'database-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    })
  ]
});

// Logger específico para API
const apiLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'test'
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'api-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    })
  ]
});

/**
 * Middleware de logging para Express
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log de la petición entrante
  apiLogger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Interceptar el método end para loggear la respuesta
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    apiLogger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // Log de performance si la respuesta es lenta
    if (duration > 1000) {
      performanceLogger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        ip: req.ip
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware de logging de errores
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  next(err);
};

/**
 * Función para loggear consultas de base de datos
 */
const logDatabaseQuery = (query, duration, error = null) => {
  const logData = {
    query: query,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  };

  if (error) {
    dbLogger.error('Database query error', {
      ...logData,
      error: error.message,
      stack: error.stack
    });
  } else {
    dbLogger.info('Database query executed', logData);
    
    // Log de performance para consultas lentas
    if (duration > 500) {
      performanceLogger.warn('Slow database query', logData);
    }
  }
};

/**
 * Función para loggear métricas de performance
 */
const logPerformance = (operation, duration, metadata = {}) => {
  performanceLogger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

/**
 * Función para loggear eventos del sistema
 */
const logSystemEvent = (event, data = {}) => {
  logger.info('System event', {
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  performanceLogger,
  dbLogger,
  apiLogger,
  requestLogger,
  errorLogger,
  logDatabaseQuery,
  logPerformance,
  logSystemEvent
};
