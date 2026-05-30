/**
 * Staff Attendance Log Routes
 * 
 * Endpoints for viewing and managing staff attendance logs from AI06 device
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');
const prisma = new PrismaClient();

// Get attendance logs with filters
router.get('/logs', async (req, res) => {
  try {
    const { date, staffId, status, startDate, endDate } = req.query;

    const where = {};

    if (date) {
      where.date = new Date(date);
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (staffId) {
      where.staffId = staffId;
    }

    if (status) {
      where.status = status;
    }

    const logs = await prisma.staffAttendanceLog.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            machineId: true,
            staffType: true,
            profilePhotoUrl: true
          }
        }
      },
      orderBy: { scanTime: 'desc' },
      take: 500 // Limit to last 500 logs
    });

    res.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get today's attendance
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await prisma.staffAttendanceLog.findMany({
      where: {
        date: today
      },
      include: {
        staff: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            machineId: true,
            staffType: true,
            profilePhotoUrl: true
          }
        }
      },
      orderBy: { scanTime: 'desc' }
    });

    // Get all active staff
    const allStaff = await prisma.staff.findMany({
      where: { 
        status: 'ACTIVE',
        machineId: { not: null }
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        machineId: true,
        staffType: true
      }
    });

    // Find who hasn't logged in yet
    const loggedInStaffIds = logs.map(log => log.staffId);
    const absent = allStaff.filter(staff => !loggedInStaffIds.includes(staff.id));

    res.json({ 
      success: true, 
      data: {
        logs,
        present: logs.length,
        absent: absent.length,
        absentStaff: absent,
        total: allStaff.length
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get attendance summary by date range
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Start date and end date are required' 
      });
    }

    const logs = await prisma.staffAttendanceLog.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        staff: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            staffType: true
          }
        }
      }
    });

    // Group by status
    const summary = {
      total: logs.length,
      onTime: logs.filter(l => l.status === 'ON_TIME').length,
      late: logs.filter(l => l.status === 'LATE').length,
      early: logs.filter(l => l.status === 'EARLY').length,
      byStaffType: {}
    };

    // Group by staff type
    logs.forEach(log => {
      const type = log.staff.staffType;
      if (!summary.byStaffType[type]) {
        summary.byStaffType[type] = { total: 0, onTime: 0, late: 0 };
      }
      summary.byStaffType[type].total++;
      if (log.status === 'ON_TIME') summary.byStaffType[type].onTime++;
      if (log.status === 'LATE') summary.byStaffType[type].late++;
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get staff attendance history
router.get('/staff/:staffId/history', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { limit = 30 } = req.query;

    const logs = await prisma.staffAttendanceLog.findMany({
      where: { staffId },
      orderBy: { scanTime: 'desc' },
      take: parseInt(limit)
    });

    const stats = {
      total: logs.length,
      onTime: logs.filter(l => l.status === 'ON_TIME').length,
      late: logs.filter(l => l.status === 'LATE').length,
      averageMinutesLate: logs
        .filter(l => l.minutesLate > 0)
        .reduce((sum, l) => sum + l.minutesLate, 0) / logs.filter(l => l.minutesLate > 0).length || 0
    };

    res.json({ success: true, data: { logs, stats } });
  } catch (error) {
    console.error('Error fetching staff attendance history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
