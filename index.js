const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Validar variables de entorno antes de continuar
const { getConfig } = require('./config/env');
const config = getConfig();

const { connectDatabase } = require('./config/database');
const { logger, requestLogger, errorLogger, logSystemEvent } = require('./config/logger');
const { initializeRedis } = require('./config/cache');
const { 
  generalLimiter, 
  speedLimiter, 
  rateLimitLogger 
} = require('./middleware/rateLimiting');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const performanceRoutes = require('./routes/performance');
const recordsRoutes = require('./routes/records');
const geminiRoutes = require('./routes/gemini');
const healthRoutes = require('./routes/health');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = config.PORT;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuración de CORS simplificada
app.use(cors({
  origin: [
    'https://rendimiento-inmobiliaria-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:5001',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de rate limiting y logging
app.use(rateLimitLogger);
app.use(generalLimiter);
app.use(speedLimiter);
app.use(requestLogger);

// Routes
app.use('/api/health', healthRoutes); // Health checks (sin rate limiting)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/reports', reportsRoutes);

// El logging de requests ya está manejado por requestLogger

// Error handling middleware
app.use(errorLogger);
app.use((err, req, res, next) => {
  res.status(500).json({ 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Iniciar servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDatabase();
    
    // Inicializar cache Redis (opcional)
    await initializeRedis();
    
    app.listen(PORT, () => {
      logSystemEvent('server_started', {
        port: PORT,
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`📊 Sistema de Monitoreo de Desempeño Inmobiliario`);
      console.log(`🌐 http://localhost:${PORT}`);
      console.log(`📝 Logs guardados en: ./logs/`);
      console.log(`🔴 Cache Redis: ${process.env.REDIS_URL ? 'Habilitado' : 'Deshabilitado'}`);
    });
  } catch (error) {
    logger.error('Error iniciando servidor', {
      error: error.message,
      stack: error.stack,
      port: PORT
    });
    process.exit(1);
  }
}

startServer();
