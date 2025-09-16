# 📊 API Documentation - Sistema de Monitoreo de Desempeño Inmobiliario

## 🔗 Base URL
```
http://localhost:5000/api
```

## 🔐 Autenticación
Todos los endpoints requieren autenticación JWT excepto `/api/health`.

**Header requerido:**
```
Authorization: Bearer <jwt_token>
```

---

## 📋 **ENDPOINTS DISPONIBLES**

### 🏥 **Health Check**
```http
GET /api/health
```
**Descripción:** Verificar estado del servidor  
**Acceso:** Público  
**Respuesta:**
```json
{
  "status": "OK",
  "message": "Sistema de Monitoreo de Desempeño Inmobiliario",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "cors": "enabled"
}
```

---

### 🔐 **Autenticación**

#### **Login**
```http
POST /api/auth/login
```
**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "password123"
}
```
**Respuesta:**
```json
{
  "message": "Login exitoso",
  "token": "jwt_token_aqui",
  "user": {
    "id": "user_id",
    "name": "Nombre Usuario",
    "email": "usuario@ejemplo.com",
    "role": "admin"
  }
}
```

---

### 👥 **Usuarios**

#### **Listar Usuarios**
```http
GET /api/users
```
**Acceso:** Admin  
**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Registros por página (default: 10)

**Respuesta:**
```json
{
  "users": [
    {
      "id": "user_id",
      "name": "Nombre Usuario",
      "email": "usuario@ejemplo.com",
      "role": "admin",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

---

### 📊 **Registros de Desempeño**

#### **Crear Registro**
```http
POST /api/performance
```
**Acceso:** Autenticado  
**Body:**
```json
{
  "fecha": "2024-01-15T10:30:00.000Z",
  "consultasRecibidas": 10,
  "muestrasRealizadas": 5,
  "operacionesCerradas": 2,
  "seguimiento": true,
  "usoTokko": "Diario",
  "cantidadPropiedadesTokko": 15,
  "linksTokko": "https://tokko.com/prop1,https://tokko.com/prop2",
  "dificultadTokko": false,
  "detalleDificultadTokko": null,
  "observaciones": "Observaciones generales"
}
```

#### **Obtener Registros**
```http
GET /api/performance
```
**Query Parameters:**
- `userId` (opcional): Filtrar por usuario
- `startDate` (opcional): Fecha inicio (ISO 8601)
- `endDate` (opcional): Fecha fin (ISO 8601)
- `page` (opcional): Página
- `limit` (opcional): Límite por página

#### **Obtener Registro por ID**
```http
GET /api/performance/:id
```

#### **Actualizar Registro**
```http
PUT /api/performance/:id
```

#### **Eliminar Registro**
```http
DELETE /api/performance/:id
```

---

### 📈 **ESTADÍSTICAS GENERALES**

#### **Estadísticas Overview**
```http
GET /api/performance/stats/overview
```
**Acceso:** Admin  
**Query Parameters:**
- `startDate` (opcional): Fecha inicio
- `endDate` (opcional): Fecha fin
- `userId` (opcional): Filtrar por usuario

**Respuesta:**
```json
{
  "totalRecords": 100,
  "totals": {
    "consultasRecibidas": 1000,
    "muestrasRealizadas": 500,
    "operacionesCerradas": 200
  },
  "averages": {
    "consultasRecibidas": 10,
    "muestrasRealizadas": 5,
    "operacionesCerradas": 2
  },
  "conversionRates": {
    "consultasToMuestras": "50.00",
    "muestrasToOperaciones": "40.00"
  }
}
```

---

### 🏢 **MÉTRICAS DE TOKKO CRM** ⭐ **NUEVO**

#### **Métricas de Tokko**
```http
GET /api/performance/stats/tokko
```
**Acceso:** Admin  
**Query Parameters:**
- `startDate` (opcional): Fecha inicio
- `endDate` (opcional): Fecha fin
- `userId` (opcional): Filtrar por usuario

**Respuesta:**
```json
{
  "resumen": {
    "totalRegistrosConTokko": 50,
    "totalPropiedadesCargadas": 750,
    "promedioPropiedadesPorRegistro": 15,
    "totalRegistrosConPropiedades": 50
  },
  "dificultadUso": {
    "total": 30,
    "si": 8,
    "no": 22,
    "porcentajes": {
      "si": 27,
      "no": 73
    }
  },
  "usoTokko": {
    "totalRegistros": 45,
    "distribucion": [
      {
        "tipo": "Diario",
        "cantidad": 25
      },
      {
        "tipo": "Semanal",
        "cantidad": 15
      }
    ]
  },
  "dificultadesDetalladas": [
    {
      "detalle": "Problema con la carga de imágenes",
      "fecha": "2024-01-15T10:30:00.000Z",
      "agente": "Juan Pérez"
    }
  ],
  "porAgente": [
    {
      "agente": {
        "id": "user_id",
        "name": "Juan Pérez",
        "email": "juan@ejemplo.com"
      },
      "totalPropiedades": 150,
      "totalRegistros": 10
    }
  ],
  "registros": [
    {
      "id": "record_id",
      "fecha": "2024-01-15T10:30:00.000Z",
      "agente": {
        "id": "user_id",
        "name": "Juan Pérez",
        "email": "juan@ejemplo.com"
      },
      "cantidadPropiedades": 15,
      "dificultad": false,
      "detalleDificultad": null,
      "usoTokko": "Diario",
      "observaciones": "Todo funcionó bien"
    }
  ]
}
```

#### **Métricas de Tokko (Records)**
```http
GET /api/records/stats/tokko
```
**Acceso:** Admin  
**Query Parameters:**
- `startDate` (opcional): Fecha inicio
- `endDate` (opcional): Fecha fin
- `userId` (opcional): Filtrar por usuario

**Respuesta:** Misma estructura que `/api/performance/stats/tokko`

---

### 📋 **Registros (Records)**

#### **Crear Registro (Agentes)**
```http
POST /api/records
```
**Acceso:** Agente  
**Body:** Mismo formato que `/api/performance`

#### **Obtener Todos los Registros**
```http
GET /api/records
```
**Acceso:** Admin

#### **Estadísticas Generales**
```http
GET /api/records/stats
```
**Acceso:** Admin

---

### 🤖 **IA - Gemini**

#### **Obtener Recomendaciones**
```http
POST /api/gemini/recommendations
```
**Acceso:** Autenticado  
**Body:**
```json
{
  "data": "Datos para analizar"
}
```

---

## 🔧 **CAMPOS DE TOKKO CRM**

### **Campos Disponibles en Performance:**
- `cantidadPropiedadesTokko`: Número entero (cantidad de propiedades cargadas)
- `linksTokko`: String (links separados por comas)
- `dificultadTokko`: Boolean (¿se dificultó el uso?)
- `detalleDificultadTokko`: String (detalle de la dificultad)
- `observaciones`: String (observaciones generales)
- `usoTokko`: String (frecuencia de uso)

### **Métricas Calculadas:**
1. **Total de propiedades cargadas** en Tokko
2. **Promedio de propiedades** por registro
3. **Cantidad de "Sí" y "No"** para dificultad de uso
4. **Porcentajes** de dificultad
5. **Distribución** de tipos de uso
6. **Detalles de dificultades** reportadas
7. **Métricas por agente**

---

## 📊 **EJEMPLOS DE USO PARA FRONTEND**

### **Dashboard Principal:**
```javascript
// Obtener estadísticas generales
const response = await fetch('/api/performance/stats/overview', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const stats = await response.json();
```

### **Dashboard de Tokko:**
```javascript
// Obtener métricas específicas de Tokko
const response = await fetch('/api/performance/stats/tokko', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const tokkoStats = await response.json();

// Mostrar:
// - tokkoStats.resumen.totalPropiedadesCargadas
// - tokkoStats.dificultadUso.porcentajes.si
// - tokkoStats.dificultadesDetalladas
```

### **Gráficos Sugeridos:**
1. **Gráfico de barras:** Propiedades cargadas por agente
2. **Gráfico de dona:** Porcentaje de dificultad (Sí/No)
3. **Gráfico de líneas:** Evolución de propiedades cargadas en el tiempo
4. **Tabla:** Detalles de dificultades reportadas

---

## ⚠️ **NOTAS IMPORTANTES**

1. **Autenticación:** Todos los endpoints requieren JWT excepto `/api/health`
2. **Roles:** 
   - `admin`: Acceso completo
   - `agent`: Solo sus propios registros
3. **Fechas:** Formato ISO 8601 (ej: `2024-01-15T10:30:00.000Z`)
4. **Paginación:** Usar `page` y `limit` en query parameters
5. **Filtros:** `startDate`, `endDate`, `userId` disponibles en la mayoría de endpoints
6. **CORS:** Configurado para `localhost:3000` y `localhost:5001`

---

## 🚀 **ENDPOINTS NUEVOS AGREGADOS**

✅ **GET /api/performance/stats/tokko** - Métricas completas de Tokko CRM  
✅ **GET /api/records/stats/tokko** - Métricas de Tokko (versión records)  

**Funcionalidades incluidas:**
- 📊 Total de propiedades cargadas en Tokko
- 📈 Promedio de propiedades por registro
- ❓ Cantidad de "Sí" y "No" para dificultad de uso
- 📊 Porcentajes de dificultad
- 📝 Detalles de dificultades reportadas
- 👥 Métricas por agente
- 📋 Lista completa de registros con datos de Tokko
