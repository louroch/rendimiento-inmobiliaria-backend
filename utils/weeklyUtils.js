/**
 * Utilidades para manejo de fechas semanales
 * Agrupa datos por semana (lunes a sábado)
 */

/**
 * Obtiene el rango de fechas de una semana específica
 * @param {Date} date - Fecha de referencia
 * @returns {Object} Objeto con inicio y fin de la semana
 */
function getWeekRange(date) {
  const start = new Date(date);
  const dayOfWeek = start.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Lunes = 1, Domingo = 0
  
  start.setDate(start.getDate() + daysToMonday);
  start.setHours(0, 0, 0, 0); // Inicio del día
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sábado
  end.setHours(23, 59, 59, 999); // Final del día
  
  return { start, end };
}

/**
 * Obtiene el rango de la semana anterior
 * @param {Date} date - Fecha de referencia
 * @returns {Object} Objeto con inicio y fin de la semana anterior
 */
function getPreviousWeekRange(date) {
  const currentWeek = getWeekRange(date);
  const previousWeekStart = new Date(currentWeek.start);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  
  return getWeekRange(previousWeekStart);
}

/**
 * Obtiene el número de semana del año
 * @param {Date} date - Fecha de referencia
 * @returns {number} Número de semana
 */
function getWeekNumber(date) {
  const start = getWeekRange(date).start;
  const startOfYear = new Date(start.getFullYear(), 0, 1);
  const days = Math.floor((start - startOfYear) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

/**
 * Formatea una fecha para mostrar en formato legible
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDate(date) {
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Calcula el porcentaje de cambio entre dos valores
 * @param {number} current - Valor actual
 * @param {number} previous - Valor anterior
 * @returns {Object} Objeto con valor y porcentaje de cambio
 */
function calculateChange(current, previous) {
  if (previous === 0) {
    return {
      value: current,
      percentage: current > 0 ? 100 : 0,
      trend: current > 0 ? 'up' : 'neutral'
    };
  }
  
  const percentage = Math.round(((current - previous) / previous) * 100);
  const trend = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
  
  return {
    value: current,
    percentage: Math.abs(percentage),
    trend
  };
}

/**
 * Obtiene el rango de fechas para una semana específica del año
 * @param {number} year - Año
 * @param {number} weekNumber - Número de semana
 * @returns {Object} Objeto con inicio y fin de la semana
 */
function getWeekRangeByNumber(year, weekNumber) {
  const jan1 = new Date(year, 0, 1);
  const daysToFirstMonday = jan1.getDay() === 0 ? 1 : 8 - jan1.getDay();
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + daysToFirstMonday);
  
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  
  return getWeekRange(weekStart);
}

module.exports = {
  getWeekRange,
  getPreviousWeekRange,
  getWeekNumber,
  formatDate,
  calculateChange,
  getWeekRangeByNumber
};
