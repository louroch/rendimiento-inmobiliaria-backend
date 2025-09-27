const express = require('express');
const { prisma } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Obtener todos los usuarios (solo admin)
// @access  Private (Admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            performance: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      users,
      total: users.length
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/users/ranking
// @desc    Obtener ranking de agentes por eficiencia
// @access  Private (Admin)
router.get('/ranking', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) where.fecha.gte = new Date(startDate);
      if (endDate) where.fecha.lte = new Date(endDate);
    }

    // Obtener estadísticas por agente
    const agentStats = await prisma.performance.groupBy({
      by: ['userId'],
      where,
      _sum: {
        consultasRecibidas: true,
        muestrasRealizadas: true,
        operacionesCerradas: true,
        numeroCaptaciones: true
      },
      _count: { id: true }
    });

    // Obtener información de usuarios
    const userIds = agentStats.map(stat => stat.userId);
    const users = await prisma.user.findMany({
      where: { 
        id: { in: userIds },
        role: 'agent' // Solo agentes
      },
      select: { id: true, name: true, email: true }
    });

    // Combinar datos y calcular eficiencia
    const ranking = agentStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      const totalConsultas = stat._sum.consultasRecibidas || 0;
      const totalMuestras = stat._sum.muestrasRealizadas || 0;
      const totalOperaciones = stat._sum.operacionesCerradas || 0;
      const totalCaptaciones = stat._sum.numeroCaptaciones || 0;
      
      // Calcular score ponderado: (operaciones × 3) + (muestras × 2) + (consultas × 1) + (captaciones × 2)
      // Agregamos captaciones con peso 2 para agentes sin muestras
      const score = (totalOperaciones * 3) + (totalMuestras * 2) + (totalConsultas * 1) + (totalCaptaciones * 2);
      
      return {
        userId: stat.userId,
        name: user?.name || 'Usuario no encontrado',
        email: user?.email || 'N/A',
        totalConsultas,
        totalMuestras,
        totalOperaciones,
        totalCaptaciones,
        totalRegistros: stat._count.id || 0,
        score: score, // Score ponderado como nueva métrica de eficiencia
        eficiencia: score // Mantener compatibilidad con frontend
      };
    });

    // Ordenar por score ponderado (mayor a menor)
    ranking.sort((a, b) => b.score - a.score);

    res.json({
      ranking,
      total: ranking.length,
      periodo: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo ranking:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/users/:id
// @desc    Obtener usuario por ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Los asesores solo pueden ver su propia información
    if (req.user.role === 'ASESOR' && req.user.id !== id) {
      return res.status(403).json({ message: 'No tienes permisos para ver esta información' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/users/:id
// @desc    Actualizar usuario
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    // Los asesores solo pueden actualizar su propia información
    if (req.user.role === 'ASESOR' && req.user.id !== id) {
      return res.status(403).json({ message: 'No tienes permisos para actualizar esta información' });
    }

    // Verificar si el email ya existe (si se está cambiando)
    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'El email ya está en uso' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Eliminar usuario (solo admin)
// @access  Private (Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir eliminar el propio usuario
    if (req.user.id === id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
