# 📡 API Documentation

Documentación completa de la API del Sistema de Monitoreo de Desempeño Inmobiliario.

## 🔐 Autenticación

Todos los endpoints (excepto `/api/health` y `/api/auth/*`) requieren autenticación JWT.

### **Headers Requeridos**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### **Respuestas de Error de Autenticación**
```json
{
  "error": "Token no válido",
  "message": "El token JWT proporcionado no es válido o ha expirado"
}
```

## 📊 Endpoints de Desempeño

### **GET /api/performance**

Obtiene registros de desempeño con paginación optimizada.

#### **Query Parameters**
| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `page` | number | Número de página | `1` |
| `limit` | number | Elementos por página (max 100) | `10` |
| `userId` | string | Filtrar por usuario (solo admin) | `"60f7b3b3b3b3b3b3b3b3b3b3"` |
| `startDate` | string | Fecha de inicio (ISO) | `"2024-01-01"` |
| `endDate` | string | Fecha de fin (ISO) | `"2024-01-31"` |
| `search` | string | Búsqueda en observaciones | `"tokko"` |
| `sortBy` | string | Campo de ordenamiento | `"fecha"` |
| `sortOrder` | string | Orden (asc/desc) | `"desc"` |

#### **Ejemplo de Request**
```http
GET /api/performance?page=1&limit=10&startDate=2024-01-01&search=tokko
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Ejemplo de Response**
```json
{
  "performance": [
    {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "userId": "60f7b3b3b3b3b3b3b3b3b3b4",
      "fecha": "2024-01-15T00:00:00.000Z",
      "consultasRecibidas": 25,
      "muestrasRealizadas": 8,
      "operacionesCerradas": 3,
      "numeroCaptaciones": 5,
      "cantidadPropiedadesTokko": 12,
      "linksTokko": "https://tokko.com/prop1,https://tokko.com/prop2",
      "dificultadTokko": false,
      "detalleDificultadTokko": null,
      "observaciones": "Excelente semana, sin dificultades con Tokko",
      "seguimiento": true,
      "usoTokko": "Frecuente",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "user": {
        "id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "name": "Juan Pérez",
        "email": "juan@inmobiliaria.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "filters": {
    "applied": {
      "fecha": {
        "gte": "2024-01-01T00:00:00.000Z"
      }
    },
    "search": "tokko",
    "sortBy": "fecha",
    "sortOrder": "desc"
  },
  "meta": {
    "queryTime": 45,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### **POST /api/performance**

Crea un nuevo registro de desempeño.

#### **Request Body**
```json
{
  "fecha": "2024-01-15",
  "consultasRecibidas": 25,
  "muestrasRealizadas": 8,
  "operacionesCerradas": 3,
  "numeroCaptaciones": 5,
  "cantidadPropiedadesTokko": 12,
  "linksTokko": "https://tokko.com/prop1,https://tokko.com/prop2",
  "dificultadTokko": false,
  "detalleDificultadTokko": null,
  "observaciones": "Excelente semana, sin dificultades con Tokko",
  "seguimiento": true,
  "usoTokko": "Frecuente"
}
```

#### **Response**
```json
{
  "message": "Registro de desempeño creado exitosamente",
  "performance": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "userId": "60f7b3b3b3b3b3b3b3b3b3b4",
    "fecha": "2024-01-15T00:00:00.000Z",
    "consultasRecibidas": 25,
    "muestrasRealizadas": 8,
    "operacionesCerradas": 3,
    "numeroCaptaciones": 5,
    "cantidadPropiedadesTokko": 12,
    "linksTokko": "https://tokko.com/prop1,https://tokko.com/prop2",
    "dificultadTokko": false,
    "detalleDificultadTokko": null,
    "observaciones": "Excelente semana, sin dificultades con Tokko",
    "seguimiento": true,
    "usoTokko": "Frecuente",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 📈 Endpoints de Estadísticas

### **GET /api/performance/stats/weekly**

Obtiene estadísticas semanales generales (con cache).

#### **Query Parameters**
| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `date` | string | Fecha específica (ISO) | `"2024-01-15"` |
| `weekNumber` | number | Número de semana | `3` |
| `year` | number | Año | `2024` |

#### **Response**
```json
{
  "semana": {
    "numero": 3,
    "inicio": "2024-01-15T00:00:00.000Z",
    "fin": "2024-01-21T23:59:59.999Z",
    "inicioFormateado": "15/01/2024",
    "finFormateado": "21/01/2024"
  },
  "resumen": {
    "totalRegistros": 25,
    "consultasRecibidas": 450,
    "muestrasRealizadas": 120,
    "operacionesCerradas": 35,
    "numeroCaptaciones": 80,
    "propiedadesTokko": 180,
    "porcentajeSeguimiento": 85,
    "porcentajeDificultad": 15
  },
  "promedios": {
    "consultasPorDia": 64,
    "muestrasPorDia": 17,
    "operacionesPorDia": 5,
    "captacionesPorDia": 11,
    "propiedadesPorDia": 26
  },
  "cambios": {
    "consultas": { "valor": 15, "porcentaje": 3.4, "tendencia": "up" },
    "muestras": { "valor": -5, "porcentaje": -4.0, "tendencia": "down" },
    "operaciones": { "valor": 8, "porcentaje": 29.6, "tendencia": "up" },
    "captaciones": { "valor": 12, "porcentaje": 17.6, "tendencia": "up" },
    "propiedades": { "valor": 25, "porcentaje": 16.1, "tendencia": "up" }
  },
  "semanaAnterior": {
    "inicio": "2024-01-08T00:00:00.000Z",
    "fin": "2024-01-14T23:59:59.999Z",
    "totalRegistros": 22,
    "consultasRecibidas": 435,
    "muestrasRealizadas": 125,
    "operacionesCerradas": 27,
    "numeroCaptaciones": 68,
    "propiedadesTokko": 155
  }
}
```

### **GET /api/performance/stats/weekly/agents**

Obtiene estadísticas semanales por agente.

#### **Response**
```json
{
  "semana": {
    "numero": 3,
    "inicio": "2024-01-15T00:00:00.000Z",
    "fin": "2024-01-21T23:59:59.999Z"
  },
  "agentes": [
    {
      "userId": "60f7b3b3b3b3b3b3b3b3b3b4",
      "user": {
        "id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "name": "Juan Pérez",
        "email": "juan@inmobiliaria.com"
      },
      "estadisticas": {
        "consultasRecibidas": 45,
        "muestrasRealizadas": 12,
        "operacionesCerradas": 4,
        "numeroCaptaciones": 8,
        "propiedadesTokko": 15,
        "seguimiento": true,
        "dificultadTokko": false
      },
      "cambios": {
        "consultas": { "valor": 5, "porcentaje": 12.5, "tendencia": "up" },
        "muestras": { "valor": -2, "porcentaje": -14.3, "tendencia": "down" },
        "operaciones": { "valor": 1, "porcentaje": 33.3, "tendencia": "up" }
      }
    }
  ],
  "resumen": {
    "totalAgentes": 8,
    "promedioConsultas": 56.25,
    "promedioMuestras": 15.0,
    "promedioOperaciones": 4.375
  }
}
```

## 🔍 Health Checks

### **GET /api/health**

Health check básico del sistema.

#### **Response**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": 45,
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "responseTime": 12
  }
}
```

### **GET /api/health/detailed**

Health check detallado con información de todos los componentes.

#### **Response**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": 120,
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600,
  "components": {
    "database": {
      "status": "connected",
      "responseTime": 12,
      "pool": {
        "limit": 10,
        "timeout": 10000
      }
    },
    "redis": {
      "status": "connected",
      "responseTime": 5
    },
    "system": {
      "status": "healthy",
      "memory": {
        "used": 52428800,
        "total": 1073741824,
        "percentage": 5
      },
      "cpu": {
        "loadAverage": [0.5, 0.3, 0.2],
        "cpuCount": 8
      }
    },
    "disk": {
      "status": "healthy",
      "logs": {
        "directory": "./logs",
        "exists": true,
        "size": 1024000,
        "files": 4
      }
    }
  },
  "logs": {
    "directory": "./logs",
    "files": [
      {
        "name": "combined-2024-01-15.log",
        "path": "./logs/combined-2024-01-15.log",
        "size": 512000
      }
    ],
    "totalSize": 1024000
  }
}
```

## ⚠️ Códigos de Error

### **Códigos HTTP**
| Código | Descripción |
|--------|-------------|
| `200` | OK - Request exitoso |
| `201` | Created - Recurso creado |
| `400` | Bad Request - Datos inválidos |
| `401` | Unauthorized - Token inválido |
| `403` | Forbidden - Sin permisos |
| `404` | Not Found - Recurso no encontrado |
| `409` | Conflict - Conflicto de datos |
| `429` | Too Many Requests - Rate limit excedido |
| `500` | Internal Server Error - Error del servidor |
| `503` | Service Unavailable - Servicio no disponible |

### **Errores de Validación**
```json
{
  "error": "Datos de entrada inválidos",
  "message": "Los datos proporcionados no son válidos",
  "details": [
    {
      "field": "consultasRecibidas",
      "message": "Debe ser un número entero positivo",
      "value": -5
    }
  ]
}
```

### **Errores de Rate Limiting**
```json
{
  "error": "Demasiadas solicitudes",
  "message": "Has excedido el límite de solicitudes. Intenta de nuevo más tarde.",
  "retryAfter": 900
}
```

## 🔒 Rate Limiting

### **Límites por Endpoint**

| Endpoint | Límite | Ventana | Descripción |
|----------|--------|---------|-------------|
| `/api/auth/login` | 5 requests | 15 min | Login estricto |
| `/api/performance` (GET) | 60 requests | 1 min | Consultas |
| `/api/performance` (POST) | 20 requests | 5 min | Creación |
| `/api/reports/*` | 10 requests | 10 min | Reportes |
| `/api/gemini/*` | 10 requests | 1 hora | IA |
| General | 200 requests | 15 min | Navegación |

### **Headers de Rate Limiting**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 📝 Paginación

### **Parámetros de Paginación**
- `page`: Número de página (inicia en 1)
- `limit`: Elementos por página (máximo 100)
- `sortBy`: Campo de ordenamiento
- `sortOrder`: Orden (asc/desc)

### **Respuesta de Paginación**
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  }
}
```

## 🔍 Búsqueda y Filtros

### **Búsqueda de Texto**
- Busca en campos: `observaciones`, `usoTokko`, `detalleDificultadTokko`
- Case-insensitive
- Búsqueda parcial

### **Filtros de Fecha**
- `startDate`: Fecha de inicio (inclusive)
- `endDate`: Fecha de fin (inclusive)
- Formato ISO 8601

### **Ordenamiento**
- Campos disponibles: `fecha`, `consultasRecibidas`, `operacionesCerradas`, etc.
- Orden: `asc` o `desc`
- Default: `fecha desc`
