const express = require('express');
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

// Función para calcular score adaptativo según tipo de agente
function calculateAgentScore(agent, stats) {
  const isSinMuestras = agent.email === 'agente3@inmobiliaria.com' || 
                       agent.email === 'agente4@inmobiliaria.com';
  
  if (isSinMuestras) {
    // Para agentes sin muestras: consultas + captaciones (con más peso a captaciones)
    return (stats.consultasRecibidas || 0) + (stats.numeroCaptaciones || 0) * 2;
  }
  
  // Para agentes normales: operaciones + muestras + consultas (con más peso a operaciones)
  return (stats.operacionesCerradas || 0) * 3 + (stats.muestrasRealizadas || 0) * 2 + (stats.consultasRecibidas || 0);
}

// @route   GET /api/reports/dashboard
// @desc    Dashboard principal de reportes con métricas clave
// @access  Private (Admin)
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    // Obtener métricas generales
    const generalStats = await prisma.performance.aggregate({
      where,
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true,
        cantidadPropiedadesTokko: true
      },
      _avg: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });

    // Obtener métricas por agente
    const agentStats = await prisma.performance.groupBy({
      by: ['userId'],
      where,
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true,
        cantidadPropiedadesTokko: true
      },
      _count: {
        id: true
      }
    });

    // Obtener información de usuarios
    const userIds = agentStats.map(stat => stat.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true }
    });

    // Procesar datos de agentes
    const agentesConDatos = agentStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      const stats = {
        consultasRecibidas: stat._sum.consultasRecibidas || 0,
        muestrasRealizadas: stat._sum.muestrasRealizadas || 0,
        operacionesCerradas: stat._sum.operacionesCerradas || 0,
        numeroCaptaciones: stat._sum.numeroCaptaciones || 0,
        cantidadPropiedadesTokko: stat._sum.cantidadPropiedadesTokko || 0,
        totalRegistros: stat._count.id
      };

      // Calcular tasas de conversión
      const conversionRates = {
        consultasToMuestras: stats.consultasRecibidas > 0 
          ? ((stats.muestrasRealizadas / stats.consultasRecibidas) * 100).toFixed(1)
          : 0,
        muestrasToOperaciones: stats.muestrasRealizadas > 0 
          ? ((stats.operacionesCerradas / stats.muestrasRealizadas) * 100).toFixed(1)
          : 0
      };

      return {
        agente: user || { id: stat.userId, name: 'Usuario no encontrado', email: 'N/A', role: 'agent' },
        ...stats,
        conversionRates,
        score: calculateAgentScore(user || { email: 'unknown' }, stats)
      };
    });

    // Calcular rankings
    const rankings = {
      captaciones: [...agentesConDatos].sort((a, b) => b.numeroCaptaciones - a.numeroCaptaciones),
      muestras: [...agentesConDatos].sort((a, b) => b.muestrasRealizadas - a.muestrasRealizadas),
      operaciones: [...agentesConDatos].sort((a, b) => b.operacionesCerradas - a.operacionesCerradas),
      conversionConsultas: [...agentesConDatos].sort((a, b) => parseFloat(b.conversionRates.consultasToMuestras) - parseFloat(a.conversionRates.consultasToMuestras)),
      conversionMuestras: [...agentesConDatos].sort((a, b) => parseFloat(b.conversionRates.muestrasToOperaciones) - parseFloat(a.conversionRates.muestrasToOperaciones)),
      scoreGeneral: [...agentesConDatos].sort((a, b) => b.score - a.score)
    };

    // Calcular métricas del equipo
    const totalConsultas = generalStats._sum.consultasRecibidas || 0;
    const totalMuestras = generalStats._sum.muestrasRealizadas || 0;
    const totalOperaciones = generalStats._sum.operacionesCerradas || 0;
    const totalCaptaciones = generalStats._sum.numeroCaptaciones || 0;

    const teamMetrics = {
      totalAgentes: agentesConDatos.length,
      totalRegistros: generalStats._count.id || 0,
      totalConsultas,
      totalMuestras,
      totalOperaciones,
      totalCaptaciones,
      totalPropiedadesTokko: generalStats._sum.cantidadPropiedadesTokko || 0,
      conversionRates: {
        consultasToMuestras: totalConsultas > 0 ? ((totalMuestras / totalConsultas) * 100).toFixed(1) : 0,
        muestrasToOperaciones: totalMuestras > 0 ? ((totalOperaciones / totalMuestras) * 100).toFixed(1) : 0
      },
      promedios: {
        consultasPorAgente: Math.round((generalStats._avg.consultasRecibidas || 0) * agentesConDatos.length),
        muestrasPorAgente: Math.round((generalStats._avg.muestrasRealizadas || 0) * agentesConDatos.length),
        operacionesPorAgente: Math.round((generalStats._avg.operacionesCerradas || 0) * agentesConDatos.length),
        captacionesPorAgente: Math.round((generalStats._avg.numeroCaptaciones || 0) * agentesConDatos.length)
      }
    };

    res.json({
      success: true,
      teamMetrics,
      rankings: {
        captaciones: rankings.captaciones.slice(0, 5),
        muestras: rankings.muestras.slice(0, 5),
        operaciones: rankings.operaciones.slice(0, 5),
        conversionConsultas: rankings.conversionConsultas.slice(0, 5),
        conversionMuestras: rankings.conversionMuestras.slice(0, 5),
        scoreGeneral: rankings.scoreGeneral.slice(0, 5)
      },
      allAgents: agentesConDatos,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo dashboard de reportes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor' 
    });
  }
});

