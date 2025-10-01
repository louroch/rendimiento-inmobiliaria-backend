/**
 * Configuración de cache Redis para optimización de consultas
 * Proporciona cache inteligente para consultas frecuentes
 */

const Redis = require('ioredis');
const { logger } = require('./logger');

// Configuración de Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Crear instancia de Redis
let redis = null;

/**
 * Inicializa la conexión a Redis
 */
async function initializeRedis() {
  try {
    redis = new Redis(redisConfig);
    
    redis.on('connect', () => {
      logger.info('Redis conectado exitosamente');
    });
    
    redis.on('error', (error) => {
      logger.error('Error de conexión Redis', { error: error.message });
    });
    
    redis.on('close', () => {
      logger.warn('Conexión Redis cerrada');
    });
    
    // Verificar conexión
    await redis.ping();
    logger.info('Cache Redis inicializado correctamente');
    
    return redis;
  } catch (error) {
    logger.error('Error inicializando Redis', { error: error.message });
    // En caso de error, continuar sin cache
    redis = null;
    return null;
  }
}

/**
 * Obtiene un valor del cache
 * @param {string} key - Clave del cache
 * @returns {Promise<any>} Valor del cache o null si no existe
 */
async function get(key) {
  if (!redis) return null;
  
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Error obteniendo del cache', { key, error: error.message });
    return null;
  }
}

/**
 * Establece un valor en el cache
 * @param {string} key - Clave del cache
 * @param {any} value - Valor a almacenar
 * @param {number} ttl - Tiempo de vida en segundos (opcional)
 * @returns {Promise<boolean>} True si se almacenó correctamente
 */
async function set(key, value, ttl = null) {
  if (!redis) return false;
  
  try {
    const serializedValue = JSON.stringify(value);
    
    if (ttl) {
      await redis.setex(key, ttl, serializedValue);
    } else {
      await redis.set(key, serializedValue);
    }
    
    return true;
  } catch (error) {
    logger.error('Error estableciendo en cache', { key, error: error.message });
    return false;
  }
}

/**
 * Elimina una clave del cache
 * @param {string} key - Clave a eliminar
 * @returns {Promise<boolean>} True si se eliminó correctamente
 */
async function del(key) {
  if (!redis) return false;
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    logger.error('Error eliminando del cache', { key, error: error.message });
    return false;
  }
}

/**
 * Elimina múltiples claves del cache
 * @param {string[]} keys - Claves a eliminar
 * @returns {Promise<boolean>} True si se eliminaron correctamente
 */
async function delMultiple(keys) {
  if (!redis || !keys.length) return false;
  
  try {
    await redis.del(...keys);
    return true;
  } catch (error) {
    logger.error('Error eliminando múltiples claves del cache', { keys, error: error.message });
    return false;
  }
}

/**
 * Obtiene o establece un valor en el cache (patrón cache-aside)
 * @param {string} key - Clave del cache
 * @param {Function} fetchFunction - Función para obtener el valor si no está en cache
 * @param {number} ttl - Tiempo de vida en segundos
 * @returns {Promise<any>} Valor del cache o resultado de la función
 */
async function getOrSet(key, fetchFunction, ttl = 300) {
  try {
    // Intentar obtener del cache
    const cachedValue = await get(key);
    if (cachedValue !== null) {
      logger.debug('Cache hit', { key });
      return cachedValue;
    }
    
    // Si no está en cache, ejecutar la función
    logger.debug('Cache miss', { key });
    const value = await fetchFunction();
    
    // Almacenar en cache
    await set(key, value, ttl);
    
    return value;
  } catch (error) {
    logger.error('Error en getOrSet', { key, error: error.message });
    // En caso de error, ejecutar la función directamente
    return await fetchFunction();
  }
}

/**
 * Invalida el cache basado en un patrón
 * @param {string} pattern - Patrón de claves a invalidar
 * @returns {Promise<boolean>} True si se invalidó correctamente
 */
async function invalidatePattern(pattern) {
  if (!redis) return false;
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await delMultiple(keys);
      logger.info('Cache invalidado por patrón', { pattern, keysCount: keys.length });
    }
    return true;
  } catch (error) {
    logger.error('Error invalidando cache por patrón', { pattern, error: error.message });
    return false;
  }
}

/**
 * Genera una clave de cache para estadísticas semanales
 * @param {string} type - Tipo de estadística
 * @param {number} weekNumber - Número de semana
 * @param {number} year - Año
 * @param {string} userId - ID del usuario (opcional)
 * @returns {string} Clave de cache
 */
function generateWeeklyStatsKey(type, weekNumber, year, userId = null) {
  const baseKey = `weekly_stats:${type}:${year}:${weekNumber}`;
  return userId ? `${baseKey}:user:${userId}` : baseKey;
}

/**
 * Genera una clave de cache para estadísticas generales
 * @param {string} type - Tipo de estadística
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @returns {string} Clave de cache
 */
function generateGeneralStatsKey(type, startDate, endDate) {
  return `general_stats:${type}:${startDate}:${endDate}`;
}

/**
 * Genera una clave de cache para rankings
 * @param {string} type - Tipo de ranking
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @returns {string} Clave de cache
 */
function generateRankingKey(type, startDate, endDate) {
  return `ranking:${type}:${startDate}:${endDate}`;
}

/**
 * Invalida el cache de estadísticas semanales
 * @param {number} weekNumber - Número de semana
 * @param {number} year - Año
 * @returns {Promise<boolean>} True si se invalidó correctamente
 */
async function invalidateWeeklyStats(weekNumber, year) {
  const patterns = [
    `weekly_stats:*:${year}:${weekNumber}*`,
    `general_stats:*:*`,
    `ranking:*:*`
  ];
  
  const results = await Promise.all(
    patterns.map(pattern => invalidatePattern(pattern))
  );
  
  return results.every(result => result);
}

/**
 * Cierra la conexión a Redis
 */
async function closeRedis() {
  if (redis) {
    try {
      await redis.quit();
      logger.info('Conexión Redis cerrada correctamente');
    } catch (error) {
      logger.error('Error cerrando Redis', { error: error.message });
    }
  }
}

module.exports = {
  initializeRedis,
  get,
  set,
  del,
  delMultiple,
  getOrSet,
  invalidatePattern,
  generateWeeklyStatsKey,
  generateGeneralStatsKey,
  generateRankingKey,
  invalidateWeeklyStats,
  closeRedis
};
