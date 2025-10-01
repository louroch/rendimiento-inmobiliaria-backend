/**
 * Middleware de Rate Limiting para protección contra ataques
 * Implementa diferentes límites según el tipo de endpoint
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Configuración base de rate limiting
const baseRateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests por ventana
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true, // Retorna rate limit info en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000),
      timestamp: new Date().toISOString()
    });
  }
};

// Rate limiting general (más permisivo)
const generalLimiter = rateLimit({
  ...baseRateLimitConfig,
  max: 200, // Más permisivo para navegación general
  skip: (req) => {
    // Saltar rate limiting para health checks
    return req.path === '/api/health';
  }
});

// Rate limiting estricto para autenticación
const authLimiter = rateLimit({
  ...baseRateLimitConfig,
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos de login por IP cada 15 minutos
  skipSuccessfulRequests: true, // No contar requests exitosos
  message: {
    error: 'Demasiados intentos de autenticación',
    message: 'Has excedido el límite de intentos de login. Intenta de nuevo en 15 minutos.',
    retryAfter: 900
  }
});

// Rate limiting para endpoints de creación de datos
const createDataLimiter = rateLimit({
  ...baseRateLimitConfig,
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // 20 creaciones por IP cada 5 minutos
  message: {
    error: 'Demasiadas creaciones de datos',
    message: 'Has excedido el límite de creaciones. Intenta de nuevo más tarde.',
    retryAfter: 300
  }
});

// Rate limiting para endpoints de consulta (más permisivo)
const readDataLimiter = rateLimit({
  ...baseRateLimitConfig,
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 consultas por IP por minuto
  message: {
    error: 'Demasiadas consultas',
    message: 'Has excedido el límite de consultas. Intenta de nuevo en un minuto.',
    retryAfter: 60
  }
});

// Rate limiting para endpoints de reportes (más restrictivo)
const reportsLimiter = rateLimit({
  ...baseRateLimitConfig,
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 10, // 10 reportes por IP cada 10 minutos
  message: {
    error: 'Demasiadas solicitudes de reportes',
    message: 'Has excedido el límite de reportes. Intenta de nuevo más tarde.',
    retryAfter: 600
  }
});

// Rate limiting para endpoints de Gemini AI (muy restrictivo)
const geminiLimiter = rateLimit({
  ...baseRateLimitConfig,
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 consultas de IA por IP por hora
  message: {
    error: 'Demasiadas consultas de IA',
    message: 'Has excedido el límite de consultas de IA. Intenta de nuevo en una hora.',
    retryAfter: 3600
  }
});

// Slow down para requests repetitivos (protección adicional)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 50, // Después de 50 requests, empezar a ralentizar
  delayMs: 500, // Añadir 500ms de delay por cada request adicional
  maxDelayMs: 20000, // Máximo 20 segundos de delay
  skip: (req) => {
    // Saltar slow down para health checks
    return req.path === '/api/health';
  }
});

// Rate limiting por usuario autenticado (más permisivo)
const userLimiter = rateLimit({
  ...baseRateLimitConfig,
  keyGenerator: (req) => {
    // Usar ID de usuario si está autenticado, sino IP
    return req.user?.id || req.ip;
  },
  max: 500, // 500 requests por usuario autenticado por ventana
  message: {
    error: 'Demasiadas solicitudes del usuario',
    message: 'Has excedido el límite de solicitudes para tu cuenta. Intenta de nuevo más tarde.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  }
});

// Rate limiting para endpoints de administración
const adminLimiter = rateLimit({
  ...baseRateLimitConfig,
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 100, // 100 requests de admin por IP cada 5 minutos
  skip: (req) => {
    // Solo aplicar a usuarios admin
    return req.user?.role !== 'admin';
  },
  message: {
    error: 'Demasiadas solicitudes de administración',
    message: 'Has excedido el límite de solicitudes de administración.',
    retryAfter: 300
  }
});

/**
 * Middleware para logging de rate limiting
 */
const rateLimitLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode === 429) {
      // Log rate limiting events
      const { logger } = require('../config/logger');
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  createDataLimiter,
  readDataLimiter,
  reportsLimiter,
  geminiLimiter,
  speedLimiter,
  userLimiter,
  adminLimiter,
  rateLimitLogger
};