// @route   GET /api/reports/agent-performance/:agentId
// @desc    Análisis detallado de rendimiento de un agente específico
// @access  Private (Admin)
router.get('/agent-performance/:agentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate, includeWeekly = true } = req.query;
    
    const where = { userId: agentId };
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    // Obtener datos del agente
    const agentData = await prisma.performance.findMany({
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
      orderBy: {
        fecha: 'desc'
      }
    });

    if (agentData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos para este agente'
      });
    }

    const agent = agentData[0].user;

    // Calcular métricas del agente
    const totalConsultas = agentData.reduce((sum, p) => sum + p.consultasRecibidas, 0);
    const totalMuestras = agentData.reduce((sum, p) => sum + p.muestrasRealizadas, 0);
    const totalOperaciones = agentData.reduce((sum, p) => sum + p.operacionesCerradas, 0);
    const totalCaptaciones = agentData.reduce((sum, p) => sum + (p.numeroCaptaciones || 0), 0);
    const totalSeguimiento = agentData.filter(p => p.seguimiento).length;
    const totalPropiedadesTokko = agentData.reduce((sum, p) => sum + (p.cantidadPropiedadesTokko || 0), 0);
    const totalDificultades = agentData.filter(p => p.dificultadTokko === true).length;

    const agentMetrics = {
      totalRegistros: agentData.length,
      totalConsultas,
      totalMuestras,
      totalOperaciones,
      totalCaptaciones,
      totalPropiedadesTokko,
      totalSeguimiento,
      totalDificultades,
      conversionRates: {
        consultasToMuestras: totalConsultas > 0 ? ((totalMuestras / totalConsultas) * 100).toFixed(1) : 0,
        muestrasToOperaciones: totalMuestras > 0 ? ((totalOperaciones / totalMuestras) * 100).toFixed(1) : 0
      },
      percentages: {
        seguimiento: agentData.length > 0 ? ((totalSeguimiento / agentData.length) * 100).toFixed(1) : 0,
        dificultades: agentData.length > 0 ? ((totalDificultades / agentData.length) * 100).toFixed(1) : 0
      },
      promedios: {
        consultasPorRegistro: (totalConsultas / agentData.length).toFixed(1),
        muestrasPorRegistro: (totalMuestras / agentData.length).toFixed(1),
        operacionesPorRegistro: (totalOperaciones / agentData.length).toFixed(1),
        captacionesPorRegistro: (totalCaptaciones / agentData.length).toFixed(1)
      }
    };

    // Análisis semanal si se solicita
    let weeklyAnalysis = null;
    if (includeWeekly === 'true') {
      const currentWeek = getWeekRange(new Date());
      const previousWeek = getPreviousWeekRange(currentWeek.start);

      const currentWeekData = agentData.filter(p => 
        p.fecha >= currentWeek.start && p.fecha <= currentWeek.end
      );
      const previousWeekData = agentData.filter(p => 
        p.fecha >= previousWeek.start && p.fecha <= previousWeek.end
      );

      const currentWeekStats = {
        consultas: currentWeekData.reduce((sum, p) => sum + p.consultasRecibidas, 0),
        muestras: currentWeekData.reduce((sum, p) => sum + p.muestrasRealizadas, 0),
        operaciones: currentWeekData.reduce((sum, p) => sum + p.operacionesCerradas, 0),
        captaciones: currentWeekData.reduce((sum, p) => sum + (p.numeroCaptaciones || 0), 0)
      };

      const previousWeekStats = {
        consultas: previousWeekData.reduce((sum, p) => sum + p.consultasRecibidas, 0),
        muestras: previousWeekData.reduce((sum, p) => sum + p.muestrasRealizadas, 0),
        operaciones: previousWeekData.reduce((sum, p) => sum + p.operacionesCerradas, 0),
        captaciones: previousWeekData.reduce((sum, p) => sum + (p.numeroCaptaciones || 0), 0)
      };

      weeklyAnalysis = {
        currentWeek: {
          ...currentWeekStats,
          registros: currentWeekData.length
        },
        previousWeek: {
          ...previousWeekStats,
          registros: previousWeekData.length
        },
        changes: {
          consultas: calculateChange(currentWeekStats.consultas, previousWeekStats.consultas),
          muestras: calculateChange(currentWeekStats.muestras, previousWeekStats.muestras),
          operaciones: calculateChange(currentWeekStats.operaciones, previousWeekStats.operaciones),
          captaciones: calculateChange(currentWeekStats.captaciones, previousWeekStats.captaciones)
        }
      };
    }

    // Obtener ranking del agente vs otros
    const allAgentStats = await prisma.performance.groupBy({
      by: ['userId'],
      where: {
        fecha: where.fecha || {}
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true
      }
    });

    const allUsers = await prisma.user.findMany({
      where: { id: { in: allAgentStats.map(s => s.userId) } },
      select: { id: true, name: true, email: true }
    });

    const allAgentsWithStats = allAgentStats.map(stat => {
      const user = allUsers.find(u => u.id === stat.userId);
      const stats = {
        consultasRecibidas: stat._sum.consultasRecibidas || 0,
        muestrasRealizadas: stat._sum.muestrasRealizadas || 0,
        operacionesCerradas: stat._sum.operacionesCerradas || 0,
        numeroCaptaciones: stat._sum.numeroCaptaciones || 0
      };
      return {
        agente: user || { id: stat.userId, name: 'Usuario no encontrado', email: 'N/A' },
        ...stats,
        score: calculateAgentScore(user || { email: 'unknown' }, stats)
      };
    });

    const agentRanking = allAgentsWithStats
      .sort((a, b) => b.score - a.score)
      .findIndex(a => a.agente.id === agentId) + 1;

    res.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role
      },
      metrics: agentMetrics,
      weeklyAnalysis,
      ranking: {
        position: agentRanking,
        totalAgents: allAgentsWithStats.length
      },
      recentRecords: agentData.slice(0, 10).map(record => ({
        id: record.id,
        fecha: record.fecha,
        consultasRecibidas: record.consultasRecibidas,
        muestrasRealizadas: record.muestrasRealizadas,
        operacionesCerradas: record.operacionesCerradas,
        numeroCaptaciones: record.numeroCaptaciones,
        seguimiento: record.seguimiento,
        usoTokko: record.usoTokko,
        observaciones: record.observaciones
      }))
    });

  } catch (error) {
    console.error('Error obteniendo análisis de agente:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor' 
    });
  }
});

