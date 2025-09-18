const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
  getWeekRange, 
  getPreviousWeekRange, 
  getWeekNumber, 
  formatDate, 
  calculateChange 
} = require('../utils/weeklyUtils');

const router = express.Router();

// @route   POST /api/performance
// @desc    Crear nuevo registro de desempeño
// @access  Private (Asesor)
router.post('/', authenticateToken, [
  body('fecha').isISO8601().withMessage('Fecha válida requerida'),
  body('consultasRecibidas').isInt({ min: 0 }).withMessage('Consultas recibidas debe ser un número positivo'),
  body('muestrasRealizadas').isInt({ min: 0 }).withMessage('Muestras realizadas debe ser un número positivo'),
  body('operacionesCerradas').isInt({ min: 0 }).withMessage('Operaciones cerradas debe ser un número positivo'),
  body('seguimiento').isBoolean().withMessage('Seguimiento debe ser un valor booleano'),
  body('usoTokko').optional().isString().trim(),
  // NUEVOS CAMPOS - Validaciones
  body('cantidadPropiedadesTokko').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Cantidad de propiedades debe ser un número positivo'),
  body('linksTokko').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('dificultadTokko').optional({ nullable: true, checkFalsy: true }).isBoolean().withMessage('Dificultad Tokko debe ser un valor booleano'),
  body('detalleDificultadTokko').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('observaciones').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('numeroCaptaciones').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Número de captaciones debe ser un número positivo')
], async (req, res) => {
  try {
    // Log para debugging
    console.log('📊 Datos recibidos en POST /api/performance:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Errores de validación:', errors.array());
      return res.status(400).json({ 
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const {
      fecha,
      consultasRecibidas,
      muestrasRealizadas,
      operacionesCerradas,
      seguimiento,
      usoTokko,
      // NUEVOS CAMPOS
      cantidadPropiedadesTokko,
      linksTokko,
      dificultadTokko,
      detalleDificultadTokko,
      observaciones
    } = req.body;

    const performance = await prisma.performance.create({
      data: {
        userId: req.user.id,
        fecha: new Date(fecha),
        consultasRecibidas,
        muestrasRealizadas,
        operacionesCerradas,
        seguimiento,
        usoTokko: usoTokko || null,
        // NUEVOS CAMPOS
        cantidadPropiedadesTokko: cantidadPropiedadesTokko ? parseInt(cantidadPropiedadesTokko) : null,
        linksTokko: linksTokko && linksTokko.trim() ? linksTokko.trim() : null,
        dificultadTokko: dificultadTokko !== undefined ? Boolean(dificultadTokko) : null,
        detalleDificultadTokko: detalleDificultadTokko && detalleDificultadTokko.trim() ? detalleDificultadTokko.trim() : null,
        observaciones: observaciones && observaciones.trim() ? observaciones.trim() : null,
        numeroCaptaciones: numeroCaptaciones ? parseInt(numeroCaptaciones) : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Registro de desempeño creado exitosamente',
      performance
    });
  } catch (error) {
    console.error('Error creando registro de desempeño:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/performance
// @desc    Obtener registros de desempeño
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      userId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construir filtros
    const where = {};

    // Los asesores solo pueden ver sus propios registros
    if (req.user.role === 'ASESOR') {
      where.userId = req.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    // Filtros de fecha
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    const [performance, total] = await Promise.all([
      prisma.performance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          fecha: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.performance.count({ where })
    ]);

    res.json({
      performance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error obteniendo registros de desempeño:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/performance/:id
// @desc    Obtener registro de desempeño por ID con datos detallados
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const performance = await prisma.performance.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!performance) {
      return res.status(404).json({ message: 'Registro de desempeño no encontrado' });
    }

    // Los asesores solo pueden ver sus propios registros
    if (req.user.role === 'ASESOR' && performance.userId !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para ver este registro' });
    }

    // Estructurar la respuesta con todos los datos detallados
    const performanceDetail = {
      id: performance.id,
      fecha: performance.fecha,
      // Métricas principales
      consultasRecibidas: performance.consultasRecibidas,
      muestrasRealizadas: performance.muestrasRealizadas,
      operacionesCerradas: performance.operacionesCerradas,
      seguimiento: performance.seguimiento,
      // Datos de Tokko
      usoTokko: performance.usoTokko,
      cantidadPropiedadesTokko: performance.cantidadPropiedadesTokko,
      linksTokko: performance.linksTokko,
      dificultadTokko: performance.dificultadTokko,
      detalleDificultadTokko: performance.detalleDificultadTokko,
      observaciones: performance.observaciones,
      // Metadatos
      createdAt: performance.createdAt,
      updatedAt: performance.updatedAt,
      // Usuario (nombre + email)
      usuario: {
        id: performance.user.id,
        nombre: performance.user.name,
        email: performance.user.email,
        rol: performance.user.role
      }
    };

    res.json({ 
      success: true,
      performance: performanceDetail,
      message: 'Registro de desempeño obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo registro de desempeño:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/performance/:id
// @desc    Actualizar registro de desempeño
// @access  Private
router.put('/:id', authenticateToken, [
  body('fecha').optional().isISO8601().withMessage('Fecha válida requerida'),
  body('consultasRecibidas').optional().isInt({ min: 0 }).withMessage('Consultas recibidas debe ser un número positivo'),
  body('muestrasRealizadas').optional().isInt({ min: 0 }).withMessage('Muestras realizadas debe ser un número positivo'),
  body('operacionesCerradas').optional().isInt({ min: 0 }).withMessage('Operaciones cerradas debe ser un número positivo'),
  body('seguimiento').optional().isBoolean().withMessage('Seguimiento debe ser un valor booleano'),
  body('usoTokko').optional().isString().trim(),
  // NUEVOS CAMPOS - Validaciones para actualización
  body('cantidadPropiedadesTokko').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Cantidad de propiedades debe ser un número positivo'),
  body('linksTokko').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('dificultadTokko').optional({ nullable: true, checkFalsy: true }).isBoolean().withMessage('Dificultad Tokko debe ser un valor booleano'),
  body('detalleDificultadTokko').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('observaciones').optional({ nullable: true, checkFalsy: true }).isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Verificar que el registro existe
    const existingPerformance = await prisma.performance.findUnique({
      where: { id }
    });

    if (!existingPerformance) {
      return res.status(404).json({ message: 'Registro de desempeño no encontrado' });
    }

    // Los asesores solo pueden actualizar sus propios registros
    if (req.user.role === 'ASESOR' && existingPerformance.userId !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para actualizar este registro' });
    }

    const updateData = {};
    const { 
      fecha, 
      consultasRecibidas, 
      muestrasRealizadas, 
      operacionesCerradas, 
      seguimiento, 
      usoTokko,
      // NUEVOS CAMPOS
      cantidadPropiedadesTokko,
      linksTokko,
      dificultadTokko,
      detalleDificultadTokko,
      observaciones
    } = req.body;

    if (fecha !== undefined) updateData.fecha = new Date(fecha);
    if (consultasRecibidas !== undefined) updateData.consultasRecibidas = consultasRecibidas;
    if (muestrasRealizadas !== undefined) updateData.muestrasRealizadas = muestrasRealizadas;
    if (operacionesCerradas !== undefined) updateData.operacionesCerradas = operacionesCerradas;
    if (seguimiento !== undefined) updateData.seguimiento = seguimiento;
    if (usoTokko !== undefined) updateData.usoTokko = usoTokko || null;
    
    // NUEVOS CAMPOS - Actualización
    if (cantidadPropiedadesTokko !== undefined) updateData.cantidadPropiedadesTokko = cantidadPropiedadesTokko ? parseInt(cantidadPropiedadesTokko) : null;
    if (linksTokko !== undefined) updateData.linksTokko = linksTokko && linksTokko.trim() ? linksTokko.trim() : null;
    if (dificultadTokko !== undefined) updateData.dificultadTokko = dificultadTokko !== undefined ? Boolean(dificultadTokko) : null;
    if (detalleDificultadTokko !== undefined) updateData.detalleDificultadTokko = detalleDificultadTokko && detalleDificultadTokko.trim() ? detalleDificultadTokko.trim() : null;
    if (observaciones !== undefined) updateData.observaciones = observaciones && observaciones.trim() ? observaciones.trim() : null;
    if (numeroCaptaciones !== undefined) updateData.numeroCaptaciones = numeroCaptaciones ? parseInt(numeroCaptaciones) : null;

    const performance = await prisma.performance.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Registro de desempeño actualizado exitosamente',
      performance
    });
  } catch (error) {
    console.error('Error actualizando registro de desempeño:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/performance/:id
// @desc    Eliminar registro de desempeño
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el registro existe
    const existingPerformance = await prisma.performance.findUnique({
      where: { id }
    });

    if (!existingPerformance) {
      return res.status(404).json({ message: 'Registro de desempeño no encontrado' });
    }

    // Los asesores solo pueden eliminar sus propios registros
    if (req.user.role === 'ASESOR' && existingPerformance.userId !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar este registro' });
    }

    await prisma.performance.delete({
      where: { id }
    });

    res.json({ message: 'Registro de desempeño eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando registro de desempeño:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/performance/stats/overview
// @desc    Obtener estadísticas generales
// @access  Private (Admin)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    const stats = await prisma.performance.aggregate({
      where,
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true
      },
      _avg: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true
      }
    });

    const totalRecords = await prisma.performance.count({ where });

    // Calcular tasas de conversión
    const conversionRates = {
      consultasToMuestras: stats._sum.consultasRecibidas > 0 
        ? (stats._sum.muestrasRealizadas / stats._sum.consultasRecibidas * 100).toFixed(2)
        : 0,
      muestrasToOperaciones: stats._sum.muestrasRealizadas > 0 
        ? (stats._sum.operacionesCerradas / stats._sum.muestrasRealizadas * 100).toFixed(2)
        : 0
    };

    res.json({
      totalRecords,
      totals: {
        consultasRecibidas: stats._sum.consultasRecibidas || 0,
        muestrasRealizadas: stats._sum.muestrasRealizadas || 0,
        operacionesCerradas: stats._sum.operacionesCerradas || 0,
        numeroCaptaciones: stats._sum.numeroCaptaciones || 0
      },
      averages: {
        consultasRecibidas: Math.round(stats._avg.consultasRecibidas || 0),
        muestrasRealizadas: Math.round(stats._avg.muestrasRealizadas || 0),
        operacionesCerradas: Math.round(stats._avg.operacionesCerradas || 0),
        numeroCaptaciones: Math.round(stats._avg.numeroCaptaciones || 0)
      },
      conversionRates
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/performance/stats/tokko
// @desc    Obtener métricas específicas de Tokko CRM
// @access  Private (Admin)
router.get('/stats/tokko', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    // Obtener registros que tengan datos de Tokko
    const tokkoRecords = await prisma.performance.findMany({
      where: {
        ...where,
        OR: [
          { cantidadPropiedadesTokko: { not: null } },
          { dificultadTokko: { not: null } },
          { usoTokko: { not: null } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    // Calcular métricas de propiedades cargadas en Tokko
    const propiedadesStats = await prisma.performance.aggregate({
      where: {
        ...where,
        cantidadPropiedadesTokko: { not: null }
      },
      _sum: {
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _avg: {
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        cantidadPropiedadesTokko: true
      }
    });

    // Calcular métricas de dificultad de uso de Tokko
    const dificultadStats = await prisma.performance.groupBy({
      by: ['dificultadTokko'],
      where: {
        ...where,
        dificultadTokko: { not: null }
      },
      _count: {
        dificultadTokko: true
      }
    });

    // Calcular métricas de uso de Tokko (texto)
    const usoTokkoStats = await prisma.performance.groupBy({
      by: ['usoTokko'],
      where: {
        ...where,
        usoTokko: { not: null }
      },
      _count: {
        usoTokko: true
      }
    });

    // Obtener detalles de dificultades reportadas
    const dificultadesDetalladas = await prisma.performance.findMany({
      where: {
        ...where,
        dificultadTokko: true,
        detalleDificultadTokko: { not: null }
      },
      select: {
        detalleDificultadTokko: true,
        fecha: true,
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    // Calcular métricas por agente
    const agentesStats = await prisma.performance.groupBy({
      by: ['userId'],
      where: {
        ...where,
        OR: [
          { cantidadPropiedadesTokko: { not: null } },
          { dificultadTokko: { not: null } }
        ]
      },
      _sum: {
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });

    // Obtener información de usuarios para las estadísticas por agente
    const userIds = agentesStats.map(stat => stat.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });

    const agentesStatsWithNames = agentesStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      return {
        ...stat,
        user: user || { name: 'Usuario no encontrado', email: 'N/A' }
      };
    });

    // Procesar estadísticas de dificultad
    const dificultadResumen = {
      total: dificultadStats.reduce((sum, stat) => sum + stat._count.dificultadTokko, 0),
      si: dificultadStats.find(stat => stat.dificultadTokko === true)?._count.dificultadTokko || 0,
      no: dificultadStats.find(stat => stat.dificultadTokko === false)?._count.dificultadTokko || 0
    };

    // Calcular porcentajes de dificultad
    const porcentajeDificultad = {
      si: dificultadResumen.total > 0 ? Math.round((dificultadResumen.si / dificultadResumen.total) * 100) : 0,
      no: dificultadResumen.total > 0 ? Math.round((dificultadResumen.no / dificultadResumen.total) * 100) : 0
    };

    res.json({
      resumen: {
        totalRegistrosConTokko: tokkoRecords.length,
        totalPropiedadesCargadas: propiedadesStats._sum.cantidadPropiedadesTokko || 0,
        promedioPropiedadesPorRegistro: Math.round(propiedadesStats._avg.cantidadPropiedadesTokko || 0),
        totalRegistrosConPropiedades: propiedadesStats._count.cantidadPropiedadesTokko || 0
      },
      dificultadUso: {
        ...dificultadResumen,
        porcentajes: porcentajeDificultad
      },
      usoTokko: {
        totalRegistros: usoTokkoStats.reduce((sum, stat) => sum + stat._count.usoTokko, 0),
        distribucion: usoTokkoStats.map(stat => ({
          tipo: stat.usoTokko,
          cantidad: stat._count.usoTokko
        }))
      },
      dificultadesDetalladas: dificultadesDetalladas.map(d => ({
        detalle: d.detalleDificultadTokko,
        fecha: d.fecha,
        agente: d.user.name
      })),
      porAgente: agentesStatsWithNames.map(stat => ({
        agente: stat.user,
        totalPropiedades: stat._sum.cantidadPropiedadesTokko || 0,
        totalRegistros: stat._count.id
      })),
      registros: tokkoRecords.map(record => ({
        id: record.id,
        fecha: record.fecha,
        agente: record.user,
        cantidadPropiedades: record.cantidadPropiedadesTokko,
        dificultad: record.dificultadTokko,
        detalleDificultad: record.detalleDificultadTokko,
        usoTokko: record.usoTokko,
        observaciones: record.observaciones
      }))
    });
  } catch (error) {
    console.error('Error obteniendo métricas de Tokko:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/performance/stats/weekly
// @desc    Obtener métricas semanales generales
// @access  Private (Admin)
router.get('/stats/weekly', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date, weekNumber, year } = req.query;
    
    // Determinar la semana a analizar
    let weekRange;
    if (weekNumber && year) {
      weekRange = getWeekRangeByNumber(parseInt(year), parseInt(weekNumber));
    } else if (date) {
      weekRange = getWeekRange(new Date(date));
    } else {
      weekRange = getWeekRange(new Date()); // Semana actual
    }
    
    const previousWeekRange = getPreviousWeekRange(weekRange.start);
    
    // Obtener métricas de la semana actual
    const currentWeekStats = await prisma.performance.aggregate({
      where: {
        fecha: {
          gte: weekRange.start,
          lte: weekRange.end
        }
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _avg: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });
    
    // Obtener métricas de la semana anterior
    const previousWeekStats = await prisma.performance.aggregate({
      where: {
        fecha: {
          gte: previousWeekRange.start,
          lte: previousWeekRange.end
        }
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });
    
    // Obtener métricas de seguimiento
    const seguimientoStats = await prisma.performance.groupBy({
      by: ['seguimiento'],
      where: {
        fecha: {
          gte: weekRange.start,
          lte: weekRange.end
        }
      },
      _count: {
        seguimiento: true
      }
    });
    
    // Obtener métricas de dificultad Tokko
    const dificultadStats = await prisma.performance.groupBy({
      by: ['dificultadTokko'],
      where: {
        fecha: {
          gte: weekRange.start,
          lte: weekRange.end
        },
        dificultadTokko: { not: null }
      },
      _count: {
        dificultadTokko: true
      }
    });
    
    // Calcular porcentaje de seguimiento
    const totalSeguimiento = seguimientoStats.reduce((sum, stat) => sum + stat._count.seguimiento, 0);
    const seguimientoRealizado = seguimientoStats.find(stat => stat.seguimiento === true)?._count.seguimiento || 0;
    const porcentajeSeguimiento = totalSeguimiento > 0 ? Math.round((seguimientoRealizado / totalSeguimiento) * 100) : 0;
    
    // Calcular porcentaje de dificultad
    const totalDificultad = dificultadStats.reduce((sum, stat) => sum + stat._count.dificultadTokko, 0);
    const dificultadSi = dificultadStats.find(stat => stat.dificultadTokko === true)?._count.dificultadTokko || 0;
    const porcentajeDificultad = totalDificultad > 0 ? Math.round((dificultadSi / totalDificultad) * 100) : 0;
    
    // Calcular cambios vs semana anterior
    const cambios = {
      consultas: calculateChange(
        currentWeekStats._sum.consultasRecibidas || 0,
        previousWeekStats._sum.consultasRecibidas || 0
      ),
      muestras: calculateChange(
        currentWeekStats._sum.muestrasRealizadas || 0,
        previousWeekStats._sum.muestrasRealizadas || 0
      ),
      operaciones: calculateChange(
        currentWeekStats._sum.operacionesCerradas || 0,
        previousWeekStats._sum.operacionesCerradas || 0
      ),
      propiedades: calculateChange(
        currentWeekStats._sum.cantidadPropiedadesTokko || 0,
        previousWeekStats._sum.cantidadPropiedadesTokko || 0
      )
    };
    
    res.json({
      semana: {
        numero: getWeekNumber(weekRange.start),
        inicio: weekRange.start,
        fin: weekRange.end,
        inicioFormateado: formatDate(weekRange.start),
        finFormateado: formatDate(weekRange.end)
      },
      resumen: {
        totalRegistros: currentWeekStats._count.id || 0,
        consultasRecibidas: currentWeekStats._sum.consultasRecibidas || 0,
        muestrasRealizadas: currentWeekStats._sum.muestrasRealizadas || 0,
        operacionesCerradas: currentWeekStats._sum.operacionesCerradas || 0,
        propiedadesTokko: currentWeekStats._sum.cantidadPropiedadesTokko || 0,
        porcentajeSeguimiento,
        porcentajeDificultad
      },
      promedios: {
        consultasPorDia: Math.round((currentWeekStats._avg.consultasRecibidas || 0) * 7),
        muestrasPorDia: Math.round((currentWeekStats._avg.muestrasRealizadas || 0) * 7),
        operacionesPorDia: Math.round((currentWeekStats._avg.operacionesCerradas || 0) * 7),
        propiedadesPorDia: Math.round((currentWeekStats._avg.cantidadPropiedadesTokko || 0) * 7)
      },
      cambios,
      semanaAnterior: {
        inicio: previousWeekRange.start,
        fin: previousWeekRange.end,
        totalRegistros: previousWeekStats._count.id || 0,
        consultasRecibidas: previousWeekStats._sum.consultasRecibidas || 0,
        muestrasRealizadas: previousWeekStats._sum.muestrasRealizadas || 0,
        operacionesCerradas: previousWeekStats._sum.operacionesCerradas || 0,
        propiedadesTokko: previousWeekStats._sum.cantidadPropiedadesTokko || 0
      }
    });
  } catch (error) {
    console.error('Error obteniendo métricas semanales:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/performance/stats/weekly/agents
// @desc    Obtener métricas semanales por agente
// @access  Private (Admin)
router.get('/stats/weekly/agents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date, weekNumber, year } = req.query;
    
    // Determinar la semana a analizar
    let weekRange;
    if (weekNumber && year) {
      weekRange = getWeekRangeByNumber(parseInt(year), parseInt(weekNumber));
    } else if (date) {
      weekRange = getWeekRange(new Date(date));
    } else {
      weekRange = getWeekRange(new Date()); // Semana actual
    }
    
    const previousWeekRange = getPreviousWeekRange(weekRange.start);
    
    // Obtener métricas por agente de la semana actual
    const currentWeekAgentStats = await prisma.performance.groupBy({
      by: ['userId'],
      where: {
        fecha: {
          gte: weekRange.start,
          lte: weekRange.end
        }
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _avg: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });
    
    // Obtener métricas por agente de la semana anterior
    const previousWeekAgentStats = await prisma.performance.groupBy({
      by: ['userId'],
      where: {
        fecha: {
          gte: previousWeekRange.start,
          lte: previousWeekRange.end
        }
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });
    
    // Obtener información de usuarios
    const userIds = currentWeekAgentStats.map(stat => stat.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true }
    });
    
    // Combinar datos de agentes con información de usuarios
    const agentesConDatos = currentWeekAgentStats.map(currentStat => {
      const user = users.find(u => u.id === currentStat.userId);
      const previousStat = previousWeekAgentStats.find(p => p.userId === currentStat.userId);
      
      // Calcular cambios vs semana anterior
      const cambios = {
        consultas: calculateChange(
          currentStat._sum.consultasRecibidas || 0,
          previousStat?._sum.consultasRecibidas || 0
        ),
        muestras: calculateChange(
          currentStat._sum.muestrasRealizadas || 0,
          previousStat?._sum.muestrasRealizadas || 0
        ),
        operaciones: calculateChange(
          currentStat._sum.operacionesCerradas || 0,
          previousStat?._sum.operacionesCerradas || 0
        ),
        propiedades: calculateChange(
          currentStat._sum.cantidadPropiedadesTokko || 0,
          previousStat?._sum.cantidadPropiedadesTokko || 0
        )
      };
      
      return {
        agente: user || { id: currentStat.userId, name: 'Usuario no encontrado', email: 'N/A', role: 'agent' },
        semanaActual: {
          totalRegistros: currentStat._count.id,
          consultasRecibidas: currentStat._sum.consultasRecibidas || 0,
          muestrasRealizadas: currentStat._sum.muestrasRealizadas || 0,
          operacionesCerradas: currentStat._sum.operacionesCerradas || 0,
          propiedadesTokko: currentStat._sum.cantidadPropiedadesTokko || 0,
          promedioConsultas: Math.round(currentStat._avg.consultasRecibidas || 0),
          promedioMuestras: Math.round(currentStat._avg.muestrasRealizadas || 0),
          promedioOperaciones: Math.round(currentStat._avg.operacionesCerradas || 0),
          promedioPropiedades: Math.round(currentStat._avg.cantidadPropiedadesTokko || 0)
        },
        semanaAnterior: {
          totalRegistros: previousStat?._count.id || 0,
          consultasRecibidas: previousStat?._sum.consultasRecibidas || 0,
          muestrasRealizadas: previousStat?._sum.muestrasRealizadas || 0,
          operacionesCerradas: previousStat?._sum.operacionesCerradas || 0,
          propiedadesTokko: previousStat?._sum.cantidadPropiedadesTokko || 0
        },
        cambios
      };
    });
    
    // Ordenar por total de consultas (ranking)
    agentesConDatos.sort((a, b) => b.semanaActual.consultasRecibidas - a.semanaActual.consultasRecibidas);
    
    res.json({
      semana: {
        numero: getWeekNumber(weekRange.start),
        inicio: weekRange.start,
        fin: weekRange.end,
        inicioFormateado: formatDate(weekRange.start),
        finFormateado: formatDate(weekRange.end)
      },
      agentes: agentesConDatos,
      totalAgentes: agentesConDatos.length
    });
  } catch (error) {
    console.error('Error obteniendo métricas semanales por agente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/performance/stats/weekly/team
// @desc    Obtener métricas semanales consolidadas del equipo
// @access  Private (Admin)
router.get('/stats/weekly/team', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date, weekNumber, year } = req.query;
    
    // Determinar la semana a analizar
    let weekRange;
    if (weekNumber && year) {
      weekRange = getWeekRangeByNumber(parseInt(year), parseInt(weekNumber));
    } else if (date) {
      weekRange = getWeekRange(new Date(date));
    } else {
      weekRange = getWeekRange(new Date()); // Semana actual
    }
    
    const previousWeekRange = getPreviousWeekRange(weekRange.start);
    
    // Obtener métricas consolidadas de la semana actual
    const currentWeekStats = await prisma.performance.aggregate({
      where: {
        fecha: {
          gte: weekRange.start,
          lte: weekRange.end
        }
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _avg: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });
    
    // Obtener métricas consolidadas de la semana anterior
    const previousWeekStats = await prisma.performance.aggregate({
      where: {
        fecha: {
          gte: previousWeekRange.start,
          lte: previousWeekRange.end
        }
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });
    
    // Obtener métricas por agente para ranking
    const agentStats = await prisma.performance.groupBy({
      by: ['userId'],
      where: {
        fecha: {
          gte: weekRange.start,
          lte: weekRange.end
        }
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });
    
    // Obtener información de usuarios para el ranking
    const userIds = agentStats.map(stat => stat.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });
    
    // Crear ranking de agentes
    const ranking = agentStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      return {
        agente: user || { id: stat.userId, name: 'Usuario no encontrado', email: 'N/A' },
        consultas: stat._sum.consultasRecibidas || 0,
        muestras: stat._sum.muestrasRealizadas || 0,
        operaciones: stat._sum.operacionesCerradas || 0,
        propiedades: stat._sum.cantidadPropiedadesTokko || 0,
        registros: stat._count.id
      };
    }).sort((a, b) => b.consultas - a.consultas);
    
    // Calcular cambios vs semana anterior
    const cambios = {
      consultas: calculateChange(
        currentWeekStats._sum.consultasRecibidas || 0,
        previousWeekStats._sum.consultasRecibidas || 0
      ),
      muestras: calculateChange(
        currentWeekStats._sum.muestrasRealizadas || 0,
        previousWeekStats._sum.muestrasRealizadas || 0
      ),
      operaciones: calculateChange(
        currentWeekStats._sum.operacionesCerradas || 0,
        previousWeekStats._sum.operacionesCerradas || 0
      ),
      propiedades: calculateChange(
        currentWeekStats._sum.cantidadPropiedadesTokko || 0,
        previousWeekStats._sum.cantidadPropiedadesTokko || 0
      )
    };
    
    // Calcular tasas de conversión
    const totalConsultas = currentWeekStats._sum.consultasRecibidas || 0;
    const totalMuestras = currentWeekStats._sum.muestrasRealizadas || 0;
    const totalOperaciones = currentWeekStats._sum.operacionesCerradas || 0;
    
    const tasasConversion = {
      consultasToMuestras: totalConsultas > 0 ? Math.round((totalMuestras / totalConsultas) * 100) : 0,
      muestrasToOperaciones: totalMuestras > 0 ? Math.round((totalOperaciones / totalMuestras) * 100) : 0,
      consultasToOperaciones: totalConsultas > 0 ? Math.round((totalOperaciones / totalConsultas) * 100) : 0
    };
    
    res.json({
      semana: {
        numero: getWeekNumber(weekRange.start),
        inicio: weekRange.start,
        fin: weekRange.end,
        inicioFormateado: formatDate(weekRange.start),
        finFormateado: formatDate(weekRange.end)
      },
      equipo: {
        totalAgentes: ranking.length,
        totalRegistros: currentWeekStats._count.id || 0,
        consultasRecibidas: currentWeekStats._sum.consultasRecibidas || 0,
        muestrasRealizadas: currentWeekStats._sum.muestrasRealizadas || 0,
        operacionesCerradas: currentWeekStats._sum.operacionesCerradas || 0,
        propiedadesTokko: currentWeekStats._sum.cantidadPropiedadesTokko || 0,
        promedioPorAgente: {
          consultas: Math.round((currentWeekStats._avg.consultasRecibidas || 0) * ranking.length),
          muestras: Math.round((currentWeekStats._avg.muestrasRealizadas || 0) * ranking.length),
          operaciones: Math.round((currentWeekStats._avg.operacionesCerradas || 0) * ranking.length),
          propiedades: Math.round((currentWeekStats._avg.cantidadPropiedadesTokko || 0) * ranking.length)
        }
      },
      tasasConversion,
      cambios,
      ranking: ranking.slice(0, 10), // Top 10 agentes
      semanaAnterior: {
        totalRegistros: previousWeekStats._count.id || 0,
        consultasRecibidas: previousWeekStats._sum.consultasRecibidas || 0,
        muestrasRealizadas: previousWeekStats._sum.muestrasRealizadas || 0,
        operacionesCerradas: previousWeekStats._sum.operacionesCerradas || 0,
        propiedadesTokko: previousWeekStats._sum.cantidadPropiedadesTokko || 0
      }
    });
  } catch (error) {
    console.error('Error obteniendo métricas semanales del equipo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/performance/stats/weekly/export
// @desc    Obtener datos para exportación PDF de métricas semanales
// @access  Private (Admin)
router.get('/stats/weekly/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date, weekNumber, year, format = 'pdf' } = req.query;
    
    // Determinar la semana a analizar
    let weekRange;
    if (weekNumber && year) {
      weekRange = getWeekRangeByNumber(parseInt(year), parseInt(weekNumber));
    } else if (date) {
      weekRange = getWeekRange(new Date(date));
    } else {
      weekRange = getWeekRange(new Date()); // Semana actual
    }
    
    // Obtener métricas generales
    const generalStats = await prisma.performance.aggregate({
      where: {
        fecha: {
          gte: weekRange.start,
          lte: weekRange.end
        }
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });
    
    // Obtener métricas por agente
    const agentStats = await prisma.performance.groupBy({
      by: ['userId'],
      where: {
        fecha: {
          gte: weekRange.start,
          lte: weekRange.end
        }
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        cantidadPropiedadesTokko: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });
    
    // Obtener información de usuarios
    const userIds = agentStats.map(stat => stat.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });
    
    // Preparar datos para exportación
    const exportData = {
      metadata: {
        semana: {
          numero: getWeekNumber(weekRange.start),
          inicio: weekRange.start,
          fin: weekRange.end,
          inicioFormateado: formatDate(weekRange.start),
          finFormateado: formatDate(weekRange.end)
        },
        generado: new Date(),
        formato: format
      },
      resumen: {
        totalRegistros: generalStats._count.id || 0,
        consultasRecibidas: generalStats._sum.consultasRecibidas || 0,
        muestrasRealizadas: generalStats._sum.muestrasRealizadas || 0,
        operacionesCerradas: generalStats._sum.operacionesCerradas || 0,
        propiedadesTokko: generalStats._sum.cantidadPropiedadesTokko || 0
      },
      agentes: agentStats.map(stat => {
        const user = users.find(u => u.id === stat.userId);
        return {
          agente: user || { name: 'Usuario no encontrado', email: 'N/A' },
          consultas: stat._sum.consultasRecibidas || 0,
          muestras: stat._sum.muestrasRealizadas || 0,
          operaciones: stat._sum.operacionesCerradas || 0,
          propiedades: stat._sum.cantidadPropiedadesTokko || 0,
          registros: stat._count.id
        };
      }).sort((a, b) => b.consultas - a.consultas)
    };
    
    if (format === 'json') {
      res.json(exportData);
    } else {
      // Para PDF, devolver datos estructurados que el frontend puede usar
      res.json({
        success: true,
        data: exportData,
        message: 'Datos listos para generación de PDF',
        instructions: {
          frontend: 'Usar estos datos con una librería como jsPDF o react-pdf',
          campos: [
            'metadata.semana - Información de la semana',
            'resumen - Métricas generales del equipo',
            'agentes - Lista de agentes con sus métricas'
          ]
        }
      });
    }
  } catch (error) {
    console.error('Error obteniendo datos para exportación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
