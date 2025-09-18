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
    const totalCaptaciones = performanceData.reduce((sum, p) => sum + (p.numeroCaptaciones || 0), 0);
    const totalSeguimiento = performanceData.filter(p => p.seguimiento).length;

    const conversionRates = {
      consultasToMuestras: totalConsultas > 0 ? (totalMuestras / totalConsultas * 100).toFixed(2) : 0,
      muestrasToOperaciones: totalMuestras > 0 ? (totalOperaciones / totalMuestras * 100).toFixed(2) : 0
    };

    // Preparar prompt mejorado para Gemini
    const prompt = `
Eres un consultor experto en ventas inmobiliarias y análisis de rendimiento. Analiza estos datos de desempeño y proporciona insights profundos y recomendaciones accionables.

📊 DATOS DE DESEMPEÑO DEL EQUIPO:
- Total de consultas recibidas: ${totalConsultas}
- Total de muestras realizadas: ${totalMuestras}
- Total de operaciones cerradas: ${totalOperaciones}
- Registros con seguimiento: ${totalSeguimiento}/${performanceData.length} (${Math.round((totalSeguimiento/performanceData.length)*100)}%)
- Tasa de conversión consultas → muestras: ${conversionRates.consultasToMuestras}%
- Tasa de conversión muestras → operaciones: ${conversionRates.muestrasToOperaciones}%

👥 RENDIMIENTO INDIVIDUAL POR ASESOR:
${performanceData.map(p => {
  const conversionPersonal = p.consultasRecibidas > 0 ? ((p.muestrasRealizadas / p.consultasRecibidas) * 100).toFixed(1) : 0;
  const operacionesPersonal = p.muestrasRealizadas > 0 ? ((p.operacionesCerradas / p.muestrasRealizadas) * 100).toFixed(1) : 0;
  return `- ${p.user.name}: ${p.consultasRecibidas} consultas, ${p.muestrasRealizadas} muestras, ${p.operacionesCerradas} operaciones, seguimiento: ${p.seguimiento ? 'Sí' : 'No'}, conversión personal: ${conversionPersonal}% → ${operacionesPersonal}%`;
}).join('')}

🎯 ANÁLISIS REQUERIDO:

1. **IDENTIFICAR TOP PERFORMERS**: ¿Quién tiene el mejor rendimiento y por qué?
2. **DETECTAR OPORTUNIDADES**: ¿Qué agentes necesitan más apoyo?
3. **ANÁLISIS DE CONVERSIONES**: ¿Dónde se pierden más clientes en el embudo?
4. **PATRONES DE ÉXITO**: ¿Qué hacen diferente los mejores agentes?
5. **RECOMENDACIONES ESPECÍFICAS**: Acciones concretas para cada agente

📋 FORMATO DE RESPUESTA:
- **Resumen Ejecutivo**: 2-3 líneas con los hallazgos principales
- **Top Performers**: Nombres y razones de su éxito
- **Agentes a Apoyar**: Quién necesita ayuda y por qué
- **Recomendaciones por Agente**: 2-3 acciones específicas para cada uno
- **Estrategias de Equipo**: 3-5 mejoras generales
- **Métricas a Monitorear**: Qué KPIs seguir de cerca

Responde en español, con un tono profesional pero motivacional, enfocándote en datos concretos y acciones específicas.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
    const totalCaptaciones = performanceData.reduce((sum, p) => sum + (p.numeroCaptaciones || 0), 0);
    const totalSeguimiento = performanceData.filter(p => p.seguimiento).length;

    const conversionRates = {
      consultasToMuestras: totalConsultas > 0 ? (totalMuestras / totalConsultas * 100).toFixed(2) : 0,
      muestrasToOperaciones: totalMuestras > 0 ? (totalOperaciones / totalMuestras * 100).toFixed(2) : 0
    };

    // Preparar prompt personalizado mejorado
    const prompt = `
Eres un coach personal de ventas inmobiliarias. Analiza el desempeño de ${req.user.name} y proporciona un plan de mejora personalizado y motivacional.

📈 ANÁLISIS PERSONAL DE ${req.user.name.toUpperCase()}:

**MÉTRICAS ACTUALES:**
- Total de consultas recibidas: ${totalConsultas}
- Total de muestras realizadas: ${totalMuestras}
- Total de operaciones cerradas: ${totalOperaciones}
- Registros con seguimiento: ${totalSeguimiento}/${performanceData.length} (${Math.round((totalSeguimiento/performanceData.length)*100)}%)
- Tasa de conversión consultas → muestras: ${conversionRates.consultasToMuestras}%
- Tasa de conversión muestras → operaciones: ${conversionRates.muestrasToOperaciones}%

