const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

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
  body('observaciones').optional({ nullable: true, checkFalsy: true }).isString().trim()
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
        observaciones: observaciones && observaciones.trim() ? observaciones.trim() : null
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
// @desc    Obtener registro de desempeño por ID
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
            email: true
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

    res.json({ performance });
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
        operacionesCerradas: true
      },
      _avg: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true
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
        operacionesCerradas: stats._sum.operacionesCerradas || 0
      },
      averages: {
        consultasRecibidas: Math.round(stats._avg.consultasRecibidas || 0),
        muestrasRealizadas: Math.round(stats._avg.muestrasRealizadas || 0),
        operacionesCerradas: Math.round(stats._avg.operacionesCerradas || 0)
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
        cantidadPropiedadesTokko: true
      },
      _avg: {
        cantidadPropiedadesTokko: true
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
        cantidadPropiedadesTokko: true
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

module.exports = router;
