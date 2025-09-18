// Ejemplo práctico para el equipo de frontend
// Archivo: components/PerformanceForm.jsx

import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

// Función helper para identificar agentes sin muestras
const isAgentWithoutSamples = (email) => {
  const AGENTS_WITHOUT_SAMPLES = [
    'agente3@inmobiliaria.com',
    'agente4@inmobiliaria.com'
  ];
  return AGENTS_WITHOUT_SAMPLES.includes(email);
};

// Componente del formulario de performance
const PerformanceForm = ({ currentUser, onSubmit }) => {
  const isWithoutSamples = isAgentWithoutSamples(currentUser.email);

  // Schema de validación dinámico
  const validationSchema = Yup.object({
    consultasRecibidas: Yup.number()
      .min(0, 'Debe ser un número positivo')
      .required('Consultas recibidas es requerido'),
    
    operacionesCerradas: Yup.number()
      .min(0, 'Debe ser un número positivo')
      .required('Operaciones cerradas es requerido'),
    
    numeroCaptaciones: Yup.number()
      .min(0, 'Debe ser un número positivo')
      .required('Número de captaciones es requerido'),
    
    // Campo de muestras - condicional según tipo de agente
    muestrasRealizadas: isWithoutSamples 
      ? Yup.number().min(0).nullable() // Opcional para agentes sin muestras
      : Yup.number().min(0).required('Muestras realizadas es requerido'), // Requerido para otros
    
    seguimiento: Yup.boolean().required(),
    usoTokko: Yup.string().nullable(),
    cantidadPropiedadesTokko: Yup.number().min(0).nullable(),
    linksTokko: Yup.string().nullable(),
    dificultadTokko: Yup.boolean().nullable(),
    detalleDificultadTokko: Yup.string().nullable(),
    observaciones: Yup.string().nullable()
  });

  // Valores iniciales del formulario
  const initialValues = {
    fecha: new Date().toISOString().split('T')[0],
    consultasRecibidas: '',
    operacionesCerradas: '',
    numeroCaptaciones: '',
    muestrasRealizadas: isWithoutSamples ? null : '', // null para agentes sin muestras
    seguimiento: false,
    usoTokko: '',
    cantidadPropiedadesTokko: '',
    linksTokko: '',
    dificultadTokko: null,
    detalleDificultadTokko: '',
    observaciones: ''
  };

  // Manejar envío del formulario
  const handleSubmit = (values, { setSubmitting }) => {
    const dataToSend = {
      ...values,
      // Asegurar que muestrasRealizadas sea null para agentes sin muestras
      muestrasRealizadas: isWithoutSamples ? null : values.muestrasRealizadas
    };
    
    onSubmit(dataToSend);
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Registro de Performance</h2>
      
      {/* Mensaje informativo para agentes sin muestras */}
      {isWithoutSamples && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
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

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-6">
            {/* Fecha */}
            <div>
              <label htmlFor="fecha" className="block text-sm font-medium text-gray-700">
                Fecha
              </label>
              <Field
                type="date"
                id="fecha"
                name="fecha"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <ErrorMessage name="fecha" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            {/* Consultas Recibidas */}
            <div>
              <label htmlFor="consultasRecibidas" className="block text-sm font-medium text-gray-700">
                Consultas Recibidas *
              </label>
              <Field
                type="number"
                id="consultasRecibidas"
                name="consultasRecibidas"
                min="0"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <ErrorMessage name="consultasRecibidas" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            {/* Operaciones Cerradas */}
            <div>
              <label htmlFor="operacionesCerradas" className="block text-sm font-medium text-gray-700">
                Operaciones Cerradas *
              </label>
              <Field
                type="number"
                id="operacionesCerradas"
                name="operacionesCerradas"
                min="0"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <ErrorMessage name="operacionesCerradas" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            {/* Número de Captaciones */}
            <div>
              <label htmlFor="numeroCaptaciones" className="block text-sm font-medium text-gray-700">
                Número de Captaciones *
              </label>
              <Field
                type="number"
                id="numeroCaptaciones"
                name="numeroCaptaciones"
                min="0"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <ErrorMessage name="numeroCaptaciones" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            {/* Muestras Realizadas - Solo para agentes con muestras */}
            {!isWithoutSamples && (
              <div>
                <label htmlFor="muestrasRealizadas" className="block text-sm font-medium text-gray-700">
                  Muestras Realizadas *
                </label>
                <Field
                  type="number"
                  id="muestrasRealizadas"
                  name="muestrasRealizadas"
                  min="0"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <ErrorMessage name="muestrasRealizadas" component="div" className="text-red-500 text-sm mt-1" />
              </div>
            )}

            {/* Seguimiento */}
            <div className="flex items-center">
              <Field
                type="checkbox"
                id="seguimiento"
                name="seguimiento"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="seguimiento" className="ml-2 block text-sm text-gray-700">
                Realizó seguimiento
              </label>
            </div>

            {/* Campos adicionales de Tokko */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Tokko CRM</h3>
              
              <div>
                <label htmlFor="cantidadPropiedadesTokko" className="block text-sm font-medium text-gray-700">
                  Cantidad de Propiedades en Tokko
                </label>
                <Field
                  type="number"
                  id="cantidadPropiedadesTokko"
                  name="cantidadPropiedadesTokko"
                  min="0"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="usoTokko" className="block text-sm font-medium text-gray-700">
                  Uso de Tokko
                </label>
                <Field
                  as="select"
                  id="usoTokko"
                  name="usoTokko"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Seleccionar...</option>
                  <option value="frecuente">Frecuente</option>
                  <option value="ocasional">Ocasional</option>
                  <option value="poco">Poco</option>
                </Field>
              </div>

              <div className="mt-4">
                <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700">
                  Observaciones
                </label>
                <Field
                  as="textarea"
                  id="observaciones"
                  name="observaciones"
                  rows="3"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            {/* Botón de envío */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando...' : 'Guardar Performance'}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default PerformanceForm;