**HISTORIAL RECIENTE (Últimos 10 registros):**
${performanceData.slice(0, 10).map(p => {
  const conversionDia = p.consultasRecibidas > 0 ? ((p.muestrasRealizadas / p.consultasRecibidas) * 100).toFixed(1) : 0;
  const operacionesDia = p.muestrasRealizadas > 0 ? ((p.operacionesCerradas / p.muestrasRealizadas) * 100).toFixed(1) : 0;
  return `- ${p.fecha.toISOString().split('T')[0]}: ${p.consultasRecibidas} consultas → ${p.muestrasRealizadas} muestras (${conversionDia}%) → ${p.operacionesCerradas} operaciones (${operacionesDia}%), seguimiento: ${p.seguimiento ? '✅' : '❌'}${p.usoTokko ? `, Tokko: ${p.usoTokko}` : ''}`;
}).join('')}

🎯 ANÁLISIS PERSONALIZADO REQUERIDO:

1. **FORTALEZAS IDENTIFICADAS**: ¿En qué destaca ${req.user.name}?
2. **ÁREAS DE MEJORA**: ¿Dónde puede mejorar más?
3. **PATRONES DE RENDIMIENTO**: ¿Qué días/semanas rinde mejor?
4. **OPORTUNIDADES PERDIDAS**: ¿Dónde se están perdiendo conversiones?
5. **POTENCIAL DE CRECIMIENTO**: ¿Cuánto puede mejorar?

📋 PLAN DE ACCIÓN PERSONALIZADO:

**RESUMEN EJECUTIVO**: 2-3 líneas sobre el estado actual y potencial

**FORTALEZAS A POTENCIAR**: 2-3 puntos fuertes a desarrollar más

**MEJORAS PRIORITARIAS**: 3-5 acciones específicas para los próximos 30 días

**TÉCNICAS ESPECÍFICAS**: Estrategias concretas para:
- Aumentar consultas recibidas
- Mejorar conversión a muestras
- Cerrar más operaciones
- Optimizar seguimiento de clientes
- Usar mejor Tokko CRM

**METAS REALISTAS**: Objetivos específicos para el próximo mes

**HÁBITOS DIARIOS**: 3-5 acciones diarias para mejorar

**MÉTRICAS A SEGUIR**: KPIs específicos para monitorear progreso

Responde en español, con un tono motivacional y de apoyo, como un coach personal que cree en el potencial de ${req.user.name}. Incluye ejemplos específicos y acciones concretas.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

