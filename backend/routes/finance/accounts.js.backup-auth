const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken } = require('../../middleware/auth');

// Get all accounts with hierarchy
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, isActive, search } = req.query;
    
    const where = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const accounts = await prisma.account.findMany({
      where,
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } }
      },
      orderBy: { code: 'asc' }
    });
    
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch accounts' } });
  }
});

// Get account tree (hierarchical structure)
router.get('/tree', authenticateToken, async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      include: {
        children: {
          include: {
            children: true
          }
        }
      },
      orderBy: { code: 'asc' }
    });
    
    const rootAccounts = accounts.filter(acc => !acc.parentId);
    res.json({ success: true, data: rootAccounts });
  } catch (error) {
    console.error('Error fetching account tree:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch account tree' } });
  }
});

// Get single account
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id },
      include: {
        parent: true,
        children: true
      }
    });
    
    if (!account) {
      return res.status(404).json({ success: false, error: { message: 'Account not found' } });
    }
    
    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch account' } });
  }
});

// Create account
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { code, name, type, parentId, campusId } = req.body;
    
    const account = await prisma.account.create({
      data: {
        code,
        name,
        type,
        parentId,
        campusId,
        createdBy: req.user.id
      }
    });
    
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create account' } });
  }
});

// Update account
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, isActive } = req.body;
    
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: { name, isActive }
    });
    
    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update account' } });
  }
});

// Delete (deactivate) account
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    
    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to delete account' } });
  }
});

module.exports = router;
