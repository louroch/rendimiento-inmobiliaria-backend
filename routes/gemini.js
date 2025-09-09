const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { prisma } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Inicializar Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @route   POST /api/gemini/recommendations
// @desc    Generar recomendaciones basadas en datos de desempeño
// @access  Private (Admin)
router.post('/recommendations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        message: 'API de Gemini no configurada' 
      });
    }

    // Obtener datos de desempeño
    const where = {};
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    const performanceData = await prisma.performance.findMany({
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
      take: 30 // Últimos 30 registros
    });

    if (performanceData.length === 0) {
      return res.json({
        recommendations: ['No hay datos suficientes para generar recomendaciones'],
        data: performanceData
      });
    }

    // Calcular métricas
    const totalConsultas = performanceData.reduce((sum, p) => sum + p.consultasRecibidas, 0);
    const totalMuestras = performanceData.reduce((sum, p) => sum + p.muestrasRealizadas, 0);
    const totalOperaciones = performanceData.reduce((sum, p) => sum + p.operacionesCerradas, 0);
    const totalSeguimiento = performanceData.filter(p => p.seguimiento).length;

    const conversionRates = {
      consultasToMuestras: totalConsultas > 0 ? (totalMuestras / totalConsultas * 100).toFixed(2) : 0,
      muestrasToOperaciones: totalMuestras > 0 ? (totalOperaciones / totalMuestras * 100).toFixed(2) : 0
    };

    // Preparar prompt para Gemini
    const prompt = `
Analiza los siguientes datos de desempeño inmobiliario y proporciona recomendaciones específicas y accionables:

DATOS DE DESEMPEÑO:
- Total de consultas recibidas: ${totalConsultas}
- Total de muestras realizadas: ${totalMuestras}
- Total de operaciones cerradas: ${totalOperaciones}
- Registros con seguimiento: ${totalSeguimiento}/${performanceData.length}
- Tasa de conversión consultas → muestras: ${conversionRates.consultasToMuestras}%
- Tasa de conversión muestras → operaciones: ${conversionRates.muestrasToOperaciones}%

DETALLES POR ASESOR:
${performanceData.map(p => `
- ${p.user.name}: ${p.consultasRecibidas} consultas, ${p.muestrasRealizadas} muestras, ${p.operacionesCerradas} operaciones, seguimiento: ${p.seguimiento ? 'Sí' : 'No'}
`).join('')}

Por favor, proporciona:
1. 3-5 recomendaciones específicas para mejorar el desempeño
2. Identifica fortalezas y áreas de mejora
3. Sugiere estrategias concretas para aumentar las conversiones
4. Recomendaciones sobre el uso del CRM Tokko
5. Consejos para mejorar el seguimiento de clientes

Responde en español, de forma clara y profesional, enfocándote en acciones prácticas.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const recommendations = response.text();

    res.json({
      recommendations: recommendations.split('\n').filter(line => line.trim()),
      metrics: {
        totalConsultas,
        totalMuestras,
        totalOperaciones,
        totalSeguimiento,
        conversionRates
      },
      data: performanceData.slice(0, 10) // Solo los primeros 10 registros para la respuesta
    });

  } catch (error) {
    console.error('Error generando recomendaciones:', error);
    res.status(500).json({ 
      message: 'Error generando recomendaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

// @route   POST /api/gemini/advisor-recommendations
// @desc    Generar recomendaciones específicas para un asesor
// @access  Private
router.post('/advisor-recommendations', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        message: 'API de Gemini no configurada' 
      });
    }

    // Obtener datos del asesor actual
    const where = { userId: req.user.id };
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    const performanceData = await prisma.performance.findMany({
      where,
      orderBy: {
        fecha: 'desc'
      },
      take: 20 // Últimos 20 registros del asesor
    });

    if (performanceData.length === 0) {
      return res.json({
        recommendations: ['No hay datos suficientes para generar recomendaciones personalizadas'],
        data: performanceData
      });
    }

    // Calcular métricas personales
    const totalConsultas = performanceData.reduce((sum, p) => sum + p.consultasRecibidas, 0);
    const totalMuestras = performanceData.reduce((sum, p) => sum + p.muestrasRealizadas, 0);
    const totalOperaciones = performanceData.reduce((sum, p) => sum + p.operacionesCerradas, 0);
    const totalSeguimiento = performanceData.filter(p => p.seguimiento).length;

    const conversionRates = {
      consultasToMuestras: totalConsultas > 0 ? (totalMuestras / totalConsultas * 100).toFixed(2) : 0,
      muestrasToOperaciones: totalMuestras > 0 ? (totalOperaciones / totalMuestras * 100).toFixed(2) : 0
    };

    // Preparar prompt personalizado
    const prompt = `
Analiza el desempeño personal del asesor ${req.user.name} y proporciona recomendaciones específicas:

DATOS PERSONALES:
- Total de consultas recibidas: ${totalConsultas}
- Total de muestras realizadas: ${totalMuestras}
- Total de operaciones cerradas: ${totalOperaciones}
- Registros con seguimiento: ${totalSeguimiento}/${performanceData.length}
- Tasa de conversión consultas → muestras: ${conversionRates.consultasToMuestras}%
- Tasa de conversión muestras → operaciones: ${conversionRates.muestrasToOperaciones}%

REGISTROS RECIENTES:
${performanceData.slice(0, 10).map(p => `
- ${p.fecha.toISOString().split('T')[0]}: ${p.consultasRecibidas} consultas, ${p.muestrasRealizadas} muestras, ${p.operacionesCerradas} operaciones, seguimiento: ${p.seguimiento ? 'Sí' : 'No'}
${p.usoTokko ? `  Uso Tokko: ${p.usoTokko}` : ''}
`).join('')}

Proporciona recomendaciones personalizadas para:
1. Mejorar las conversiones específicas del asesor
2. Optimizar el uso del CRM Tokko
3. Estrategias de seguimiento personalizadas
4. Metas realistas para el próximo período
5. Técnicas específicas para aumentar el número de operaciones cerradas

Responde en español, de forma motivacional pero práctica, enfocándote en acciones específicas que puede implementar inmediatamente.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const recommendations = response.text();

    res.json({
      recommendations: recommendations.split('\n').filter(line => line.trim()),
      personalMetrics: {
        totalConsultas,
        totalMuestras,
        totalOperaciones,
        totalSeguimiento,
        conversionRates
      },
      data: performanceData.slice(0, 5) // Solo los primeros 5 registros
    });

  } catch (error) {
    console.error('Error generando recomendaciones personales:', error);
    res.status(500).json({ 
      message: 'Error generando recomendaciones personales',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

module.exports = router;