// @route   GET /api/reports/trends
// @desc    Análisis de tendencias y comparaciones temporales
// @access  Private (Admin)
router.get('/trends', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { weeks = 4, startDate, endDate } = req.query;
    
    // Determinar el rango de fechas
    let endRange = endDate ? new Date(endDate) : new Date();
    let startRange = startDate ? new Date(startDate) : new Date();
    
    if (!startDate) {
      startRange.setDate(startRange.getDate() - (parseInt(weeks) * 7));
    }

    // Obtener datos por semana
    const weeklyData = [];
    for (let i = 0; i < parseInt(weeks); i++) {
      const weekEnd = new Date(endRange);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekRange = getWeekRange(weekEnd);
      
      const weekStats = await prisma.performance.aggregate({
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
          numeroCaptaciones: true,
          cantidadPropiedadesTokko: true
        },
        _count: {
          id: true
        }
      });

      weeklyData.unshift({
        weekNumber: getWeekNumber(weekRange.start),
        startDate: weekRange.start,
        endDate: weekRange.end,
        startFormatted: formatDate(weekRange.start),
        endFormatted: formatDate(weekRange.end),
        metrics: {
          totalRegistros: weekStats._count.id || 0,
          consultasRecibidas: weekStats._sum.consultasRecibidas || 0,
          muestrasRealizadas: weekStats._sum.muestrasRealizadas || 0,
          operacionesCerradas: weekStats._sum.operacionesCerradas || 0,
          numeroCaptaciones: weekStats._sum.numeroCaptaciones || 0,
          propiedadesTokko: weekStats._sum.cantidadPropiedadesTokko || 0
        }
      });
    }

    // Calcular tendencias
    const trends = {
      consultas: calculateTrend(weeklyData.map(w => w.metrics.consultasRecibidas)),
      muestras: calculateTrend(weeklyData.map(w => w.metrics.muestrasRealizadas)),
      operaciones: calculateTrend(weeklyData.map(w => w.metrics.operacionesCerradas)),
      captaciones: calculateTrend(weeklyData.map(w => w.metrics.numeroCaptaciones)),
      propiedades: calculateTrend(weeklyData.map(w => w.metrics.propiedadesTokko))
    };

    // Obtener top performers por semana
    const currentWeek = weeklyData[weeklyData.length - 1];
    const currentWeekAgentStats = await prisma.performance.groupBy({
      by: ['userId'],
      where: {
        fecha: {
          gte: currentWeek.startDate,
          lte: currentWeek.endDate
        }
      },
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true
      }
    });

    const userIds = currentWeekAgentStats.map(stat => stat.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });

    const topPerformers = currentWeekAgentStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      const stats = {
        consultasRecibidas: stat._sum.consultasRecibidas || 0,
        muestrasRealizadas: stat._sum.muestrasRealizadas || 0,
        operacionesCerradas: stat._sum.operacionesCerradas || 0,
        numeroCaptaciones: stat._sum.numeroCaptaciones || 0
      };
      return {
        agente: user || { id: stat.userId, name: 'Usuario no encontrado', email: 'N/A' },
        ...stats,
        score: calculateAgentScore(user || { email: 'unknown' }, stats)
      };
    }).sort((a, b) => b.score - a.score).slice(0, 3);

    res.json({
      success: true,
      period: {
        weeks: parseInt(weeks),
        startDate: startRange,
        endDate: endRange
      },
      weeklyData,
      trends,
      topPerformersCurrentWeek: topPerformers
    });

  } catch (error) {
    console.error('Error obteniendo tendencias:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor' 
    });
  }
});

