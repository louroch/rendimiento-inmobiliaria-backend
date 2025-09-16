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

---

## 📈 **ESTADÍSTICAS GENERALES**

#### **Estadísticas Overview**
```http
GET /api/performance/stats/overview
```
**Acceso:** Admin  
**Query Parameters:**
- `startDate` (opcional): Fecha inicio
- `endDate` (opcional): Fecha fin
- `userId` (opcional): Filtrar por usuario

---

## 🏢 **MÉTRICAS DE TOKKO CRM**

#### **Métricas de Tokko**
```http
GET /api/performance/stats/tokko
```
**Acceso:** Admin  
**Query Parameters:**
- `startDate` (opcional): Fecha inicio
- `endDate` (opcional): Fecha fin
- `userId` (opcional): Filtrar por usuario

---

## 📅 **DESEMPEÑO SEMANAL** ⭐ **NUEVA FUNCIONALIDAD**

### **GET /api/performance/stats/weekly**
**Descripción:** Métricas semanales generales  
**Acceso:** Admin  
**Query Parameters:**
- `date` (opcional): Fecha de referencia (ISO 8601)
- `weekNumber` (opcional): Número de semana del año
- `year` (opcional): Año (requerido si se usa weekNumber)

**Respuesta:**
```json
{
  "semana": {
    "numero": 3,
    "inicio": "2024-01-15T00:00:00.000Z",
    "fin": "2024-01-21T23:59:59.999Z",
    "inicioFormateado": "15 de enero de 2024",
    "finFormateado": "21 de enero de 2024"
  },
  "resumen": {
    "totalRegistros": 50,
    "consultasRecibidas": 150,
    "muestrasRealizadas": 75,
    "operacionesCerradas": 30,
    "propiedadesTokko": 225,
    "porcentajeSeguimiento": 85,
    "porcentajeDificultad": 27
  },
  "promedios": {
    "consultasPorDia": 21,
    "muestrasPorDia": 11,
    "operacionesPorDia": 4,
    "propiedadesPorDia": 32
  },
  "cambios": {
    "consultas": {
      "value": 150,
      "percentage": 12,
      "trend": "up"
    },
    "muestras": {
      "value": 75,
      "percentage": 8,
      "trend": "up"
    }
  },
  "semanaAnterior": {
    "inicio": "2024-01-08T00:00:00.000Z",
    "fin": "2024-01-14T23:59:59.999Z",
    "totalRegistros": 45,
    "consultasRecibidas": 134,
    "muestrasRealizadas": 69,
    "operacionesCerradas": 28,
    "propiedadesTokko": 208
  }
}
```

### **GET /api/performance/stats/weekly/agents**
**Descripción:** Métricas semanales por agente  
**Acceso:** Admin  
**Query Parameters:** Mismos que `/stats/weekly`

**Respuesta:**
```json
{
  "semana": { /* información de la semana */ },
  "agentes": [
    {
      "agente": {
        "id": "user_id",
        "name": "Juan Pérez",
        "email": "juan@ejemplo.com",
        "role": "agent"
      },
      "semanaActual": {
        "totalRegistros": 10,
        "consultasRecibidas": 45,
        "muestrasRealizadas": 22,
        "operacionesCerradas": 8,
        "propiedadesTokko": 65,
        "promedioConsultas": 4,
        "promedioMuestras": 2,
        "promedioOperaciones": 1,
        "promedioPropiedades": 7
      },
      "semanaAnterior": { /* métricas de la semana anterior */ },
      "cambios": {
        "consultas": { "value": 45, "percentage": 15, "trend": "up" },
        "muestras": { "value": 22, "percentage": 10, "trend": "up" }
      }
    }
  ],
  "totalAgentes": 5
}
```

### **GET /api/performance/stats/weekly/team**
**Descripción:** Métricas semanales consolidadas del equipo  
**Acceso:** Admin  
**Query Parameters:** Mismos que `/stats/weekly`

**Respuesta:**
```json
{
  "semana": { /* información de la semana */ },
  "equipo": {
    "totalAgentes": 5,
    "totalRegistros": 50,
    "consultasRecibidas": 150,
    "muestrasRealizadas": 75,
    "operacionesCerradas": 30,
    "propiedadesTokko": 225,
    "promedioPorAgente": {
      "consultas": 30,
      "muestras": 15,
      "operaciones": 6,
      "propiedades": 45
    }
  },
  "tasasConversion": {
    "consultasToMuestras": 50,
    "muestrasToOperaciones": 40,
    "consultasToOperaciones": 20
  },
  "cambios": { /* cambios vs semana anterior */ },
  "ranking": [
    {
      "agente": { "name": "Juan Pérez", "email": "juan@ejemplo.com" },
      "consultas": 45,
      "muestras": 22,
      "operaciones": 8,
      "propiedades": 65,
      "registros": 10
    }
  ],
  "semanaAnterior": { /* métricas de la semana anterior */ }
}
```

