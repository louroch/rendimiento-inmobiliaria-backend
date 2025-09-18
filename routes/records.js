const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/records
// @desc    Crear nuevo registro de desempeño (solo agentes)
// @access  Private (Agent)
router.post('/', [
  authenticateToken,
  requireRole('agent'),
  body('fecha').isISO8601().withMessage('Fecha válida requerida'),
  body('consultasRecibidas').isInt({ min: 0 }).withMessage('Consultas recibidas debe ser un número entero positivo'),
  body('muestrasRealizadas').isInt({ min: 0 }).withMessage('Muestras realizadas debe ser un número entero positivo'),
  body('operacionesCerradas').isInt({ min: 0 }).withMessage('Operaciones cerradas debe ser un número entero positivo'),
  body('seguimiento').isBoolean().withMessage('Seguimiento debe ser un valor booleano'),
  body('usoTokko').optional().isString().withMessage('Uso de Tokko debe ser texto')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { fecha, consultasRecibidas, muestrasRealizadas, operacionesCerradas, seguimiento, usoTokko } = req.body;

    const record = await prisma.performance.create({
      data: {
        userId: req.user.id,
        fecha: new Date(fecha),
        consultasRecibidas: parseInt(consultasRecibidas),
        muestrasRealizadas: parseInt(muestrasRealizadas),
        operacionesCerradas: parseInt(operacionesCerradas),
        seguimiento: seguimiento === true || seguimiento === 'true',
        usoTokko: usoTokko || ''
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
      message: 'Registro creado exitosamente',
      record
    });

  } catch (error) {
    console.error('Error creando registro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/records
// @desc    Obtener todos los registros (solo admin)
// @access  Private (Admin)
router.get('/', [
  authenticateToken,
  requireRole('admin')
], async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construir filtros
    const where = {};
    
    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) {
        where.fecha.gte = new Date(startDate);
      }
      if (endDate) {
        where.fecha.lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      prisma.performance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { fecha: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.performance.count({ where })
    ]);

    // Calcular estadísticas
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
        operacionesCerradas: true
      }
    });

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        totalConsultas: stats._sum.consultasRecibidas || 0,
        totalMuestras: stats._sum.muestrasRealizadas || 0,
        totalOperaciones: stats._sum.operacionesCerradas || 0,
        promedioConsultas: Math.round(stats._avg.consultasRecibidas || 0),
        promedioMuestras: Math.round(stats._avg.muestrasRealizadas || 0),
        promedioOperaciones: Math.round(stats._avg.operacionesCerradas || 0)
      }
    });

  } catch (error) {
    console.error('Error obteniendo registros:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/records/stats
// @desc    Obtener estadísticas generales (solo admin)
// @access  Private (Admin)
router.get('/stats', [
  authenticateToken,
  requireRole('admin')
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) {
        where.fecha.gte = new Date(startDate);
      }
      if (endDate) {
        where.fecha.lte = new Date(endDate);
      }
    }

    // Estadísticas generales
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
        operacionesCerradas: true
      },
      _count: {
        id: true
      }
    });

    // Estadísticas por agente
    const agentStats = await prisma.performance.groupBy({
      by: ['userId'],
      where,
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
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

    const agentStatsWithNames = agentStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      return {
        ...stat,
        user: user || { name: 'Usuario no encontrado', email: 'N/A' }
      };
    });

    // Calcular tasas de conversión
    const totalConsultas = stats._sum.consultasRecibidas || 0;
    const totalMuestras = stats._sum.muestrasRealizadas || 0;
    const totalOperaciones = stats._sum.operacionesCerradas || 0;

    const conversionRates = {
      consultasToMuestras: totalConsultas > 0 ? Math.round((totalMuestras / totalConsultas) * 100) : 0,
      muestrasToOperaciones: totalMuestras > 0 ? Math.round((totalOperaciones / totalMuestras) * 100) : 0,
      consultasToOperaciones: totalConsultas > 0 ? Math.round((totalOperaciones / totalConsultas) * 100) : 0
    };

    res.json({
      general: {
        totalRegistros: stats._count.id || 0,
        totalConsultas,
        totalMuestras,
        totalOperaciones,
        promedioConsultas: Math.round(stats._avg.consultasRecibidas || 0),
        promedioMuestras: Math.round(stats._avg.muestrasRealizadas || 0),
        promedioOperaciones: Math.round(stats._avg.operacionesCerradas || 0),
        conversionRates
      },
      porAgente: agentStatsWithNames
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/records/stats/tokko
// @desc    Obtener métricas específicas de Tokko CRM (solo admin)
// @access  Private (Admin)
router.get('/stats/tokko', [
  authenticateToken,
  requireRole('admin')
], async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    const where = {};
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    // Obtener registros con datos de Tokko
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

    // Calcular métricas de propiedades cargadas
    const propiedadesStats = await prisma.performance.aggregate({
      where: {
        ...where,
        cantidadPropiedadesTokko: { not: null }
      },
      _sum: {
        cantidadPropiedadesTokko: true
      },
      _avg: {
        cantidadPropiedadesTokko: true
      },
      _count: {
        cantidadPropiedadesTokko: true
      }
    });

    // Calcular métricas de dificultad
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

    // Calcular métricas de uso de Tokko
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

    // Obtener detalles de dificultades
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

    // Procesar estadísticas de dificultad
    const dificultadResumen = {
      total: dificultadStats.reduce((sum, stat) => sum + stat._count.dificultadTokko, 0),
      si: dificultadStats.find(stat => stat.dificultadTokko === true)?._count.dificultadTokko || 0,
      no: dificultadStats.find(stat => stat.dificultadTokko === false)?._count.dificultadTokko || 0
    };

    // Calcular porcentajes
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

module.exports = router;
