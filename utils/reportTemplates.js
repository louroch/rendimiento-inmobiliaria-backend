/**
 * Templates HTML para generación de reportes PDF
 * Proporciona diferentes plantillas para distintos tipos de reportes
 */

/**
 * Genera el template HTML principal
 * @param {Object} data - Datos del reporte
 * @param {string} templateType - Tipo de template
 * @returns {string} HTML generado
 */
function generateHTMLTemplate(data, templateType = 'dashboard') {
  switch (templateType) {
    case 'dashboard':
      return generateDashboardHTML(data);
    case 'agent-performance':
      return generateAgentPerformanceHTML(data);
    case 'trends':
      return generateTrendsHTML(data);
    case 'summary':
      return generateSummaryHTML(data);
    default:
      return generateDashboardHTML(data);
  }
}

/**
 * Template para dashboard principal
 * @param {Object} data - Datos del dashboard
 * @returns {string} HTML del dashboard
 */
function generateDashboardHTML(data) {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte de Desempeño - Dashboard</title>
      <style>
        ${getCommonStyles()}
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .metrics-card {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
        }
        .ranking-section {
          margin-bottom: 25px;
        }
        .ranking-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
        }
        .agent-card {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .agent-card.top-1 { border-left: 4px solid #ffd700; }
        .agent-card.top-2 { border-left: 4px solid #c0c0c0; }
        .agent-card.top-3 { border-left: 4px solid #cd7f32; }
        .position-badge {
          display: inline-block;
          background: #007bff;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          margin-right: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Reporte de Desempeño Inmobiliario</h1>
        <p class="subtitle">Dashboard Ejecutivo</p>
        <p class="date">Generado el ${currentDate}</p>
        ${data.period ? `<p class="period">Período: ${data.period}</p>` : ''}
      </div>

      <div class="section">
        <h2>📈 Métricas Generales del Equipo</h2>
        <div class="dashboard-grid">
          <div class="metrics-card">
            <h3>Resumen Ejecutivo</h3>
            <div class="metric">
              <span class="label">Total Agentes:</span>
              <span class="value">${data.teamMetrics?.totalAgentes || 0}</span>
            </div>
            <div class="metric">
              <span class="label">Total Registros:</span>
              <span class="value">${data.teamMetrics?.totalRegistros || 0}</span>
            </div>
            <div class="metric">
              <span class="label">Período Analizado:</span>
              <span class="value">${data.period || 'No especificado'}</span>
            </div>
          </div>
          
          <div class="metrics-card">
            <h3>Actividad Total</h3>
            <div class="metric">
              <span class="label">Consultas Recibidas:</span>
              <span class="value">${data.teamMetrics?.totalConsultas || 0}</span>
            </div>
            <div class="metric">
              <span class="label">Muestras Realizadas:</span>
              <span class="value">${data.teamMetrics?.totalMuestras || 0}</span>
            </div>
            <div class="metric">
              <span class="label">Operaciones Cerradas:</span>
              <span class="value">${data.teamMetrics?.totalOperaciones || 0}</span>
            </div>
            <div class="metric">
              <span class="label">Captaciones:</span>
              <span class="value">${data.teamMetrics?.totalCaptaciones || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🏆 Rankings de Desempeño</h2>
        
        <div class="ranking-section">
          <h3>🥇 Top Performers por Captaciones</h3>
          <div class="ranking-grid">
            ${(data.rankings?.captaciones || []).map((agent, index) => `
              <div class="agent-card top-${index + 1}">
                <span class="position-badge">#${index + 1}</span>
                <strong>${agent.agente?.name || 'N/A'}</strong><br>
                <span class="metric-value">${agent.numeroCaptaciones || 0} captaciones</span><br>
                <small>Email: ${agent.agente?.email || 'N/A'}</small>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="ranking-section">
          <h3>🔍 Top Performers por Muestras</h3>
          <div class="ranking-grid">
            ${(data.rankings?.muestras || []).map((agent, index) => `
              <div class="agent-card top-${index + 1}">
                <span class="position-badge">#${index + 1}</span>
                <strong>${agent.agente?.name || 'N/A'}</strong><br>
                <span class="metric-value">${agent.muestrasRealizadas || 0} muestras</span><br>
                <small>Email: ${agent.agente?.email || 'N/A'}</small>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="ranking-section">
          <h3>💰 Top Performers por Operaciones</h3>
          <div class="ranking-grid">
            ${(data.rankings?.operaciones || []).map((agent, index) => `
              <div class="agent-card top-${index + 1}">
                <span class="position-badge">#${index + 1}</span>
                <strong>${agent.agente?.name || 'N/A'}</strong><br>
                <span class="metric-value">${agent.operacionesCerradas || 0} operaciones</span><br>
                <small>Email: ${agent.agente?.email || 'N/A'}</small>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="ranking-section">
          <h3>📊 Mejor Tasa de Conversión (Consultas → Muestras)</h3>
          <div class="ranking-grid">
            ${(data.rankings?.conversionConsultas || []).map((agent, index) => `
              <div class="agent-card top-${index + 1}">
                <span class="position-badge">#${index + 1}</span>
                <strong>${agent.agente?.name || 'N/A'}</strong><br>
                <span class="metric-value">${agent.conversionRates?.consultasToMuestras || 0}%</span><br>
                <small>${agent.consultasRecibidas || 0} consultas → ${agent.muestrasRealizadas || 0} muestras</small>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      ${data.teamMetrics?.conversionRates ? `
      <div class="section">
        <h2>📈 Tasas de Conversión del Equipo</h2>
        <div class="metrics-card">
          <div class="metric">
            <span class="label">Consultas → Muestras:</span>
            <span class="value">${data.teamMetrics.conversionRates.consultasToMuestras || 0}%</span>
          </div>
          <div class="metric">
            <span class="label">Muestras → Operaciones:</span>
            <span class="value">${data.teamMetrics.conversionRates.muestrasToOperaciones || 0}%</span>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <p>Reporte generado automáticamente por el Sistema de Monitoreo de Desempeño Inmobiliario</p>
        <p>Para más información, contacte al administrador del sistema</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template para análisis de agente individual
 * @param {Object} data - Datos del agente
 * @returns {string} HTML del análisis
 */
function generateAgentPerformanceHTML(data) {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Análisis de Desempeño - ${data.agent?.name || 'Agente'}</title>
      <style>
        ${getCommonStyles()}
        .agent-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 30px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .metric-card {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value {
          font-size: 2em;
          font-weight: bold;
          color: #007bff;
          display: block;
          margin: 10px 0;
        }
        .conversion-rates {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="agent-header">
        <h1>👤 Análisis de Desempeño Individual</h1>
        <h2>${data.agent?.name || 'Agente'}</h2>
        <p>${data.agent?.email || 'N/A'} | ${data.agent?.role || 'Agente'}</p>
        <p>Generado el ${currentDate}</p>
      </div>

      <div class="section">
        <h2>📊 Métricas Principales</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <h3>Total Consultas</h3>
            <span class="metric-value">${data.metrics?.totalConsultas || 0}</span>
            <p>Consultas recibidas</p>
          </div>
          <div class="metric-card">
            <h3>Total Muestras</h3>
            <span class="metric-value">${data.metrics?.totalMuestras || 0}</span>
            <p>Muestras realizadas</p>
          </div>
          <div class="metric-card">
            <h3>Total Operaciones</h3>
            <span class="metric-value">${data.metrics?.totalOperaciones || 0}</span>
            <p>Operaciones cerradas</p>
          </div>
          <div class="metric-card">
            <h3>Total Captaciones</h3>
            <span class="metric-value">${data.metrics?.totalCaptaciones || 0}</span>
            <p>Captaciones realizadas</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📈 Tasas de Conversión</h2>
        <div class="conversion-rates">
          <div class="metric">
            <span class="label">Consultas → Muestras:</span>
            <span class="value">${data.metrics?.conversionRates?.consultasToMuestras || 0}%</span>
          </div>
          <div class="metric">
            <span class="label">Muestras → Operaciones:</span>
            <span class="value">${data.metrics?.conversionRates?.muestrasToOperaciones || 0}%</span>
          </div>
        </div>
      </div>

      ${data.ranking ? `
      <div class="section">
        <h2>🏆 Posición en el Equipo</h2>
        <div class="metrics-card">
          <div class="metric">
            <span class="label">Posición Actual:</span>
            <span class="value">#${data.ranking.position || 'N/A'} de ${data.ranking.totalAgents || 0}</span>
          </div>
        </div>
      </div>
      ` : ''}

      ${data.weeklyAnalysis ? `
      <div class="section">
        <h2>📅 Análisis Semanal</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <h3>Semana Actual</h3>
            <span class="metric-value">${data.weeklyAnalysis.currentWeek?.registros || 0}</span>
            <p>Registros</p>
          </div>
          <div class="metric-card">
            <h3>Semana Anterior</h3>
            <span class="metric-value">${data.weeklyAnalysis.previousWeek?.registros || 0}</span>
            <p>Registros</p>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <p>Análisis generado automáticamente por el Sistema de Monitoreo de Desempeño Inmobiliario</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template para análisis de tendencias
 * @param {Object} data - Datos de tendencias
 * @returns {string} HTML de tendencias
 */
function generateTrendsHTML(data) {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Análisis de Tendencias</title>
      <style>
        ${getCommonStyles()}
        .trends-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .trend-card {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .trend-up { color: #28a745; }
        .trend-down { color: #dc3545; }
        .trend-neutral { color: #6c757d; }
        .weekly-data {
          margin: 20px 0;
        }
        .week-item {
          background: #f8f9fa;
          border-left: 4px solid #007bff;
          padding: 15px;
          margin: 10px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📈 Análisis de Tendencias</h1>
        <p class="subtitle">Análisis Temporal de Desempeño</p>
        <p class="date">Generado el ${currentDate}</p>
        ${data.period ? `<p class="period">Período: ${data.period.weeks} semanas</p>` : ''}
      </div>

      <div class="section">
        <h2>📊 Tendencias Generales</h2>
        <div class="trends-grid">
          <div class="trend-card">
            <h3>Consultas</h3>
            <span class="metric-value trend-${data.trends?.consultas?.direction || 'neutral'}">
              ${data.trends?.consultas?.direction === 'up' ? '↗️' : data.trends?.consultas?.direction === 'down' ? '↘️' : '➡️'} 
              ${data.trends?.consultas?.percentage || 0}%
            </span>
          </div>
          <div class="trend-card">
            <h3>Muestras</h3>
            <span class="metric-value trend-${data.trends?.muestras?.direction || 'neutral'}">
              ${data.trends?.muestras?.direction === 'up' ? '↗️' : data.trends?.muestras?.direction === 'down' ? '↘️' : '➡️'} 
              ${data.trends?.muestras?.percentage || 0}%
            </span>
          </div>
          <div class="trend-card">
            <h3>Operaciones</h3>
            <span class="metric-value trend-${data.trends?.operaciones?.direction || 'neutral'}">
              ${data.trends?.operaciones?.direction === 'up' ? '↗️' : data.trends?.operaciones?.direction === 'down' ? '↘️' : '➡️'} 
              ${data.trends?.operaciones?.percentage || 0}%
            </span>
          </div>
          <div class="trend-card">
            <h3>Captaciones</h3>
            <span class="metric-value trend-${data.trends?.captaciones?.direction || 'neutral'}">
              ${data.trends?.captaciones?.direction === 'up' ? '↗️' : data.trends?.captaciones?.direction === 'down' ? '↘️' : '➡️'} 
              ${data.trends?.captaciones?.percentage || 0}%
            </span>
          </div>
        </div>
      </div>

      ${data.weeklyData ? `
      <div class="section">
        <h2>📅 Datos Semanales</h2>
        <div class="weekly-data">
          ${data.weeklyData.map(week => `
            <div class="week-item">
              <h4>Semana ${week.weekNumber} (${week.startFormatted} - ${week.endFormatted})</h4>
              <div class="metrics-grid">
                <div class="metric">
                  <span class="label">Consultas:</span>
                  <span class="value">${week.metrics.consultasRecibidas}</span>
                </div>
                <div class="metric">
                  <span class="label">Muestras:</span>
                  <span class="value">${week.metrics.muestrasRealizadas}</span>
                </div>
                <div class="metric">
                  <span class="label">Operaciones:</span>
                  <span class="value">${week.metrics.operacionesCerradas}</span>
                </div>
                <div class="metric">
                  <span class="label">Captaciones:</span>
                  <span class="value">${week.metrics.numeroCaptaciones}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${data.topPerformersCurrentWeek ? `
      <div class="section">
        <h2>🏆 Top Performers de la Semana Actual</h2>
        <div class="trends-grid">
          ${data.topPerformersCurrentWeek.map((agent, index) => `
            <div class="trend-card">
              <h3>#${index + 1} ${agent.agente?.name || 'N/A'}</h3>
              <div class="metric">
                <span class="label">Score:</span>
                <span class="value">${agent.score || 0}</span>
              </div>
              <div class="metric">
                <span class="label">Operaciones:</span>
                <span class="value">${agent.operacionesCerradas || 0}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <p>Análisis de tendencias generado automáticamente por el Sistema de Monitoreo de Desempeño Inmobiliario</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template para resumen ejecutivo
 * @param {Object} data - Datos del resumen
 * @returns {string} HTML del resumen
 */
function generateSummaryHTML(data) {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resumen Ejecutivo</title>
      <style>
        ${getCommonStyles()}
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .highlight-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px;
          text-align: center;
        }
        .highlight-value {
          font-size: 3em;
          font-weight: bold;
          display: block;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 Resumen Ejecutivo</h1>
        <p class="subtitle">Reporte Consolidado de Desempeño</p>
        <p class="date">Generado el ${currentDate}</p>
      </div>

      <div class="section">
        <h2>🎯 Métricas Clave</h2>
        <div class="summary-grid">
          <div class="highlight-box">
            <h3>Total Agentes</h3>
            <span class="highlight-value">${data.summary?.totalAgentes || 0}</span>
            <p>Agentes activos en el sistema</p>
          </div>
          <div class="highlight-box">
            <h3>Total Operaciones</h3>
            <span class="highlight-value">${data.summary?.totalOperaciones || 0}</span>
            <p>Operaciones cerradas</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📊 Resumen de Actividad</h2>
        <div class="metrics-card">
          <div class="metric">
            <span class="label">Total Consultas:</span>
            <span class="value">${data.summary?.totalConsultas || 0}</span>
          </div>
          <div class="metric">
            <span class="label">Total Muestras:</span>
            <span class="value">${data.summary?.totalMuestras || 0}</span>
          </div>
          <div class="metric">
            <span class="label">Total Captaciones:</span>
            <span class="value">${data.summary?.totalCaptaciones || 0}</span>
          </div>
          <div class="metric">
            <span class="label">Total Propiedades Tokko:</span>
            <span class="value">${data.summary?.totalPropiedadesTokko || 0}</span>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Resumen ejecutivo generado automáticamente por el Sistema de Monitoreo de Desempeño Inmobiliario</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Estilos CSS comunes para todos los templates
 * @returns {string} CSS común
 */
function getCommonStyles() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f8f9fa;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .header h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    
    .subtitle {
      color: #7f8c8d;
      font-size: 1.2em;
      margin-bottom: 10px;
    }
    
    .date, .period {
      color: #95a5a6;
      font-size: 0.9em;
    }
    
    .section {
      background: white;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .section h2 {
      color: #2c3e50;
      margin-bottom: 20px;
      font-size: 1.8em;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    
    .section h3 {
      color: #34495e;
      margin-bottom: 15px;
      font-size: 1.3em;
    }
    
    .metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #ecf0f1;
    }
    
    .metric:last-child {
      border-bottom: none;
    }
    
    .label {
      font-weight: 600;
      color: #2c3e50;
    }
    
    .value {
      font-weight: bold;
      color: #3498db;
      font-size: 1.1em;
    }
    
    .metric-value {
      font-size: 1.5em;
      font-weight: bold;
      color: #2c3e50;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      padding: 20px;
      background: #34495e;
      color: white;
      border-radius: 10px;
    }
    
    .footer p {
      margin: 5px 0;
      font-size: 0.9em;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .section {
        box-shadow: none;
        border: 1px solid #ddd;
        page-break-inside: avoid;
      }
      
      .header {
        box-shadow: none;
        border: 1px solid #ddd;
      }
    }
  `;
}

module.exports = {
  generateHTMLTemplate,
  generateDashboardHTML,
  generateAgentPerformanceHTML,
  generateTrendsHTML,
  generateSummaryHTML
};
