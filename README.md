# Backend - Sistema de Monitoreo de Desempeño Inmobiliario

API REST para el sistema de monitoreo de desempeño inmobiliario.

## 🚀 Deploy en Railway

### 1. Preparar el repositorio
```bash
# Clonar solo el directorio backend
git clone <repo-url> backend-repo
cd backend-repo
```

### 2. Configurar variables de entorno en Railway
- `DATABASE_URL`: URL de conexión a MongoDB Atlas
- `JWT_SECRET`: Clave secreta para JWT (generar una segura)
- `FRONTEND_URL`: URL del frontend en Vercel
- `GEMINI_API_KEY`: (Opcional) API key de Google Gemini
- `NODE_ENV`: production

### 3. Deploy automático
Railway detectará automáticamente el `package.json` y desplegará la aplicación.

### 4. Health Check
El endpoint `/api/health` está configurado para el health check de Railway.

## 📋 Endpoints disponibles

- `POST /api/auth/login` - Autenticación
- `GET /api/users` - Listar usuarios
- `POST /api/performance` - Crear registro de desempeño
- `GET /api/records` - Obtener registros
- `POST /api/gemini/recommendations` - Recomendaciones con IA

## 🔧 Desarrollo local

```bash
npm install
npm run dev
```

El servidor se ejecutará en `http://localhost:5000`
