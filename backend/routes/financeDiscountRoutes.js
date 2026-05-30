const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');
const prisma = new PrismaClient();

// Security middleware
const { authenticateWithBranch, validateBranchCode } = require('../middleware/branchAuth');
const { requirePermission, FINANCE_PERMISSIONS } = require('../middleware/financeAuth');

/**
 * POST /api/finance/discounts
 * Create a new discount with validation
 */
router.post('/', authenticateWithBranch, requirePermission(FINANCE_PERMISSIONS.DISCOUNTS_MANAGE), async (req, res) => {
  try {
    const { name, type, value, applicableFeeCategories, startDate, endDate, requiresApproval } = req.body;

    // Validation
    if (!name || !type || value === undefined || !applicableFeeCategories) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [
          { field: 'name', message: 'Discount name is required', code: 'REQUIRED_FIELD' },
          { field: 'type', message: 'Discount type is required', code: 'REQUIRED_FIELD' },
          { field: 'value', message: 'Discount value is required', code: 'REQUIRED_FIELD' },
          { field: 'applicableFeeCategories', message: 'Applicable fee categories are required', code: 'REQUIRED_FIELD' }
        ].filter(d => (!name && d.field === 'name') || (!type && d.field === 'type') || (value === undefined && d.field === 'value') || (!applicableFeeCategories && d.field === 'applicableFeeCategories'))
      });
    }

    // Validate discount type
    const validTypes = ['PERCENTAGE', 'FIXED_AMOUNT'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid discount type',
        details: [{ field: 'type', message: `Discount type must be one of: ${validTypes.join(', ')}`, code: 'INVALID_TYPE' }]
      });
    }

    // Validate discount value
    if (value <= 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid discount value',
        details: [{ field: 'value', message: 'Discount value must be positive', code: 'INVALID_VALUE' }]
      });
    }

    // Validate percentage discount doesn't exceed 100%
    if (type === 'PERCENTAGE' && value > 100) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid percentage value',
        details: [{ field: 'value', message: 'Percentage discount cannot exceed 100%', code: 'INVALID_PERCENTAGE' }]
      });
    }

    // Validate applicable fee categories
    if (!Array.isArray(applicableFeeCategories) || applicableFeeCategories.length === 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid applicable fee categories',
        details: [{ field: 'applicableFeeCategories', message: 'At least one fee category must be specified', code: 'REQUIRED_FIELD' }]
      });
    }

    const validFeeCategories = ['TUITION', 'TRANSPORT', 'LAB', 'EXAM', 'LIBRARY', 'SPORTS', 'CUSTOM'];
    const invalidCategories = applicableFeeCategories.filter(cat => !validFeeCategories.includes(cat));
    if (invalidCategories.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid fee categories',
        details: [{ field: 'applicableFeeCategories', message: `Invalid categories: ${invalidCategories.join(', ')}`, code: 'INVALID_CATEGORY' }]
      });
    }

    // Validate dates
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid date range',
        details: [{ field: 'endDate', message: 'End date must be after start date', code: 'INVALID_DATE_RANGE' }]
      });
    }

    // Create discount
    const discount = await prisma.discount.create({
      data: {
        name,
        type,
        value,
        applicableFeeCategories,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        requiresApproval: requiresApproval || false,
        isActive: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Discount',
        entityId: discount.id,
        action: 'CREATE',
        userId: req.user.id,
        newValue: discount,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({ message: 'Discount created successfully', data: discount });

  } catch (error) {
    console.error('Create discount error:', error);
    res.status(500).json({
      error: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred',
      details: { errorId: `error-${Date.now()}`, timestamp: new Date().toISOString() }
    });
  }
});

/**
 * GET /api/finance/discounts
 * List discounts with filtering
 */
router.get('/', authenticateWithBranch, requirePermission(FINANCE_PERMISSIONS.DISCOUNTS_VIEW), async (req, res) => {
  try {
    const { type, isActive, search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [discounts, total] = await Promise.all([
      prisma.discount.findMany({ where, skip, take, orderBy: [{ createdAt: 'desc' }] }),
      prisma.discount.count({ where })
    ]);

    res.json({
      data: discounts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });

  } catch (error) {
    console.error('List discounts error:', error);
    res.status(500).json({
      error: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred',
      details: { errorId: `error-${Date.now()}`, timestamp: new Date().toISOString() }
    });
  }
});

/**
 * GET /api/finance/discounts/:id
 * Get discount details
 */
router.get('/:id', authenticateWithBranch, requirePermission(FINANCE_PERMISSIONS.DISCOUNTS_VIEW), async (req, res) => {
  try {
    const { id } = req.params;
    const discount = await prisma.discount.findUnique({ where: { id } });

    if (!discount) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Discount not found',
        details: { entityType: 'Discount', entityId: id }
      });
    }

    res.json({ data: discount });

  } catch (error) {
    console.error('Get discount error:', error);
    res.status(500).json({
      error: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred',
      details: { errorId: `error-${Date.now()}`, timestamp: new Date().toISOString() }
    });
  }
});

module.exports = router;
