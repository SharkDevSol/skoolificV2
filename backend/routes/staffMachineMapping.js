/**
 * Staff Machine ID Mapping Routes
 * 
 * Endpoints for assigning and managing AI06 machine IDs for staff
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');
const prisma = new PrismaClient();

// Get all staff with their machine IDs
router.get('/staff-machine-ids', async (req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        machineId: true,
        staffType: true,
        email: true,
        phone: true
      },
      orderBy: { employeeNumber: 'asc' }
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error fetching staff machine IDs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assign machine ID to staff
router.post('/assign-machine-id', async (req, res) => {
  try {
    const { staffId, machineId } = req.body;

    if (!staffId || machineId === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Staff ID and Machine ID are required' 
      });
    }

    // Check if machine ID is already assigned to another staff
    if (machineId !== null) {
      const existing = await prisma.staff.findFirst({
        where: {
          machineId: parseInt(machineId),
          id: { not: staffId }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Machine ID ${machineId} is already assigned to ${existing.firstName} ${existing.lastName}`
        });
      }
    }

    // Update staff with machine ID
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: { machineId: machineId ? parseInt(machineId) : null }
    });

    res.json({ 
      success: true, 
      message: 'Machine ID assigned successfully',
      data: updatedStaff 
    });
  } catch (error) {
    console.error('Error assigning machine ID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get staff by machine ID (for AI06 device lookup)
router.get('/staff-by-machine-id/:machineId', async (req, res) => {
  try {
    const { machineId } = req.params;

    const staff = await prisma.staff.findFirst({
      where: { 
        machineId: parseInt(machineId),
        status: 'ACTIVE'
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        machineId: true,
        staffType: true,
        email: true,
        profilePhotoUrl: true
      }
    });

    if (!staff) {
      return res.status(404).json({ 
        success: false, 
        error: `No staff found with Machine ID ${machineId}` 
      });
    }

    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error fetching staff by machine ID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get next available machine ID
router.get('/next-machine-id', async (req, res) => {
  try {
    const maxMachineId = await prisma.staff.findFirst({
      where: { machineId: { not: null } },
      orderBy: { machineId: 'desc' },
      select: { machineId: true }
    });

    const nextId = maxMachineId ? maxMachineId.machineId + 1 : 1;

    res.json({ success: true, nextMachineId: nextId });
  } catch (error) {
    console.error('Error getting next machine ID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
