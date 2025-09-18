// Datos de prueba para el equipo de frontend
// Archivo: utils/testData.js

// Usuarios de prueba
export const testUsers = {
  // Agente normal (con muestras)
  normalAgent: {
    id: '1',
    email: 'agente1@inmobiliaria.com',
    name: 'Alex Solorzano',
    role: 'agent'
  },
  
  // Agente sin muestras - agente3
  agentWithoutSamples1: {
    id: '3',
    email: 'agente3@inmobiliaria.com',
    name: 'Enrique Perez',
    role: 'agent'
  },
  
  // Agente sin muestras - agente4
  agentWithoutSamples2: {
    id: '4',
    email: 'agente4@inmobiliaria.com',
    name: 'Graciela Reynoso',
    role: 'agent'
  }
};

// Datos de performance de prueba
export const testPerformanceData = {
  // Para agente normal
  normalAgent: {
    fecha: '2024-01-15',
    consultasRecibidas: 12,
    muestrasRealizadas: 8,
    operacionesCerradas: 3,
    numeroCaptaciones: 5,
    seguimiento: true,
    usoTokko: 'frecuente',
    cantidadPropiedadesTokko: 15,
    observaciones: 'Buena semana de trabajo'
  },
  
  // Para agente sin muestras (agente3)
  agentWithoutSamples1: {
    fecha: '2024-01-15',
    consultasRecibidas: 15,
    muestrasRealizadas: null, // ← Esto debe funcionar
    operacionesCerradas: 0, // No puede cerrar sin muestras
    numeroCaptaciones: 8,
    seguimiento: true,
    usoTokko: 'ocasional',
    cantidadPropiedadesTokko: 12,
    observaciones: 'Enfocado en captaciones'
  },
  
  // Para agente sin muestras (agente4)
  agentWithoutSamples2: {
    fecha: '2024-01-15',
    consultasRecibidas: 18,
    muestrasRealizadas: null, // ← Esto debe funcionar
    operacionesCerradas: 0, // No puede cerrar sin muestras
    numeroCaptaciones: 10,
    seguimiento: true,
    usoTokko: 'frecuente',
    cantidadPropiedadesTokko: 20,
    observaciones: 'Excelente en consultas y captaciones'
  }
};

// Función helper para testing
export const isAgentWithoutSamples = (email) => {
  const AGENTS_WITHOUT_SAMPLES = [
    'agente3@inmobiliaria.com',
    'agente4@inmobiliaria.com'
  ];
  return AGENTS_WITHOUT_SAMPLES.includes(email);
};

// Casos de prueba para validación
export const validationTestCases = [
  {
    name: 'Agente Normal - Datos Válidos',
    user: testUsers.normalAgent,
    data: testPerformanceData.normalAgent,
    shouldPass: true
  },
  {
    name: 'Agente Normal - Sin Muestras (Error)',
    user: testUsers.normalAgent,
    data: {
      ...testPerformanceData.normalAgent,
      muestrasRealizadas: null
    },
    shouldPass: false
  },
  {
    name: 'Agente3 - Datos Válidos Sin Muestras',
    user: testUsers.agentWithoutSamples1,
    data: testPerformanceData.agentWithoutSamples1,
    shouldPass: true
  },
  {
    name: 'Agente4 - Datos Válidos Sin Muestras',
    user: testUsers.agentWithoutSamples2,
    data: testPerformanceData.agentWithoutSamples2,
    shouldPass: true
  },
  {
    name: 'Agente3 - Con Muestras (Error)',
    user: testUsers.agentWithoutSamples1,
    data: {
      ...testPerformanceData.agentWithoutSamples1,
      muestrasRealizadas: 5
    },
    shouldPass: false
  }
];

// Función para ejecutar tests
export const runValidationTests = (validateFunction) => {
  console.log('🧪 Ejecutando tests de validación...');
  
  validationTestCases.forEach((testCase, index) => {
    try {
      const result = validateFunction(testCase.data, testCase.user);
      const passed = testCase.shouldPass ? result.isValid : !result.isValid;
      
      console.log(`${passed ? '✅' : '❌'} Test ${index + 1}: ${testCase.name}`);
      
      if (!passed) {
        console.log('   Error:', result.errors);
      }
    } catch (error) {
      console.log(`❌ Test ${index + 1}: ${testCase.name} - Error:`, error.message);
    }
  });
};

// Mock de la función de envío al backend
export const mockSubmitToBackend = async (data) => {
  console.log('📤 Enviando datos al backend:', data);
  
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simular respuesta exitosa
  return {
    success: true,
    message: 'Performance guardado exitosamente',
    data: {
      id: Math.random().toString(36).substr(2, 9),
      ...data
    }
  };
};

// Función para probar el formulario completo
export const testFormSubmission = async (user, data, submitFunction) => {
  console.log(`🧪 Probando formulario para ${user.name} (${user.email})`);
  
  try {
    const result = await submitFunction(data);
    console.log('✅ Formulario enviado exitosamente:', result);
    return true;
  } catch (error) {
    console.log('❌ Error al enviar formulario:', error);
    return false;
  }
};
