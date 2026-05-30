/**
 * Attendance Time Settings Routes
 * 
 * Endpoints for managing work hours and late thresholds
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get active time settings
router.get('/active', async (req, res) => {
  try {
    const settings = await prisma.attendanceTimeSetting.findFirst({
      where: { isActive: true }
    });

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        success: true,
        data: {
          workStartTime: '08:00',
          lateThreshold: 15,
          workEndTime: '17:00'
        }
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching time settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all time settings
router.get('/all', async (req, res) => {
  try {
    const settings = await prisma.attendanceTimeSetting.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching all time settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new time settings
router.post('/create', async (req, res) => {
  try {
    const { name, workStartTime, lateThreshold, workEndTime, isActive } = req.body;

    if (!workStartTime || !lateThreshold || !workEndTime) {
      return res.status(400).json({
        success: false,
        error: 'Work start time, late threshold, and work end time are required'
      });
    }

    // If setting as active, deactivate all others
    if (isActive) {
      await prisma.attendanceTimeSetting.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
    }

    const settings = await prisma.attendanceTimeSetting.create({
      data: {
        name: name || 'Work Hours',
        workStartTime,
        lateThreshold: parseInt(lateThreshold),
        workEndTime,
        isActive: isActive !== false
      }
    });

    res.json({ 
      success: true, 
      message: 'Time settings created successfully',
      data: settings 
    });
  } catch (error) {
    console.error('Error creating time settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update time settings
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, workStartTime, lateThreshold, workEndTime, isActive } = req.body;

    // If setting as active, deactivate all others
    if (isActive) {
      await prisma.attendanceTimeSetting.updateMany({
        where: { 
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false }
      });
    }

    const settings = await prisma.attendanceTimeSetting.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(workStartTime && { workStartTime }),
        ...(lateThreshold !== undefined && { lateThreshold: parseInt(lateThreshold) }),
        ...(workEndTime && { workEndTime }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({ 
      success: true, 
      message: 'Time settings updated successfully',
      data: settings 
    });
  } catch (error) {
    console.error('Error updating time settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete time settings
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.attendanceTimeSetting.delete({
      where: { id }
    });

    res.json({ 
      success: true, 
      message: 'Time settings deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting time settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
