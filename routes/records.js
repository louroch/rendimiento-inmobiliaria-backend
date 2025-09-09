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
        operacionesCerradas: true
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
        operacionesCerradas: true
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
        operacionesCerradas: true
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

module.exports = router;
