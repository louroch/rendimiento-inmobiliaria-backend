/**
 * Utilidades de paginación optimizada para datasets grandes
 * Implementa cursor-based pagination y paginación tradicional optimizada
 */

const { prisma } = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Configuración de paginación por defecto
 */
const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  maxLimit: 100
};

/**
 * Valida y normaliza parámetros de paginación
 * @param {Object} query - Query parameters
 * @returns {Object} Parámetros de paginación normalizados
 */
function validatePaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || DEFAULT_PAGINATION.page);
  const limit = Math.min(
    Math.max(1, parseInt(query.limit) || DEFAULT_PAGINATION.limit),
    DEFAULT_PAGINATION.maxLimit
  );
  
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

/**
 * Paginación tradicional optimizada con conteo total
 * @param {Object} model - Modelo de Prisma
 * @param {Object} where - Condiciones de filtro
 * @param {Object} options - Opciones de paginación
 * @returns {Promise<Object>} Resultado paginado
 */
async function paginate(model, where = {}, options = {}) {
  const startTime = Date.now();
  
  try {
    const { page, limit, skip } = validatePaginationParams(options);
    const { orderBy = { createdAt: 'desc' }, select, include } = options;
    
    // Ejecutar consultas en paralelo para optimizar rendimiento
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        ...(select && { select }),
        ...(include && { include })
      }),
      model.count({ where })
    ]);
    
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    const result = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      meta: {
        queryTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
    
    // Log de performance para consultas lentas
    if (result.meta.queryTime > 1000) {
      logger.warn('Slow pagination query detected', {
        model: model.name || 'Unknown',
        queryTime: result.meta.queryTime,
        total,
        page,
        limit
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Error in pagination', {
      error: error.message,
      model: model.name || 'Unknown',
      where,
      options
    });
    throw error;
  }
}

/**
 * Cursor-based pagination para datasets muy grandes
 * @param {Object} model - Modelo de Prisma
 * @param {Object} where - Condiciones de filtro
 * @param {Object} options - Opciones de paginación
 * @returns {Promise<Object>} Resultado con cursor
 */
async function paginateWithCursor(model, where = {}, options = {}) {
  const startTime = Date.now();
  
  try {
    const { 
      cursor, 
      limit = DEFAULT_PAGINATION.limit,
      orderBy = { createdAt: 'desc' },
      select,
      include
    } = options;
    
    const queryOptions = {
      where,
      orderBy,
      take: limit + 1, // Tomar uno extra para determinar si hay más páginas
      ...(select && { select }),
      ...(include && { include })
    };
    
    // Si hay cursor, agregar condición
    if (cursor) {
      const cursorField = Object.keys(orderBy)[0];
      const cursorDirection = Object.values(orderBy)[0];
      
      if (cursorDirection === 'desc') {
        queryOptions.where[cursorField] = { lt: cursor };
      } else {
        queryOptions.where[cursorField] = { gt: cursor };
      }
    }
    
    const data = await model.findMany(queryOptions);
    const hasNextPage = data.length > limit;
    
    // Remover el elemento extra si existe
    if (hasNextPage) {
      data.pop();
    }
    
    const result = {
      data,
      pagination: {
        hasNextPage,
        hasPrevPage: !!cursor,
        nextCursor: hasNextPage ? data[data.length - 1]?.id : null,
        prevCursor: cursor || null,
        limit
      },
      meta: {
        queryTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
    
    return result;
  } catch (error) {
    logger.error('Error in cursor pagination', {
      error: error.message,
      model: model.name || 'Unknown',
      where,
      options
    });
    throw error;
  }
}

/**
 * Paginación optimizada para consultas de agregación
 * @param {Object} model - Modelo de Prisma
 * @param {Object} where - Condiciones de filtro
 * @param {Object} groupBy - Campos para agrupar
 * @param {Object} options - Opciones de paginación
 * @returns {Promise<Object>} Resultado agregado paginado
 */
async function paginateAggregation(model, where = {}, groupBy = {}, options = {}) {
  const startTime = Date.now();
  
  try {
    const { page, limit, skip } = validatePaginationParams(options);
    const { orderBy = {}, having } = options;
    
    // Obtener datos agregados
    const data = await model.groupBy({
      by: groupBy,
      where,
      having,
      orderBy,
      skip,
      take: limit
    });
    
    // Obtener conteo total de grupos
    const total = await model.groupBy({
      by: groupBy,
      where,
      having,
      _count: { _all: true }
    }).then(groups => groups.length);
    
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      meta: {
        queryTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Error in aggregation pagination', {
      error: error.message,
      model: model.name || 'Unknown',
      where,
      groupBy,
      options
    });
    throw error;
  }
}

/**
 * Paginación con filtros dinámicos y búsqueda
 * @param {Object} model - Modelo de Prisma
 * @param {Object} filters - Filtros dinámicos
 * @param {Object} searchFields - Campos de búsqueda
 * @param {Object} options - Opciones de paginación
 * @returns {Promise<Object>} Resultado con filtros aplicados
 */
async function paginateWithFilters(model, filters = {}, searchFields = [], options = {}) {
  const startTime = Date.now();
  
  try {
    const { page, limit, skip } = validatePaginationParams(options);
    const { search, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    // Construir condiciones de filtro
    let where = { ...filters };
    
    // Agregar búsqueda si se proporciona
    if (search && searchFields.length > 0) {
      where.OR = searchFields.map(field => ({
        [field]: {
          contains: search,
          mode: 'insensitive'
        }
      }));
    }
    
    // Construir ordenamiento
    const orderBy = { [sortBy]: sortOrder };
    
    // Ejecutar consultas en paralelo
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy,
        skip,
        take: limit
      }),
      model.count({ where })
    ]);
    
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      filters: {
        applied: filters,
        search,
        sortBy,
        sortOrder
      },
      meta: {
        queryTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Error in filtered pagination', {
      error: error.message,
      model: model.name || 'Unknown',
      filters,
      searchFields,
      options
    });
    throw error;
  }
}

/**
 * Middleware para validar parámetros de paginación
 */
const validatePaginationMiddleware = (req, res, next) => {
  try {
    const { page, limit } = req.query;
    
    // Validar página
    if (page && (isNaN(page) || parseInt(page) < 1)) {
      return res.status(400).json({
        error: 'Parámetro de página inválido',
        message: 'La página debe ser un número mayor a 0'
      });
    }
    
    // Validar límite
    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > DEFAULT_PAGINATION.maxLimit)) {
      return res.status(400).json({
        error: 'Parámetro de límite inválido',
        message: `El límite debe ser un número entre 1 y ${DEFAULT_PAGINATION.maxLimit}`
      });
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Error validando parámetros de paginación',
      message: error.message
    });
  }
};

module.exports = {
  validatePaginationParams,
  paginate,
  paginateWithCursor,
  paginateAggregation,
  paginateWithFilters,
  validatePaginationMiddleware,
  DEFAULT_PAGINATION
};