### **GET /api/performance/stats/weekly/export**
**Descripción:** Datos para exportación PDF  
**Acceso:** Admin  
**Query Parameters:**
- `date` (opcional): Fecha de referencia
- `weekNumber` (opcional): Número de semana
- `year` (opcional): Año
- `format` (opcional): 'pdf' o 'json' (default: 'pdf')

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "semana": { /* información de la semana */ },
      "generado": "2024-01-15T10:30:00.000Z",
      "formato": "pdf"
    },
    "resumen": { /* métricas generales */ },
    "agentes": [ /* lista de agentes con métricas */ ]
  },
  "message": "Datos listos para generación de PDF",
  "instructions": {
    "frontend": "Usar estos datos con una librería como jsPDF o react-pdf",
    "campos": [
      "metadata.semana - Información de la semana",
      "resumen - Métricas generales del equipo",
      "agentes - Lista de agentes con sus métricas"
    ]
  }
}
```

---

## 🔧 **FUNCIONALIDADES DE DESEMPEÑO SEMANAL**

### **Agrupación por Semana:**
- ✅ **Lunes a Sábado** - Semana laboral estándar
- ✅ **Filtros flexibles** - Por fecha, número de semana, o semana actual
- ✅ **Comparación automática** - Con semana anterior

### **Métricas Incluidas:**
- ✅ **Consultas recibidas** - Total y promedio por día
- ✅ **Muestras realizadas** - Total y promedio por día  
- ✅ **Operaciones cerradas** - Total y promedio por día
- ✅ **Propiedades cargadas en Tokko** - Total y promedio por día
- ✅ **Porcentaje de seguimiento** - Basado en campo `seguimiento`
- ✅ **Dificultades reportadas** - Basado en campo `dificultadTokko`

### **Análisis Comparativo:**
- ✅ **Cambios vs semana anterior** - Porcentajes y tendencias
- ✅ **Ranking de agentes** - Ordenado por consultas
- ✅ **Tasas de conversión** - Consultas → Muestras → Operaciones
- ✅ **Tendencias** - Identificación de mejoras/declives

### **Exportación PDF:**
- ✅ **Datos estructurados** - Listos para renderizado
- ✅ **Metadatos completos** - Información de la semana
- ✅ **Instrucciones** - Para integración con librerías PDF

---

## 📋 **EJEMPLOS DE USO PARA FRONTEND**

### **Dashboard Semanal:**
```javascript
// Obtener métricas generales de la semana
const response = await fetch('/api/performance/stats/weekly', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const weeklyStats = await response.json();

// Mostrar:
// - weeklyStats.resumen.consultasRecibidas
// - weeklyStats.cambios.consultas.percentage
// - weeklyStats.semana.inicioFormateado
```

### **Ranking de Agentes:**
```javascript
// Obtener métricas por agente
const response = await fetch('/api/performance/stats/weekly/agents', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const agentStats = await response.json();

// Mostrar ranking:
// - agentStats.agentes (ya ordenado por consultas)
// - agentStats.agentes[0].cambios.consultas.trend
```

### **Exportación PDF:**
```javascript
// Obtener datos para PDF
const response = await fetch('/api/performance/stats/weekly/export?format=pdf', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const exportData = await response.json();

// Usar con jsPDF:
// const doc = new jsPDF();
// doc.text(`Semana ${exportData.data.metadata.semana.numero}`, 20, 20);
// doc.text(`Consultas: ${exportData.data.resumen.consultasRecibidas}`, 20, 40);
```

---

## 🚀 **ENDPOINTS IMPLEMENTADOS**

### **Desempeño Semanal:** ⭐ **NUEVO**
✅ **GET /api/performance/stats/weekly** - Métricas semanales generales  
✅ **GET /api/performance/stats/weekly/agents** - Métricas semanales por agente  
✅ **GET /api/performance/stats/weekly/team** - Métricas semanales consolidadas del equipo  
✅ **GET /api/performance/stats/weekly/export** - Datos para exportación PDF  

### **Métricas de Tokko CRM:**
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
- 📅 **Agrupación semanal (Lunes a Sábado)**
- 📈 **Comparación con semana anterior**
- 🏆 **Ranking de agentes**
- 📊 **Tasas de conversión**
- 📄 **Exportación PDF**

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
7. **Semana:** Lunes a Sábado (días laborales)
8. **Comparaciones:** Automáticas con semana anterior
9. **Exportación:** Datos estructurados para librerías PDF del frontend