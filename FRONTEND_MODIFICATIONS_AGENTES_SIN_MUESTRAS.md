# 🎯 MODIFICACIONES FRONTEND - Agentes Sin Muestras

## 📋 RESUMEN EJECUTIVO

**Objetivo**: Permitir que `agente3@inmobiliaria.com` y `agente4@inmobiliaria.com` puedan registrar performance sin el campo "Muestras Realizadas".

**Tiempo estimado**: 30-45 minutos
**Prioridad**: Alta
**Impacto**: Bajo (solo afecta a 2 agentes específicos)

---

## 🔧 CAMBIOS NECESARIOS

### **1. Identificación de Agentes Sin Muestras**

```javascript
// Función helper para identificar agentes sin muestras
const isAgentWithoutSamples = (email) => {
  return email === 'agente3@inmobiliaria.com' || 
         email === 'agente4@inmobiliaria.com';
};

// O si prefieres usar un array para escalabilidad futura
const AGENTS_WITHOUT_SAMPLES = [
  'agente3@inmobiliaria.com',
  'agente4@inmobiliaria.com'
];

const isAgentWithoutSamples = (email) => {
  return AGENTS_WITHOUT_SAMPLES.includes(email);
};
```

### **2. Modificación del Formulario de Performance**

#### **Opción A: Campo Condicional (Recomendada)**

```jsx
// En el componente del formulario de performance
const PerformanceForm = ({ currentUser }) => {
  const isWithoutSamples = isAgentWithoutSamples(currentUser.email);

  return (
    <form>
      {/* Campos existentes */}
      <FormField
        name="consultasRecibidas"
        label="Consultas Recibidas"
        type="number"
        required={true}
      />
      
      <FormField
        name="operacionesCerradas"
        label="Operaciones Cerradas"
        type="number"
        required={true}
      />
      
      <FormField
        name="numeroCaptaciones"
        label="Número de Captaciones"
        type="number"
        required={true}
      />
      
      {/* Campo de muestras - solo para agentes con muestras */}
      {!isWithoutSamples && (
        <FormField
          name="muestrasRealizadas"
          label="Muestras Realizadas"
          type="number"
          required={true}
        />
      )}
      
      {/* Mensaje informativo para agentes sin muestras */}
      {isWithoutSamples && (
        <div className="info-message bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800">Agente Sin Muestras</h4>
              <p className="text-sm text-blue-700 mt-1">
                Tu rendimiento se evaluará por consultas recibidas y captaciones realizadas.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Resto de campos existentes */}
    </form>
  );
};
```

#### **Opción B: Campo Opcional (Más Simple)**

```jsx
<FormField
  name="muestrasRealizadas"
  label="Muestras Realizadas"
  type="number"
  required={!isAgentWithoutSamples(currentUser.email)}
  disabled={isAgentWithoutSamples(currentUser.email)}
  placeholder={isAgentWithoutSamples(currentUser.email) ? "No aplica para este agente" : "Ingrese cantidad"}
  helperText={isAgentWithoutSamples(currentUser.email) ? "Este agente no realiza muestras" : ""}
/>
```

### **3. Validación del Formulario**

```javascript
// En las validaciones del formulario
const validationRules = {
  consultasRecibidas: { 
    required: true, 
    min: 0,
    message: "Consultas recibidas es requerido"
  },
  operacionesCerradas: { 
    required: true, 
    min: 0,
    message: "Operaciones cerradas es requerido"
  },
  numeroCaptaciones: { 
    required: true, 
    min: 0,
    message: "Número de captaciones es requerido"
  },
  muestrasRealizadas: { 
    required: !isAgentWithoutSamples(currentUser.email), // ← Cambio clave
    min: 0,
    message: "Muestras realizadas es requerido"
  }
};

// O usando Yup/Formik
const validationSchema = Yup.object({
  consultasRecibidas: Yup.number().min(0).required(),
  operacionesCerradas: Yup.number().min(0).required(),
  numeroCaptaciones: Yup.number().min(0).required(),
  muestrasRealizadas: isAgentWithoutSamples(currentUser.email) 
    ? Yup.number().min(0).nullable() // Opcional
    : Yup.number().min(0).required() // Requerido
});
```

