# 🔧 Guía de Solución de Problemas - Frontend

## ❌ **PROBLEMA IDENTIFICADO: Error de Conectividad**

### **Error en Frontend:**
```
api.ts:26 Error en petición API: mt
api.ts:33 Error de conectividad con el servidor: timeout of 10000ms exceeded
useGeminiRecommendations.ts:56 Error fetching Gemini recommendations: Error: No se puede conectar con el servidor
```

### **✅ DIAGNÓSTICO: Backend Funcionando Correctamente**
- ✅ Puerto 5000 está escuchando
- ✅ Endpoint `/api/health` responde correctamente
- ✅ CORS configurado correctamente
- ✅ Servidor backend operativo

---

## 🎯 **CAUSAS POSIBLES Y SOLUCIONES**

### **1. URL del Backend Incorrecta en Frontend**

**Problema:** El frontend está intentando conectarse a una URL incorrecta.

**Solución:** Verificar la configuración de la URL base en el frontend:

```typescript
// En tu archivo de configuración del frontend (api.ts o config.ts)
const API_BASE_URL = 'http://localhost:5000/api'; // ✅ Correcto
// NO usar: 'http://127.0.0.1:5000/api' o 'https://localhost:5000/api'
```

### **2. Configuración de Axios Incorrecta**

**Problema:** Timeout muy bajo o configuración incorrecta de Axios.

**Solución:** Ajustar la configuración de Axios:

```typescript
// En tu archivo api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000, // ✅ Aumentar timeout a 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Timeout: El servidor tardó demasiado en responder');
    }
    if (error.response) {
      // El servidor respondió con un código de error
      throw new Error(`Error del servidor: ${error.response.status}`);
    } else if (error.request) {
      // No se recibió respuesta del servidor
      throw new Error('No se puede conectar con el servidor. Verifica que el backend esté funcionando.');
    } else {
      // Error en la configuración de la petición
      throw new Error(`Error de configuración: ${error.message}`);
    }
  }
);
```

### **3. Problema de CORS (Menos Probable)**

**Problema:** Aunque CORS está configurado, puede haber un problema específico.

**Solución:** Verificar que el frontend esté en uno de los orígenes permitidos:

```javascript
// En index.js del backend (ya configurado)
app.use(cors({
  origin: [
    'https://rendimiento-inmobiliaria-frontend.vercel.app',
    'http://localhost:3000',        // ✅ React dev server
    'http://localhost:5001',        // ✅ Puerto alternativo
    'http://127.0.0.1:3000'        // ✅ IP local
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));
```

### **4. Puerto del Frontend en Conflicto**

**Problema:** El frontend puede estar corriendo en un puerto que no está en la lista de CORS.

**Solución:** 
1. Verificar en qué puerto está corriendo el frontend
2. Agregar el puerto a la configuración de CORS si es necesario

```bash
# Verificar puerto del frontend
netstat -an | findstr :3000
netstat -an | findstr :5001
```

---

## 🧪 **PRUEBAS DE CONECTIVIDAD**

### **1. Prueba Básica desde el Navegador**
Abrir en el navegador: `http://localhost:5000/api/health`

**Resultado esperado:**
```json
{
  "status": "OK",
  "message": "Sistema de Monitoreo de Desempeño Inmobiliario",
  "timestamp": "2025-09-16T02:34:02.863Z",
  "cors": "enabled"
}
```

### **2. Prueba de Endpoint de Gemini**
```bash
# Desde PowerShell
Invoke-WebRequest -Uri "http://localhost:5000/api/gemini/recommendations" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{}'
```

### **3. Prueba desde el Frontend (Consola del Navegador)**
```javascript
// Ejecutar en la consola del navegador
fetch('http://localhost:5000/api/health')
  .then(response => response.json())
  .then(data => console.log('✅ Backend conectado:', data))
  .catch(error => console.error('❌ Error de conexión:', error));
```

---

## 🔧 **CONFIGURACIÓN RECOMENDADA PARA FRONTEND**

### **1. Archivo de Configuración (config.ts)**
```typescript
export const config = {
  API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://tu-backend-produccion.com/api'
    : 'http://localhost:5000/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};
```

### **2. Hook de Recomendaciones Mejorado**
```typescript
// useGeminiRecommendations.ts
import { useState, useEffect } from 'react';
import { config } from '../config';

export const useGeminiRecommendations = (type = 'general', filters = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecommendations = async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = type === 'personal' 
        ? '/api/gemini/advisor-recommendations'
        : '/api/gemini/recommendations';
        
      const response = await fetch(`${config.API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters),
        signal: AbortSignal.timeout(config.TIMEOUT)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      if (retryCount < config.RETRY_ATTEMPTS) {
        console.log(`Reintentando... (${retryCount + 1}/${config.RETRY_ATTEMPTS})`);
        setTimeout(() => fetchRecommendations(retryCount + 1), config.RETRY_DELAY);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [type, JSON.stringify(filters)]);

  return { data, loading, error, refetch: fetchRecommendations };
};
```

### **3. Componente con Manejo de Errores Mejorado**
```tsx
// GeminiRecommendations.tsx
import React from 'react';
import { useGeminiRecommendations } from '../hooks/useGeminiRecommendations';

const GeminiRecommendations = ({ type = 'general', filters = {} }) => {
  const { data, loading, error, refetch } = useGeminiRecommendations(type, filters);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner">🔄</div>
        <p>Generando recomendaciones con IA...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">❌</div>
        <h4>Error de Conexión</h4>
        <p>{error}</p>
        <button onClick={refetch} className="retry-btn">
          🔄 Reintentar
        </button>
      </div>
    );
  }

  if (!data?.recommendations) {
    return (
      <div className="no-data">
        <p>No hay recomendaciones disponibles</p>
      </div>
    );
  }

  return (
    <div className="gemini-recommendations">
      <h3>🤖 Recomendaciones de IA</h3>
      <div className="recommendations-list">
        {data.recommendations.map((recommendation, index) => (
          <div key={index} className="recommendation-item">
            {recommendation.split('\n').map((line, i) => (
              <p 
                key={i} 
                className={line.startsWith('**') ? 'recommendation-title' : 'recommendation-text'}
              >
                {line.replace(/\*\*/g, '')}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GeminiRecommendations;
```

---

## 🚀 **PASOS PARA SOLUCIONAR**

### **1. Verificar Configuración del Frontend**
- [ ] URL base del API correcta (`http://localhost:5000/api`)
- [ ] Timeout configurado (mínimo 30 segundos)
- [ ] Headers correctos en las peticiones

### **2. Probar Conectividad**
- [ ] Abrir `http://localhost:5000/api/health` en el navegador
- [ ] Verificar que el backend esté corriendo
- [ ] Probar desde la consola del navegador

### **3. Implementar Manejo de Errores**
- [ ] Agregar retry automático
- [ ] Mostrar mensajes de error claros
- [ ] Implementar botón de reintentar

### **4. Verificar CORS**
- [ ] Confirmar que el puerto del frontend esté en la lista de CORS
- [ ] Verificar que no haya conflictos de puertos

---

## 📞 **SOPORTE ADICIONAL**

Si el problema persiste después de seguir estos pasos:

1. **Verificar logs del backend** en la consola donde está corriendo
2. **Revisar la consola del navegador** para errores adicionales
3. **Probar con Postman** o similar para verificar que los endpoints funcionan
4. **Verificar que no haya firewall** bloqueando la conexión

**El backend está funcionando correctamente, el problema está en la configuración del frontend.** 🎯
