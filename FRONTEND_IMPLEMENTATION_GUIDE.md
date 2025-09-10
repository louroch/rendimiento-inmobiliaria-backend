# 🚀 Guía de Implementación Frontend - Nuevos Campos de Performance

## 📋 Resumen de Cambios en el Backend

El backend ha sido actualizado exitosamente con los siguientes nuevos campos en el modelo `Performance`:

### Nuevos Campos Disponibles:
1. **`cantidadPropiedadesTokko`** (Int, opcional) - Cantidad de propiedades cargadas en Tokko
2. **`linksTokko`** (String, opcional) - Links de las propiedades (separados por comas)
3. **`dificultadTokko`** (Boolean, opcional) - ¿Se te dificultó el uso de Tokko?
4. **`detalleDificultadTokko`** (String, opcional) - Detalle de la dificultad (si eligió "Sí")
5. **`observaciones`** (String, opcional) - Campo de observaciones generales

## 🔧 Cambios Necesarios en el Frontend

### 1. Estructura del Estado del Formulario

```javascript
const [formData, setFormData] = useState({
  // ... campos existentes
  cantidadPropiedadesTokko: '',
  linksTokko: '',
  dificultadTokko: null,
  detalleDificultadTokko: '',
  observaciones: ''
});

// Estado para mostrar/ocultar campo de detalle
const [showDetalleDificultad, setShowDetalleDificultad] = useState(false);
```

### 2. Componentes del Formulario a Agregar

#### A. Campo para Cantidad de Propiedades
```jsx
<FormControl>
  <FormLabel>Cantidad de propiedades cargadas en Tokko</FormLabel>
  <Input
    type="number"
    min="0"
    value={formData.cantidadPropiedadesTokko}
    onChange={(e) => setFormData({...formData, cantidadPropiedadesTokko: e.target.value})}
    placeholder="Ej: 5"
  />
</FormControl>
```

#### B. Campo para Links de Propiedades
```jsx
<FormControl>
  <FormLabel>Links de las propiedades</FormLabel>
  <Textarea
    value={formData.linksTokko}
    onChange={(e) => setFormData({...formData, linksTokko: e.target.value})}
    placeholder="https://ejemplo1.com, https://ejemplo2.com"
    rows={3}
  />
  <FormHelperText>Separa múltiples links con comas</FormHelperText>
</FormControl>
```

#### C. Pregunta sobre Dificultad con Campo Condicional
```jsx
<FormControl>
  <FormLabel>¿Se te dificultó el uso de Tokko?</FormLabel>
  <RadioGroup
    value={formData.dificultadTokko}
    onChange={(e) => {
      const value = e.target.value === 'true';
      setFormData({...formData, dificultadTokko: value});
      setShowDetalleDificultad(value);
    }}
  >
    <HStack>
      <Radio value="true">Sí</Radio>
      <Radio value="false">No</Radio>
    </HStack>
  </RadioGroup>
</FormControl>

{/* Campo condicional para detalle */}
{showDetalleDificultad && (
  <FormControl>
    <FormLabel>Detalla las dificultades encontradas</FormLabel>
    <Textarea
      value={formData.detalleDificultadTokko}
      onChange={(e) => setFormData({...formData, detalleDificultadTokko: e.target.value})}
      placeholder="Describe las dificultades que tuviste..."
      rows={3}
    />
  </FormControl>
)}
```

#### D. Campo de Observaciones
```jsx
<FormControl>
  <FormLabel>Observaciones</FormLabel>
  <Textarea
    value={formData.observaciones}
    onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
    placeholder="Cualquier observación adicional..."
    rows={3}
  />
</FormControl>
```

### 3. Validación del Calendario

```jsx
// En el componente de calendario
<DatePicker
  selected={formData.fecha}
  onChange={(date) => setFormData({...formData, fecha: date})}
  minDate={new Date()} // No permite fechas anteriores al día actual
  dateFormat="dd/MM/yyyy"
  placeholderText="Selecciona una fecha"
  className="form-control"
  showPopperArrow={false}
/>
```

### 4. Función de Envío del Formulario

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Preparar datos para envío
  const dataToSend = {
    ...formData,
    // Convertir valores vacíos a null para el backend
    cantidadPropiedadesTokko: formData.cantidadPropiedadesTokko || null,
    linksTokko: formData.linksTokko || null,
    dificultadTokko: formData.dificultadTokko,
    detalleDificultadTokko: formData.detalleDificultadTokko || null,
    observaciones: formData.observaciones || null
  };

  try {
    const response = await fetch('/api/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dataToSend)
    });

    if (response.ok) {
      // Manejar éxito
      console.log('Registro creado exitosamente');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 5. Función de Actualización (si existe)

```javascript
const handleUpdate = async (id) => {
  const dataToSend = {
    ...formData,
    cantidadPropiedadesTokko: formData.cantidadPropiedadesTokko || null,
    linksTokko: formData.linksTokko || null,
    dificultadTokko: formData.dificultadTokko,
    detalleDificultadTokko: formData.detalleDificultadTokko || null,
    observaciones: formData.observaciones || null
  };

  try {
    const response = await fetch(`/api/performance/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dataToSend)
    });

    if (response.ok) {
      // Manejar éxito
      console.log('Registro actualizado exitosamente');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## 📊 Estructura de Respuesta del Backend

El backend ahora retorna los siguientes campos adicionales en las respuestas:

```json
{
  "performance": {
    "id": "...",
    "userId": "...",
    "fecha": "2024-01-15T00:00:00.000Z",
    "consultasRecibidas": 10,
    "muestrasRealizadas": 5,
    "operacionesCerradas": 2,
    "seguimiento": true,
    "usoTokko": "Uso básico",
    "cantidadPropiedadesTokko": 3,
    "linksTokko": "https://ejemplo1.com, https://ejemplo2.com",
    "dificultadTokko": true,
    "detalleDificultadTokko": "La interfaz es confusa",
    "observaciones": "Todo funcionó bien en general",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "user": {
      "id": "...",
      "name": "Juan Pérez",
      "email": "juan@ejemplo.com"
    }
  }
}
```

## ✅ Validaciones del Backend

El backend valida los siguientes campos:
- `cantidadPropiedadesTokko`: Debe ser un número entero positivo (opcional)
- `linksTokko`: Debe ser una cadena de texto (opcional)
- `dificultadTokko`: Debe ser un valor booleano (opcional)
- `detalleDificultadTokko`: Debe ser una cadena de texto (opcional)
- `observaciones`: Debe ser una cadena de texto (opcional)

## 🚨 Consideraciones Importantes

1. **Todos los nuevos campos son opcionales** - El formulario funcionará sin ellos
2. **Validación de fechas** - El calendario debe impedir seleccionar fechas anteriores al día actual
3. **Campo condicional** - El campo de detalle solo aparece si se selecciona "Sí" en la dificultad
4. **Retrocompatibilidad** - Los registros existentes seguirán funcionando normalmente
5. **Limpieza de datos** - Valores vacíos se convierten a `null` en el backend

## 🔄 Próximos Pasos

1. Implementar los nuevos campos en el formulario
2. Agregar la validación del calendario
3. Probar la funcionalidad de campos condicionales
4. Verificar que los datos se envíen correctamente al backend
5. Probar la visualización de los nuevos campos en las listas/tablas

## 📞 Soporte

Si tienes alguna duda sobre la implementación, contacta al equipo de backend para aclaraciones.

---
**Fecha de actualización:** $(date)
**Versión del backend:** 1.1.0
**Campos agregados:** 5 nuevos campos opcionales
