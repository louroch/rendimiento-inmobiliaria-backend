# 🚨 INSTRUCCIONES URGENTES - FRONTEND

## 📋 RESUMEN EJECUTIVO

**Problema**: Los agentes `agente3@inmobiliaria.com` y `agente4@inmobiliaria.com` no pueden registrar performance porque el formulario requiere "Muestras Realizadas", pero estos agentes no realizan muestras.

**Solución**: Hacer el campo "Muestras Realizadas" opcional solo para estos 2 agentes específicos.

**Tiempo estimado**: 30-45 minutos
**Prioridad**: URGENTE
**Backend**: ✅ Ya está listo

---

## 🎯 CAMBIO REQUERIDO

### **Archivo a modificar**: Formulario de Performance
### **Cambio**: Hacer campo "Muestras Realizadas" opcional para agente3 y agente4

---

## 🔧 IMPLEMENTACIÓN RÁPIDA

### **1. Agregar esta función helper:**

```javascript
const isAgentWithoutSamples = (email) => {
  return email === 'agente3@inmobiliaria.com' || 
         email === 'agente4@inmobiliaria.com';
};
```

### **2. Modificar el campo "Muestras Realizadas":**

```jsx
{!isAgentWithoutSamples(currentUser.email) && (
  <FormField
    name="muestrasRealizadas"
    label="Muestras Realizadas"
    type="number"
    required={true}
  />
)}

{isAgentWithoutSamples(currentUser.email) && (
  <div className="info-message">
    ℹ️ Este agente no realiza muestras - se evaluará por consultas y captaciones
  </div>
)}
```

### **3. Actualizar validación:**

```javascript
muestrasRealizadas: isAgentWithoutSamples(currentUser.email) 
  ? Yup.number().min(0).nullable() // Opcional
  : Yup.number().min(0).required() // Requerido
```

---

## 📁 ARCHIVOS INCLUIDOS

1. **`FRONTEND_MODIFICATIONS_AGENTES_SIN_MUESTRAS.md`** - Documentación completa
2. **`frontend-examples/AgentWithoutSamplesExample.jsx`** - Código de ejemplo listo para usar
3. **`frontend-examples/TestData.js`** - Datos de prueba para testing

---

## 🧪 TESTING RÁPIDO

1. **Probar con agente3@inmobiliaria.com**:
   - ✅ Debe poder enviar formulario sin muestras
   - ✅ Campo "Muestras Realizadas" debe estar oculto

2. **Probar con agente4@inmobiliaria.com**:
   - ✅ Mismo comportamiento que agente3

3. **Probar con agente normal**:
   - ✅ Debe funcionar exactamente igual que antes

---

## ⚡ IMPLEMENTACIÓN EN 3 PASOS

1. **Copiar función helper** (2 minutos)
2. **Modificar formulario** (15 minutos)
3. **Probar con los 2 agentes** (10 minutos)

**Total: 30 minutos máximo**

---

## 📞 CONTACTO

Si tienes dudas durante la implementación, revisar:
- Documentación completa en `FRONTEND_MODIFICATIONS_AGENTES_SIN_MUESTRAS.md`
- Código de ejemplo en `frontend-examples/`
- Backend ya está funcionando correctamente

**¡Es un cambio simple y directo!** 🚀
