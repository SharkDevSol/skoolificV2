const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken } = require('../../middleware/auth');

// Get all fee structures
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { academicYearId, gradeLevel, campusId, isActive } = req.query;
    
    const where = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (gradeLevel) where.gradeLevel = gradeLevel;
    if (campusId) where.campusId = campusId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const feeStructures = await prisma.feeStructure.findMany({
      where,
      include: {
        items: { include: { account: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: feeStructures });
  } catch (error) {
    console.error('Error fetching fee structures:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch fee structures' } });
  }
});

// Get single fee structure
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { account: true } }
      }
    });
    
    if (!feeStructure) {
      return res.status(404).json({ success: false, error: { message: 'Fee structure not found' } });
    }
    
    res.json({ success: true, data: feeStructure });
  } catch (error) {
    console.error('Error fetching fee structure:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch fee structure' } });
  }
});

// Create fee structure
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, academicYearId, termId, gradeLevel, campusId, studentCategory, items } = req.body;
    
    const feeStructure = await prisma.feeStructure.create({
      data: {
        name,
        academicYearId,
        termId,
        gradeLevel,
        campusId,
        studentCategory,
        items: {
          create: items.map(item => ({
            feeCategory: item.feeCategory,
            amount: parseFloat(item.amount),
            accountId: item.accountId,
            paymentType: item.paymentType,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            installmentCount: item.installmentCount,
            description: item.description
          }))
        }
      },
      include: { items: true }
    });
    
    res.status(201).json({ success: true, data: feeStructure });
  } catch (error) {
    console.error('Error creating fee structure:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create fee structure' } });
  }
});

// Update fee structure
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, isActive } = req.body;
    
    const feeStructure = await prisma.feeStructure.update({
      where: { id: req.params.id },
      data: { name, isActive }
    });
    
    res.json({ success: true, data: feeStructure });
  } catch (error) {
    console.error('Error updating fee structure:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update fee structure' } });
  }
});

// Delete fee structure
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const feeStructure = await prisma.feeStructure.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    
    res.json({ success: true, data: feeStructure });
  } catch (error) {
    console.error('Error deleting fee structure:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to delete fee structure' } });
  }
});

module.exports = router;
