# 🚀 Guía de Despliegue en Railway

## 📋 Configuración Actual

### Archivos Modificados para Railway

1. **`railway.json`** - Configuración de Railway
2. **`start-railway.js`** - Script de inicio específico para Railway
3. **`routes/health.js`** - Health checks optimizados
4. **`index.js`** - Servidor configurado para Railway

### Cambios Realizados

#### 1. Configuración del Servidor
- ✅ Servidor configurado para escuchar en `0.0.0.0` (requerido para Railway)
- ✅ Puerto dinámico usando `process.env.PORT`
- ✅ Mejor logging para debugging

#### 2. Health Checks Optimizados
- ✅ Health check principal (`/api/health`) con timeout de DB
- ✅ Health check simple (`/api/health/simple`) sin dependencias
- ✅ Health check de liveness (`/api/health/live`)
- ✅ Health check de readiness (`/api/health/ready`)

#### 3. Configuración de Railway
- ✅ Health check path: `/api/health/simple`
- ✅ Timeout: 30 segundos
- ✅ Restart policy: ON_FAILURE con 5 reintentos
- ✅ Variables de entorno configuradas

## 🔧 Variables de Entorno Requeridas

### Variables Obligatorias
```env
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/database
JWT_SECRET=tu-secreto-super-seguro-de-al-menos-32-caracteres
GEMINI_API_KEY=tu-api-key-de-google-gemini
```

### Variables Opcionales
```env
NODE_ENV=production
PORT=5000
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 Pasos para Desplegar

### 1. Preparar el Proyecto
```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Probar localmente
npm run dev
```

### 2. Configurar Railway

1. **Crear proyecto en Railway**
   - Conectar repositorio GitHub
   - Seleccionar este directorio

2. **Configurar variables de entorno**
   - Ir a Variables tab
   - Agregar todas las variables requeridas

3. **Configurar base de datos**
   - Agregar servicio MongoDB
   - Copiar DATABASE_URL a variables de entorno

### 3. Desplegar
```bash
# Railway detectará automáticamente los cambios
git add .
git commit -m "Fix Railway deployment configuration"
git push origin main
```

## 🔍 Verificación del Despliegue

### Health Checks Disponibles

1. **Simple Health Check** (usado por Railway)
   ```
   GET /api/health/simple
   ```
   - Respuesta: `{"status": "ok", "timestamp": "...", "service": "..."}`
   - Sin dependencias externas

2. **Health Check Principal**
   ```
   GET /api/health
   ```
   - Incluye verificación de base de datos
   - Timeout de 2 segundos para DB

3. **Liveness Check**
   ```
   GET /api/health/live
   ```
   - Para Kubernetes/Railway liveness probe

4. **Readiness Check**
   ```
   GET /api/health/ready
   ```
   - Para Kubernetes/Railway readiness probe

### Testing Local
```bash
# Probar health checks localmente
npm run test:health

# O manualmente
curl http://localhost:5000/api/health/simple
curl http://localhost:5000/api/health
```

## 🐛 Troubleshooting

### Problemas Comunes

#### 1. Health Check Falla
- **Síntoma**: "service unavailable" en health check
- **Causa**: Servidor no responde en el puerto correcto
- **Solución**: Verificar que el servidor escucha en `0.0.0.0:PORT`

#### 2. Database Connection Error
- **Síntoma**: Error de conexión a base de datos
- **Causa**: DATABASE_URL incorrecta o base de datos no disponible
- **Solución**: Verificar DATABASE_URL en Railway variables

#### 3. Port Binding Error
- **Síntoma**: "EADDRINUSE" o "port already in use"
- **Causa**: Puerto ya en uso o configuración incorrecta
- **Solución**: Usar `process.env.PORT` en lugar de puerto fijo

### Logs de Railway
```bash
# Ver logs en tiempo real
railway logs

# Ver logs específicos del servicio
railway logs --service backend
```

### Debugging
1. Verificar variables de entorno en Railway dashboard
2. Revisar logs de Railway para errores específicos
3. Probar health checks manualmente
4. Verificar conectividad de base de datos

## 📊 Monitoreo

### Métricas Disponibles
- Uptime del servicio
- Tiempo de respuesta de health checks
- Estado de conexión a base de datos
- Uso de memoria y CPU

### Alertas
- Health check failures
- Database connection errors
- High memory usage
- Slow response times

## 🔄 Actualizaciones

### Deploy Automático
- Railway detecta cambios en el repositorio
- Rebuild automático en push a main
- Health check verifica que el servicio esté funcionando

### Deploy Manual
```bash
# Forzar redeploy
railway redeploy

# Deploy desde local
railway up
```

## 📝 Notas Importantes

1. **Puerto**: Railway asigna puerto dinámicamente, usar `process.env.PORT`
2. **Host**: Servidor debe escuchar en `0.0.0.0` para Railway
3. **Health Check**: Usar `/api/health/simple` para Railway
4. **Variables**: Todas las variables requeridas deben estar configuradas
5. **Base de Datos**: Debe estar disponible antes del health check

## 🆘 Soporte

Si encuentras problemas:
1. Revisar logs de Railway
2. Verificar configuración de variables de entorno
3. Probar health checks manualmente
4. Verificar conectividad de base de datos
5. Contactar soporte de Railway si es necesario
