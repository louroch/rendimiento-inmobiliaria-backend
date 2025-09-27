/**
 * Generador de PDFs para reportes
 * Utiliza Puppeteer para generar PDFs desde HTML
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Genera un PDF desde contenido HTML
 * @param {string} htmlContent - Contenido HTML a convertir
 * @param {Object} options - Opciones de configuración del PDF
 * @returns {Buffer} Buffer del PDF generado
 */
async function generatePDF(htmlContent, options = {}) {
  let browser;
  
  try {
    // Configuración del navegador optimizada para Windows
    const browserOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--run-all-compositor-stages-before-draw',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      timeout: 30000
    };

    // En desarrollo, usar configuración más simple
    if (process.env.NODE_ENV === 'development') {
      browserOptions.args = [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ];
    }

    browser = await puppeteer.launch(browserOptions);
    const page = await browser.newPage();
    
    // Configurar la página
    await page.setViewport({ width: 1200, height: 800 });
    
    // Configurar timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    // Establecer contenido HTML con timeout
    await page.setContent(htmlContent, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Esperar un poco más para que se carguen los estilos
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Configuración por defecto del PDF
    const pdfOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      },
      displayHeaderFooter: false, // Deshabilitar headers/footers por ahora
      preferCSSPageSize: true,
      ...options
    };
    
    const pdfBuffer = await page.pdf(pdfOptions);
    return pdfBuffer;
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    throw new Error(`Error generando PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Genera un PDF desde un archivo HTML
 * @param {string} htmlFilePath - Ruta del archivo HTML
 * @param {Object} options - Opciones de configuración del PDF
 * @returns {Buffer} Buffer del PDF generado
 */
async function generatePDFFromFile(htmlFilePath, options = {}) {
  try {
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    return await generatePDF(htmlContent, options);
  } catch (error) {
    console.error('Error leyendo archivo HTML:', error);
    throw new Error(`Error leyendo archivo HTML: ${error.message}`);
  }
}

/**
 * Genera un PDF con datos específicos usando un template
 * @param {Object} data - Datos para el template
 * @param {string} templateType - Tipo de template a usar
 * @param {Object} options - Opciones de configuración del PDF
 * @returns {Buffer} Buffer del PDF generado
 */
async function generatePDFFromTemplate(data, templateType = 'dashboard', options = {}) {
  try {
    const { generateHTMLTemplate } = require('./reportTemplates');
    const htmlContent = generateHTMLTemplate(data, templateType);
    return await generatePDF(htmlContent, options);
  } catch (error) {
    console.error('Error generando PDF desde template:', error);
    throw new Error(`Error generando PDF desde template: ${error.message}`);
  }
}

/**
 * Guarda un PDF en el sistema de archivos
 * @param {Buffer} pdfBuffer - Buffer del PDF
 * @param {string} filename - Nombre del archivo
 * @param {string} outputDir - Directorio de salida (opcional)
 * @returns {string} Ruta del archivo guardado
 */
function savePDFToFile(pdfBuffer, filename, outputDir = './temp') {
  try {
    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Asegurar que el filename tenga extensión .pdf
    if (!filename.endsWith('.pdf')) {
      filename += '.pdf';
    }
    
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);
    
    return filePath;
  } catch (error) {
    console.error('Error guardando PDF:', error);
    throw new Error(`Error guardando PDF: ${error.message}`);
  }
}

/**
 * Limpia archivos PDF temporales
 * @param {string} outputDir - Directorio a limpiar
 * @param {number} maxAge - Edad máxima en milisegundos (default: 1 hora)
 */
function cleanupTempPDFs(outputDir = './temp', maxAge = 60 * 60 * 1000) {
  try {
    if (!fs.existsSync(outputDir)) return;
    
    const files = fs.readdirSync(outputDir);
    const now = Date.now();
    
    files.forEach(file => {
      if (file.endsWith('.pdf')) {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Archivo PDF temporal eliminado: ${file}`);
        }
      }
    });
  } catch (error) {
    console.error('Error limpiando archivos temporales:', error);
  }
}

module.exports = {
  generatePDF,
  generatePDFFromFile,
  generatePDFFromTemplate,
  savePDFToFile,
  cleanupTempPDFs
};
