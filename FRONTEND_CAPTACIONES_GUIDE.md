# 📊 GUÍA: Campo Número de Captaciones en API

## 🎯 PROBLEMA IDENTIFICADO

El campo `numeroCaptaciones` **SÍ está siendo enviado** por el backend en todas las respuestas de la API, pero puede que no se esté mostrando correctamente en el frontend.

## 📋 VERIFICACIÓN DE API

### **1. Endpoint: GET /api/performance/stats/weekly/agents**

**Respuesta actual incluye:**
```json
{
  "agentes": [
    {
      "agente": {
        "id": "user_id",
        "name": "Nombre Agente",
        "email": "email@inmobiliaria.com"
      },
      "semanaActual": {
        "totalRegistros": 5,
        "consultasRecibidas": 15,
        "muestrasRealizadas": 8,
        "operacionesCerradas": 3,
        "numeroCaptaciones": 5,  // ← AQUÍ ESTÁ EL CAMPO
        "propiedadesTokko": 12,
        "promedioConsultas": 3,
        "promedioMuestras": 1.6,
        "promedioOperaciones": 0.6,
        "promedioCaptaciones": 1,  // ← Y AQUÍ EL PROMEDIO
        "promedioPropiedades": 2.4
      },
      "semanaAnterior": {
        "numeroCaptaciones": 3  // ← Y EN SEMANA ANTERIOR
      },
      "cambios": {
        "captaciones": {
          "actual": 5,
          "anterior": 3,
          "cambio": 2,
          "porcentaje": 66.67
        }
      }
    }
  ]
}
```

### **2. Endpoint: GET /api/performance/stats/weekly/team**

**Respuesta actual incluye:**
```json
{
  "equipo": {
    "numeroCaptaciones": 25,  // ← TOTAL DEL EQUIPO
    "promedioPorAgente": {
      "captaciones": 2.5  // ← PROMEDIO POR AGENTE
    }
  },
  "ranking": [
    {
      "agente": {
        "name": "Nombre Agente",
        "email": "email@inmobiliaria.com"
      },
      "consultas": 15,
      "muestras": 8,
      "operaciones": 3,
      "captaciones": 5,  // ← AQUÍ EN EL RANKING
      "propiedades": 12,
      "registros": 5
    }
  ]
}
```

### **3. Endpoint: GET /api/performance/stats/weekly/export**

**Respuesta actual incluye:**
```json
{
  "resumen": {
    "numeroCaptaciones": 25  // ← EN RESUMEN
  },
  "agentes": [
    {
      "agente": {
        "name": "Nombre Agente",
        "email": "email@inmobiliaria.com"
      },
      "consultas": 15,
      "muestras": 8,
      "operaciones": 3,
      "captaciones": 5,  // ← AQUÍ EN EXPORTACIÓN
      "propiedades": 12,
      "registros": 5
    }
  ]
}
```

## 🔍 VERIFICACIÓN EN FRONTEND

### **1. Verificar que el campo se esté recibiendo:**

```javascript
// En el componente que consume la API
const response = await fetch('/api/performance/stats/weekly/agents');
const data = await response.json();

console.log('Datos recibidos:', data);
console.log('Primer agente:', data.agentes[0]);
console.log('Captaciones del primer agente:', data.agentes[0].semanaActual.numeroCaptaciones);
```

### **2. Verificar en la tabla de agentes:**

```jsx
// En el componente de tabla
const AgentTable = ({ agentes }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Agente</th>
          <th>Consultas</th>
          <th>Muestras</th>
          <th>Operaciones</th>
          <th>Captaciones</th> {/* ← VERIFICAR QUE ESTA COLUMNA EXISTA */}
          <th>Propiedades</th>
        </tr>
      </thead>
      <tbody>
        {agentes.map((agente, index) => (
          <tr key={index}>
            <td>{agente.agente.name}</td>
            <td>{agente.semanaActual.consultasRecibidas}</td>
            <td>{agente.semanaActual.muestrasRealizadas}</td>
            <td>{agente.semanaActual.operacionesCerradas}</td>
            <td>{agente.semanaActual.numeroCaptaciones}</td> {/* ← VERIFICAR ESTA CELDA */}
            <td>{agente.semanaActual.propiedadesTokko}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

### **3. Verificar en el ranking:**

```jsx
// En el componente de ranking
const RankingCard = ({ agente, position }) => {
  return (
    <div className="ranking-card">
      <div className="position">#{position}</div>
      <div className="agent-name">{agente.agente.name}</div>
      <div className="metrics">
        <div>Consultas: {agente.consultas}</div>
        <div>Muestras: {agente.muestras}</div>
        <div>Operaciones: {agente.operaciones}</div>
        <div>Captaciones: {agente.captaciones}</div> {/* ← VERIFICAR ESTA LÍNEA */}
        <div>Propiedades: {agente.propiedades}</div>
      </div>
    </div>
  );
};
```

## 🚨 POSIBLES PROBLEMAS

### **1. Campo no se está mapeando correctamente:**
```javascript
// ❌ INCORRECTO
const captaciones = agente.captaciones; // No existe

// ✅ CORRECTO
const captaciones = agente.semanaActual.numeroCaptaciones;
```

### **2. Campo no se está mostrando en la UI:**
```jsx
// ❌ INCORRECTO - Falta la columna
<th>Operaciones</th>
<th>Propiedades</th>

// ✅ CORRECTO - Incluir captaciones
<th>Operaciones</th>
<th>Captaciones</th>
<th>Propiedades</th>
```

### **3. Campo se está mostrando como undefined:**
```javascript
// Verificar que el campo existe antes de mostrarlo
const captaciones = agente.semanaActual?.numeroCaptaciones || 0;
```

## 🧪 TESTING

### **1. Probar con datos reales:**
```javascript
// Hacer una llamada a la API y verificar la respuesta
fetch('/api/performance/stats/weekly/agents')
  .then(response => response.json())
  .then(data => {
    console.log('Respuesta completa:', data);
    data.agentes.forEach((agente, index) => {
      console.log(`Agente ${index + 1}:`, {
        nombre: agente.agente.name,
        captaciones: agente.semanaActual.numeroCaptaciones
      });
    });
  });
```

### **2. Verificar en diferentes endpoints:**
- `/api/performance/stats/weekly/agents` - Lista de agentes
- `/api/performance/stats/weekly/team` - Ranking del equipo
- `/api/performance/stats/weekly/export` - Datos para exportación

## 📞 SOLUCIÓN RÁPIDA

Si el campo no aparece en la tabla, verificar:

1. **¿Está la columna "Captaciones" en el header de la tabla?**
2. **¿Está mapeando `agente.semanaActual.numeroCaptaciones`?**
3. **¿Está manejando valores `null` o `undefined`?**

**El backend está enviando el campo correctamente. El problema debe estar en el frontend.** 🎯