// @route   GET /api/reports/export
// @desc    Datos para exportación de reportes (JSON, PDF)
// @access  Private (Admin)
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json', templateType = 'dashboard' } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    // Obtener datos completos
    const performanceData = await prisma.performance.findMany({
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
      orderBy: {
        fecha: 'desc'
      }
    });

    // Obtener métricas por agente
    const agentStats = await prisma.performance.groupBy({
      by: ['userId'],
      where,
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true,
        cantidadPropiedadesTokko: true
      },
      _count: {
        id: true
      }
    });

    const userIds = agentStats.map(stat => stat.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true }
    });

    const agentesConDatos = agentStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      const stats = {
        consultasRecibidas: stat._sum.consultasRecibidas || 0,
        muestrasRealizadas: stat._sum.muestrasRealizadas || 0,
        operacionesCerradas: stat._sum.operacionesCerradas || 0,
        numeroCaptaciones: stat._sum.numeroCaptaciones || 0,
        cantidadPropiedadesTokko: stat._sum.cantidadPropiedadesTokko || 0,
        totalRegistros: stat._count.id
      };

      const conversionRates = {
        consultasToMuestras: stats.consultasRecibidas > 0 
          ? ((stats.muestrasRealizadas / stats.consultasRecibidas) * 100).toFixed(1)
          : 0,
        muestrasToOperaciones: stats.muestrasRealizadas > 0 
          ? ((stats.operacionesCerradas / stats.muestrasRealizadas) * 100).toFixed(1)
          : 0
      };

      return {
        agente: user || { id: stat.userId, name: 'Usuario no encontrado', email: 'N/A', role: 'agent' },
        ...stats,
        conversionRates,
        score: calculateAgentScore(user || { email: 'unknown' }, stats)
      };
    }).sort((a, b) => b.score - a.score);

    const exportData = {
      metadata: {
        generated: new Date(),
        format,
        period: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        totalRecords: performanceData.length,
        totalAgents: agentesConDatos.length
      },
      summary: {
        totalConsultas: agentesConDatos.reduce((sum, a) => sum + a.consultasRecibidas, 0),
        totalMuestras: agentesConDatos.reduce((sum, a) => sum + a.muestrasRealizadas, 0),
        totalOperaciones: agentesConDatos.reduce((sum, a) => sum + a.operacionesCerradas, 0),
        totalCaptaciones: agentesConDatos.reduce((sum, a) => sum + a.numeroCaptaciones, 0),
        totalPropiedadesTokko: agentesConDatos.reduce((sum, a) => sum + a.cantidadPropiedadesTokko, 0)
      },
      rankings: {
        captaciones: agentesConDatos.sort((a, b) => b.numeroCaptaciones - a.numeroCaptaciones),
        muestras: agentesConDatos.sort((a, b) => b.muestrasRealizadas - a.muestrasRealizadas),
        operaciones: agentesConDatos.sort((a, b) => b.operacionesCerradas - a.operacionesCerradas),
        scoreGeneral: agentesConDatos
      },
      agents: agentesConDatos,
      records: performanceData.map(record => ({
        id: record.id,
        fecha: record.fecha,
        agente: {
          name: record.user.name,
          email: record.user.email
        },
        consultasRecibidas: record.consultasRecibidas,
        muestrasRealizadas: record.muestrasRealizadas,
        operacionesCerradas: record.operacionesCerradas,
        numeroCaptaciones: record.numeroCaptaciones,
        seguimiento: record.seguimiento,
        usoTokko: record.usoTokko,
        cantidadPropiedadesTokko: record.cantidadPropiedadesTokko,
        dificultadTokko: record.dificultadTokko,
        observaciones: record.observaciones
      }))
    };

    if (format === 'pdf') {
      try {
        const { generatePDFFromTemplate } = require('../utils/pdfGenerator');
        
        // Preparar datos para el template
        const templateData = {
          ...exportData,
          period: startDate && endDate 
            ? `${new Date(startDate).toLocaleDateString('es-ES')} - ${new Date(endDate).toLocaleDateString('es-ES')}`
            : 'Todos los registros'
        };
        
        const pdfBuffer = await generatePDFFromTemplate(templateData, templateType);
        
        // Configurar headers para descarga
        const filename = `reporte-${templateType}-${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.send(pdfBuffer);
        
      } catch (pdfError) {
        console.error('Error generando PDF:', pdfError);
        res.status(500).json({
          success: false,
          message: 'Error generando PDF',
          error: process.env.NODE_ENV === 'development' ? pdfError.message : 'Error interno'
        });
      }
    } else if (format === 'json') {
      res.json(exportData);
    } else {
      res.json({
        success: true,
        data: exportData,
        message: 'Datos listos para exportación',
        instructions: {
          frontend: 'Usar estos datos con librerías como jsPDF, xlsx, o react-pdf',
          availableFormats: ['pdf', 'json', 'excel', 'csv'],
          templateTypes: ['dashboard', 'agent-performance', 'trends', 'summary'],
          fields: [
            'metadata - Información del reporte',
            'summary - Resumen general',
            'rankings - Rankings por métrica',
            'agents - Datos detallados por agente',
            'records - Registros individuales'
          ]
        }
      });
    }

  } catch (error) {
    console.error('Error exportando reportes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor' 
    });
  }
});

// Función auxiliar para calcular tendencias
function calculateTrend(values) {
  if (values.length < 2) return { direction: 'neutral', percentage: 0 };
  
  const first = values[0];
  const last = values[values.length - 1];
  
  if (first === 0) {
    return {
      direction: last > 0 ? 'up' : 'neutral',
      percentage: last > 0 ? 100 : 0
    };
  }
  
  const percentage = Math.round(((last - first) / first) * 100);
  const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
  
  return {
    direction,
    percentage: Math.abs(percentage)
  };
}

module.exports = router;
