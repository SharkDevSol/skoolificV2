const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken } = require('../../middleware/auth');

// Get all budgets
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { fiscalYear, status, campusId } = req.query;
    
    const where = {};
    if (fiscalYear) where.fiscalYear = parseInt(fiscalYear);
    if (status) where.status = status;
    if (campusId) where.campusId = campusId;
    
    const budgets = await prisma.budget.findMany({
      where,
      include: {
        lines: {
          include: { account: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch budgets' } });
  }
});

// Get single budget
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const budget = await prisma.budget.findUnique({
      where: { id: req.params.id },
      include: {
        lines: {
          include: { account: true }
        }
      }
    });
    
    if (!budget) {
      return res.status(404).json({ success: false, error: { message: 'Budget not found' } });
    }
    
    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch budget' } });
  }
});

// Create budget
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, fiscalYear, startDate, endDate, campusId, lines } = req.body;
    
    const totalAmount = lines.reduce((sum, line) => sum + parseFloat(line.allocatedAmount), 0);
    
    const budget = await prisma.budget.create({
      data: {
        name,
        fiscalYear: parseInt(fiscalYear),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalAmount,
        status: 'DRAFT',
        campusId,
        createdBy: req.user.id,
        lines: {
          create: lines.map(line => ({
            category: line.category,
            accountId: line.accountId,
            departmentId: line.departmentId,
            allocatedAmount: parseFloat(line.allocatedAmount),
            spentAmount: 0,
            remainingAmount: parseFloat(line.allocatedAmount),
            alertThreshold: line.alertThreshold || 80
          }))
        }
      },
      include: { lines: true }
    });
    
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create budget' } });
  }
});

// Update budget
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, status } = req.body;
    
    const budget = await prisma.budget.update({
      where: { id: req.params.id },
      data: { name, status }
    });
    
    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update budget' } });
  }
});

// Approve budget
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const budget = await prisma.budget.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedBy: req.user.id,
        approvalDate: new Date()
      }
    });
    
    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('Error approving budget:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to approve budget' } });
  }
});

// Get budget vs actual report
router.get('/:id/vs-actual', authenticateToken, async (req, res) => {
  try {
    const budget = await prisma.budget.findUnique({
      where: { id: req.params.id },
      include: {
        lines: {
          include: { account: true }
        },
        expenses: {
          where: { status: 'APPROVED' }
        }
      }
    });
    
    if (!budget) {
      return res.status(404).json({ success: false, error: { message: 'Budget not found' } });
    }
    
    // Calculate variance for each line
    const report = budget.lines.map(line => {
      const variance = parseFloat(line.allocatedAmount) - parseFloat(line.spentAmount);
      const variancePercentage = (variance / parseFloat(line.allocatedAmount)) * 100;
      const utilizationPercentage = (parseFloat(line.spentAmount) / parseFloat(line.allocatedAmount)) * 100;
      
      return {
        category: line.category,
        account: line.account.name,
        allocated: parseFloat(line.allocatedAmount),
        spent: parseFloat(line.spentAmount),
        remaining: parseFloat(line.remainingAmount),
        variance,
        variancePercentage: variancePercentage.toFixed(2),
        utilizationPercentage: utilizationPercentage.toFixed(2),
        status: utilizationPercentage > line.alertThreshold ? 'WARNING' : 'OK'
      };
    });
    
    res.json({
      success: true,
      data: {
        budget: {
          name: budget.name,
          fiscalYear: budget.fiscalYear,
          totalAllocated: parseFloat(budget.totalAmount),
          totalSpent: report.reduce((sum, line) => sum + line.spent, 0),
          totalRemaining: report.reduce((sum, line) => sum + line.remaining, 0)
        },
        lines: report
      }
    });
  } catch (error) {
    console.error('Error fetching budget vs actual:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch budget vs actual' } });
  }
});

// Get budget alerts (lines exceeding threshold)
router.get('/:id/alerts', authenticateToken, async (req, res) => {
  try {
    const budget = await prisma.budget.findUnique({
      where: { id: req.params.id },
      include: {
        lines: {
          include: { account: true }
        }
      }
    });
    
    if (!budget) {
      return res.status(404).json({ success: false, error: { message: 'Budget not found' } });
    }
    
    const alerts = budget.lines
      .filter(line => {
        const utilizationPercentage = (parseFloat(line.spentAmount) / parseFloat(line.allocatedAmount)) * 100;
        return utilizationPercentage >= line.alertThreshold;
      })
      .map(line => ({
        category: line.category,
        account: line.account.name,
        allocated: parseFloat(line.allocatedAmount),
        spent: parseFloat(line.spentAmount),
        utilizationPercentage: ((parseFloat(line.spentAmount) / parseFloat(line.allocatedAmount)) * 100).toFixed(2),
        threshold: line.alertThreshold
      }));
    
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch budget alerts' } });
  }
});

module.exports = router;
