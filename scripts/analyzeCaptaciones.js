const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeCaptaciones() {
  try {
    console.log('📊 ANÁLISIS DE MÉTRICAS DE CAPTACIONES\n');
    console.log('=' .repeat(50));

    // 1. Obtener métricas totales de captaciones
    console.log('\n🔍 MÉTRICAS TOTALES DE CAPTACIONES');
    console.log('-'.repeat(40));

    const totalStats = await prisma.performance.aggregate({
      _sum: {
        numeroCaptaciones: true,
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true
      },
      _avg: {
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });

    const totalCaptaciones = totalStats._sum.numeroCaptaciones || 0;
    const totalConsultas = totalStats._sum.consultasRecibidas || 0;
    const totalMuestras = totalStats._sum.muestrasRealizadas || 0;
    const totalOperaciones = totalStats._sum.operacionesCerradas || 0;
    const totalRegistros = totalStats._count.id || 0;
    const promedioCaptaciones = totalStats._avg.numeroCaptaciones || 0;

    console.log(`📈 Total de Captaciones: ${totalCaptaciones}`);
    console.log(`📞 Total de Consultas: ${totalConsultas}`);
    console.log(`🏠 Total de Muestras: ${totalMuestras}`);
    console.log(`✅ Total de Operaciones Cerradas: ${totalOperaciones}`);
    console.log(`📋 Total de Registros: ${totalRegistros}`);
    console.log(`📊 Promedio de Captaciones por Registro: ${promedioCaptaciones.toFixed(2)}`);

    // Calcular tasas de conversión
    const tasaConsultasToCaptaciones = totalConsultas > 0 ? ((totalCaptaciones / totalConsultas) * 100).toFixed(2) : 0;
    const tasaMuestrasToCaptaciones = totalMuestras > 0 ? ((totalCaptaciones / totalMuestras) * 100).toFixed(2) : 0;
    const tasaOperacionesToCaptaciones = totalOperaciones > 0 ? ((totalCaptaciones / totalOperaciones) * 100).toFixed(2) : 0;

    console.log(`\n📊 TASAS DE CONVERSIÓN:`);
    console.log(`   Consultas → Captaciones: ${tasaConsultasToCaptaciones}%`);
    console.log(`   Muestras → Captaciones: ${tasaMuestrasToCaptaciones}%`);
    console.log(`   Operaciones → Captaciones: ${tasaOperacionesToCaptaciones}%`);

    // 2. Obtener métricas por agente
    console.log('\n\n👥 MÉTRICAS POR AGENTE');
    console.log('-'.repeat(40));

    const agentStats = await prisma.performance.groupBy({
      by: ['userId'],
      _sum: {
        numeroCaptaciones: true,
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true
      },
      _avg: {
        numeroCaptaciones: true
      },
      _count: {
        id: true
      }
    });

    // Obtener información de usuarios
    const userIds = agentStats.map(stat => stat.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true }
    });

    // Combinar datos de agentes con información de usuarios
    const agentesConDatos = agentStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      const captaciones = stat._sum.numeroCaptaciones || 0;
      const consultas = stat._sum.consultasRecibidas || 0;
      const muestras = stat._sum.muestrasRealizadas || 0;
      const operaciones = stat._sum.operacionesCerradas || 0;
      const registros = stat._count.id || 0;
      const promedioCaptaciones = stat._avg.numeroCaptaciones || 0;

      // Calcular tasas de conversión por agente
      const tasaConsultasToCaptaciones = consultas > 0 ? ((captaciones / consultas) * 100).toFixed(2) : 0;
      const tasaMuestrasToCaptaciones = muestras > 0 ? ((captaciones / muestras) * 100).toFixed(2) : 0;

      return {
        agente: user || { name: 'Usuario no encontrado', email: 'N/A', role: 'agent' },
        captaciones,
        consultas,
        muestras,
        operaciones,
        registros,
        promedioCaptaciones,
        tasaConsultasToCaptaciones: parseFloat(tasaConsultasToCaptaciones),
        tasaMuestrasToCaptaciones: parseFloat(tasaMuestrasToCaptaciones)
      };
    });

    // Ordenar por número de captaciones (descendente)
    agentesConDatos.sort((a, b) => b.captaciones - a.captaciones);

    // Mostrar métricas por agente
    agentesConDatos.forEach((agente, index) => {
      console.log(`\n${index + 1}. ${agente.agente.name} (${agente.agente.email})`);
      console.log(`   📈 Captaciones: ${agente.captaciones}`);
      console.log(`   📞 Consultas: ${agente.consultas}`);
      console.log(`   🏠 Muestras: ${agente.muestras}`);
      console.log(`   ✅ Operaciones: ${agente.operaciones}`);
      console.log(`   📋 Registros: ${agente.registros}`);
      console.log(`   📊 Promedio Captaciones/Registro: ${agente.promedioCaptaciones.toFixed(2)}`);
      console.log(`   📊 Tasa Consultas→Captaciones: ${agente.tasaConsultasToCaptaciones}%`);
      console.log(`   📊 Tasa Muestras→Captaciones: ${agente.tasaMuestrasToCaptaciones}%`);
    });

    // 3. Análisis de rendimiento
    console.log('\n\n📊 ANÁLISIS DE RENDIMIENTO');
    console.log('-'.repeat(40));

    const topCaptaciones = agentesConDatos[0];
    const totalAgentes = agentesConDatos.length;
    const agentesConCaptaciones = agentesConDatos.filter(a => a.captaciones > 0).length;
    const porcentajeAgentesConCaptaciones = totalAgentes > 0 ? ((agentesConCaptaciones / totalAgentes) * 100).toFixed(1) : 0;

    console.log(`🏆 Mejor Agente en Captaciones: ${topCaptaciones.agente.name} (${topCaptaciones.captaciones} captaciones)`);
    console.log(`👥 Total de Agentes: ${totalAgentes}`);
    console.log(`✅ Agentes con Captaciones: ${agentesConCaptaciones} (${porcentajeAgentesConCaptaciones}%)`);
    console.log(`📊 Promedio de Captaciones por Agente: ${(totalCaptaciones / totalAgentes).toFixed(2)}`);

    // 4. Distribución de captaciones
    console.log('\n\n📈 DISTRIBUCIÓN DE CAPTACIONES');
    console.log('-'.repeat(40));

    const distribucion = {
      '0 captaciones': agentesConDatos.filter(a => a.captaciones === 0).length,
      '1-5 captaciones': agentesConDatos.filter(a => a.captaciones >= 1 && a.captaciones <= 5).length,
      '6-10 captaciones': agentesConDatos.filter(a => a.captaciones >= 6 && a.captaciones <= 10).length,
      '11-20 captaciones': agentesConDatos.filter(a => a.captaciones >= 11 && a.captaciones <= 20).length,
      'Más de 20 captaciones': agentesConDatos.filter(a => a.captaciones > 20).length
    };

    Object.entries(distribucion).forEach(([rango, cantidad]) => {
      const porcentaje = totalAgentes > 0 ? ((cantidad / totalAgentes) * 100).toFixed(1) : 0;
      console.log(`   ${rango}: ${cantidad} agentes (${porcentaje}%)`);
    });

    // 5. Resumen ejecutivo
    console.log('\n\n📋 RESUMEN EJECUTIVO');
    console.log('='.repeat(50));
    console.log(`🎯 Total de Captaciones del Equipo: ${totalCaptaciones}`);
    console.log(`👑 Líder en Captaciones: ${topCaptaciones.agente.name} (${topCaptaciones.captaciones})`);
    console.log(`📊 Eficiencia Promedio: ${promedioCaptaciones.toFixed(2)} captaciones por registro`);
    console.log(`🎯 Tasa de Conversión Consultas→Captaciones: ${tasaConsultasToCaptaciones}%`);
    console.log(`✅ Agentes Activos en Captaciones: ${agentesConCaptaciones}/${totalAgentes} (${porcentajeAgentesConCaptaciones}%)`);

    // 6. Recomendaciones
    console.log('\n\n💡 RECOMENDACIONES');
    console.log('-'.repeat(40));
    
    if (parseFloat(tasaConsultasToCaptaciones) < 10) {
      console.log('⚠️  La tasa de conversión de consultas a captaciones es baja. Considerar:');
      console.log('   - Mejorar el proceso de seguimiento de consultas');
      console.log('   - Capacitar en técnicas de captación');
      console.log('   - Revisar la calidad de las consultas recibidas');
    }

    if (agentesConCaptaciones < totalAgentes * 0.8) {
      console.log('⚠️  Menos del 80% de agentes tienen captaciones. Considerar:');
      console.log('   - Identificar agentes que necesitan apoyo adicional');
      console.log('   - Implementar mentorías entre agentes');
      console.log('   - Revisar la distribución de oportunidades');
    }

    if (topCaptaciones.captaciones > totalCaptaciones * 0.4) {
      console.log('⚠️  Un agente concentra más del 40% de las captaciones. Considerar:');
      console.log('   - Analizar las mejores prácticas del agente líder');
      console.log('   - Compartir estrategias exitosas con el equipo');
      console.log('   - Revisar la distribución equitativa de oportunidades');
    }

    console.log('\n✅ Análisis completado exitosamente');

  } catch (error) {
    console.error('❌ Error en el análisis de captaciones:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el análisis
analyzeCaptaciones();