### **4. Envío de Datos al Backend**

```javascript
// Al enviar el formulario, asegurar que muestrasRealizadas sea null para agentes sin muestras
const handleSubmit = (formData) => {
  const dataToSend = {
    ...formData,
    // Si es agente sin muestras, enviar null en lugar de 0
    muestrasRealizadas: isAgentWithoutSamples(currentUser.email) 
      ? null 
      : formData.muestrasRealizadas || 0
  };
  
  // Enviar al backend
  submitPerformance(dataToSend);
};
```

### **5. Dashboard de Rankings (Opcional)**

```jsx
// Si quieres mostrar información adicional en el dashboard
const RankingCard = ({ agent, position }) => {
  const isWithoutSamples = isAgentWithoutSamples(agent.email);
  
  return (
    <div className="ranking-card">
      <div className="position">#{position}</div>
      <div className="agent-name">{agent.name}</div>
      
      {isWithoutSamples && (
        <div className="badge bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
          Sin Muestras
        </div>
      )}
      
      <div className="metrics">
        <div>Consultas: {agent.consultas}</div>
        <div>Captaciones: {agent.captaciones}</div>
        {!isWithoutSamples && <div>Muestras: {agent.muestras}</div>}
        {!isWithoutSamples && <div>Operaciones: {agent.operaciones}</div>}
      </div>
    </div>
  );
};
```

---

## 🧪 TESTING

### **Casos de Prueba**

1. **Agente Normal (con muestras)**:
   - ✅ Debe poder llenar el campo "Muestras Realizadas"
   - ✅ Campo debe ser requerido
   - ✅ Validación debe funcionar

2. **Agente3 (sin muestras)**:
   - ✅ Campo "Muestras Realizadas" debe estar oculto/deshabilitado
   - ✅ Debe poder enviar formulario sin muestras
   - ✅ Debe mostrar mensaje informativo

3. **Agente4 (sin muestras)**:
   - ✅ Mismo comportamiento que Agente3

4. **Backend**:
   - ✅ Debe aceptar `muestrasRealizadas: null` para estos agentes
   - ✅ Ranking debe calcularse correctamente

### **Datos de Prueba**

```javascript
// Usuario de prueba para Agente3
const testUserAgente3 = {
  email: 'agente3@inmobiliaria.com',
  name: 'Enrique Perez',
  role: 'agent'
};

// Datos de performance de prueba
const testPerformanceData = {
  consultasRecibidas: 15,
  operacionesCerradas: 0, // No puede cerrar sin muestras
  numeroCaptaciones: 8,
  muestrasRealizadas: null, // ← Esto debe funcionar
  seguimiento: true
};
```

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Agregar función `isAgentWithoutSamples()`
- [ ] Modificar formulario de performance
- [ ] Actualizar validaciones
- [ ] Ajustar envío de datos al backend
- [ ] Probar con agente3@inmobiliaria.com
- [ ] Probar con agente4@inmobiliaria.com
- [ ] Probar con agente normal (regresión)
- [ ] Verificar que el ranking funciona correctamente

---

## 🚨 NOTAS IMPORTANTES

1. **Backend ya está listo**: No necesita cambios adicionales
2. **Solo afecta a 2 agentes**: agente3 y agente4
3. **Sistema existente**: Sigue funcionando igual para todos los demás
4. **Ranking automático**: El backend ya calcula el ranking correctamente
5. **Escalabilidad**: Fácil agregar más agentes sin muestras en el futuro

---

## 📞 SOPORTE

Si tienes dudas durante la implementación:
1. Verificar que el backend esté corriendo
2. Revisar la consola del navegador para errores
3. Confirmar que los emails coincidan exactamente
4. Probar con datos reales de los agentes

**¡La implementación debe ser rápida y sin complicaciones!** 🚀