// @route   POST /api/gemini/advanced-analysis
// @desc    Análisis avanzado con datos de Tokko y métricas semanales
// @access  Private (Admin)
router.post('/advanced-analysis', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, includeTokko = true, includeWeekly = true } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        message: 'API de Gemini no configurada' 
      });
    }

    // Construir filtros de fecha
    const where = {};
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    // Obtener datos de desempeño con información de Tokko
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
      take: 50 // Últimos 50 registros para análisis más completo
    });

    if (performanceData.length === 0) {
      return res.json({
        analysis: ['No hay datos suficientes para generar análisis avanzado'],
        data: performanceData
      });
    }

    // Calcular métricas generales
    const totalConsultas = performanceData.reduce((sum, p) => sum + p.consultasRecibidas, 0);
    const totalMuestras = performanceData.reduce((sum, p) => sum + p.muestrasRealizadas, 0);
    const totalOperaciones = performanceData.reduce((sum, p) => sum + p.operacionesCerradas, 0);
    const totalCaptaciones = performanceData.reduce((sum, p) => sum + (p.numeroCaptaciones || 0), 0);
    const totalSeguimiento = performanceData.filter(p => p.seguimiento).length;
    const totalPropiedadesTokko = performanceData.reduce((sum, p) => sum + (p.cantidadPropiedadesTokko || 0), 0);
    const totalDificultades = performanceData.filter(p => p.dificultadTokko === true).length;

    // Calcular métricas por agente
    const agentesStats = {};
    performanceData.forEach(p => {
      if (!agentesStats[p.user.id]) {
        agentesStats[p.user.id] = {
          name: p.user.name,
          email: p.user.email,
          consultas: 0,
          muestras: 0,
          operaciones: 0,
          seguimiento: 0,
          propiedadesTokko: 0,
          dificultades: 0,
          registros: 0
        };
      }
      agentesStats[p.user.id].consultas += p.consultasRecibidas;
      agentesStats[p.user.id].muestras += p.muestrasRealizadas;
      agentesStats[p.user.id].operaciones += p.operacionesCerradas;
      agentesStats[p.user.id].seguimiento += p.seguimiento ? 1 : 0;
      agentesStats[p.user.id].propiedadesTokko += p.cantidadPropiedadesTokko || 0;
      agentesStats[p.user.id].dificultades += p.dificultadTokko === true ? 1 : 0;
      agentesStats[p.user.id].registros += 1;
    });

    // Calcular conversiones por agente
    Object.values(agentesStats).forEach(agente => {
      agente.conversionConsultasMuestras = agente.consultas > 0 ? ((agente.muestras / agente.consultas) * 100).toFixed(1) : 0;
      agente.conversionMuestrasOperaciones = agente.muestras > 0 ? ((agente.operaciones / agente.muestras) * 100).toFixed(1) : 0;
      agente.porcentajeSeguimiento = agente.registros > 0 ? ((agente.seguimiento / agente.registros) * 100).toFixed(1) : 0;
      agente.porcentajeDificultades = agente.registros > 0 ? ((agente.dificultades / agente.registros) * 100).toFixed(1) : 0;
    });

    // Preparar prompt avanzado
    const prompt = `
Eres un consultor senior en ventas inmobiliarias y análisis de datos. Realiza un análisis exhaustivo de estos datos de rendimiento y proporciona insights estratégicos profundos.

📊 DATOS COMPLETOS DEL EQUIPO:
- Período analizado: ${performanceData.length} registros
- Total de consultas recibidas: ${totalConsultas}
- Total de muestras realizadas: ${totalMuestras}
- Total de operaciones cerradas: ${totalOperaciones}
- Total de propiedades cargadas en Tokko: ${totalPropiedadesTokko}
- Registros con seguimiento: ${totalSeguimiento}/${performanceData.length} (${Math.round((totalSeguimiento/performanceData.length)*100)}%)
- Registros con dificultades Tokko: ${totalDificultades}/${performanceData.length} (${Math.round((totalDificultades/performanceData.length)*100)}%)

👥 ANÁLISIS DETALLADO POR AGENTE:
${Object.values(agentesStats).map(agente => `
**${agente.name}**:
- Consultas: ${agente.consultas} | Muestras: ${agente.muestras} | Operaciones: ${agente.operaciones}
- Conversión consultas→muestras: ${agente.conversionConsultasMuestras}%
- Conversión muestras→operaciones: ${agente.conversionMuestrasOperaciones}%
- Seguimiento: ${agente.porcentajeSeguimiento}% | Dificultades Tokko: ${agente.porcentajeDificultades}%
- Propiedades Tokko: ${agente.propiedadesTokko} | Registros: ${agente.registros}
`).join('')}

🎯 ANÁLISIS ESTRATÉGICO REQUERIDO:

1. **RANKING DE PERFORMANCE**: Clasifica a los agentes por rendimiento general
2. **ANÁLISIS DE CONVERSIONES**: Identifica dónde se pierden más oportunidades
3. **PATRONES DE ÉXITO**: ¿Qué características tienen los top performers?
4. **ANÁLISIS DE TOKKO**: ¿Cómo impacta el uso del CRM en los resultados?
5. **OPORTUNIDADES DE MEJORA**: ¿Qué agentes tienen mayor potencial de crecimiento?
6. **ESTRATEGIAS DIFERENCIADAS**: Recomendaciones específicas por perfil de agente

📋 REPORTE EJECUTIVO:

**RESUMEN EJECUTIVO**: 3-4 líneas con hallazgos clave y recomendaciones principales

**TOP PERFORMERS**: 
- Nombres y métricas destacadas
- Factores de éxito identificados
- Cómo pueden ayudar al equipo

**AGENTES CON POTENCIAL**:
- Quién puede mejorar más
- Áreas específicas de mejora
- Plan de acción personalizado

**ANÁLISIS DE TOKKO CRM**:
- Impacto en conversiones
- Dificultades más comunes
- Recomendaciones de uso

**ESTRATEGIAS DE EQUIPO**:
- 5-7 mejoras generales prioritarias
- Procesos a optimizar
- Capacitaciones necesarias

**MÉTRICAS CRÍTICAS**:
- KPIs a monitorear semanalmente
- Alertas a configurar
- Objetivos para el próximo mes

**RECOMENDACIONES ESPECÍFICAS POR AGENTE**:
- Plan de acción individual para cada uno
- Metas realistas y medibles
- Técnicas específicas a implementar

Responde en español, con un tono ejecutivo pero accionable, enfocándote en datos concretos y estrategias implementables.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    res.json({
      analysis: analysis.split('\n').filter(line => line.trim()),
      metrics: {
        totalConsultas,
        totalMuestras,
        totalOperaciones,
        totalSeguimiento,
        totalPropiedadesTokko,
        totalDificultades,
        conversionRates: {
          consultasToMuestras: totalConsultas > 0 ? (totalMuestras / totalConsultas * 100).toFixed(2) : 0,
          muestrasToOperaciones: totalMuestras > 0 ? (totalOperaciones / totalMuestras * 100).toFixed(2) : 0
        }
      },
      agentesStats: Object.values(agentesStats).sort((a, b) => b.operaciones - a.operaciones),
      data: performanceData.slice(0, 20) // Primeros 20 registros para la respuesta
    });

  } catch (error) {
    console.error('Error generando análisis avanzado:', error);
    res.status(500).json({ 
      message: 'Error generando análisis avanzado',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

module.exports = router;
