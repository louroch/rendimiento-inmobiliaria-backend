/**
 * Configuración y validación de variables de entorno
 * Valida que todas las variables requeridas estén presentes y sean válidas
 */

const Joi = require('joi');

// Esquema de validación para variables de entorno
const envSchema = Joi.object({
  // Base de datos
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required()
    .messages({
      'string.uri': 'DATABASE_URL debe ser una URL válida de MongoDB',
      'any.required': 'DATABASE_URL es requerida'
    }),

  // JWT
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'JWT_SECRET debe tener al menos 32 caracteres',
      'any.required': 'JWT_SECRET es requerida'
    }),

  // API Keys
  GEMINI_API_KEY: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.min': 'GEMINI_API_KEY debe tener al menos 10 caracteres',
      'any.required': 'GEMINI_API_KEY es requerida'
    }),

  // Configuración del servidor
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .messages({
      'any.only': 'NODE_ENV debe ser development, production o test'
    }),

  PORT: Joi.number()
    .integer()
    .min(1000)
    .max(65535)
    .default(process.env.PORT || 5000)
    .messages({
      'number.min': 'PORT debe ser mayor a 1000',
      'number.max': 'PORT debe ser menor a 65535'
    }),

  // Configuración de CORS (opcional)
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:3000')
    .messages({
      'string.base': 'CORS_ORIGIN debe ser una cadena válida'
    }),

  // Configuración de Redis (opcional para cache)
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .optional()
    .messages({
      'string.uri': 'REDIS_URL debe ser una URL válida de Redis'
    }),

  // Configuración de logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
    .messages({
      'any.only': 'LOG_LEVEL debe ser error, warn, info o debug'
    }),

  // Configuración de rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .min(1000)
    .default(900000) // 15 minutos
    .messages({
      'number.min': 'RATE_LIMIT_WINDOW_MS debe ser mayor a 1000ms'
    }),

  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .integer()
    .min(1)
    .default(100)
    .messages({
      'number.min': 'RATE_LIMIT_MAX_REQUESTS debe ser mayor a 0'
    })
});

/**
 * Valida las variables de entorno
 * @returns {Object} Variables de entorno validadas
 * @throws {Error} Si alguna variable no es válida
 */
function validateEnv() {
  const { error, value } = envSchema.validate(process.env, {
    allowUnknown: true, // Permite variables no definidas en el schema
    stripUnknown: true  // Elimina variables no definidas en el schema
  });

  if (error) {
    const errorMessage = `❌ Error de validación de variables de entorno:\n${error.details
      .map(detail => `  - ${detail.message}`)
      .join('\n')}`;
    
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return value;
}

/**
 * Obtiene la configuración validada del entorno
 * @returns {Object} Configuración del entorno
 */
function getConfig() {
  try {
    const config = validateEnv();
    
    // Log de configuración exitosa (sin mostrar secretos)
    console.log('✅ Variables de entorno validadas correctamente');
    console.log(`📊 Entorno: ${config.NODE_ENV}`);
    console.log(`🚀 Puerto: ${config.PORT}`);
    console.log(`📝 Nivel de log: ${config.LOG_LEVEL}`);
    console.log(`🔒 JWT configurado: ${config.JWT_SECRET ? 'Sí' : 'No'}`);
    console.log(`🤖 Gemini API configurada: ${config.GEMINI_API_KEY ? 'Sí' : 'No'}`);
    console.log(`🗄️ Base de datos configurada: ${config.DATABASE_URL ? 'Sí' : 'No'}`);
    console.log(`🔴 Redis configurado: ${config.REDIS_URL ? 'Sí' : 'No'}`);
    
    return config;
  } catch (error) {
    console.error('❌ Error cargando configuración:', error.message);
    process.exit(1);
  }
}

module.exports = {
  validateEnv,
  getConfig
};
