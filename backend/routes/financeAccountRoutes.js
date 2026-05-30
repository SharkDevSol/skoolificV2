const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');
const prisma = new PrismaClient();

// Security middleware
const { authenticateWithBranch, validateBranchCode } = require('../middleware/branchAuth');
const { requirePermission, FINANCE_PERMISSIONS } = require('../middleware/financeAuth');

/**
 * POST /api/finance/accounts
 * Create a new account with validation
 */
router.post('/', authenticateWithBranch, requirePermission(FINANCE_PERMISSIONS.ACCOUNTS_CREATE), async (req, res) => {
  try {
    const { code, name, type, parentId, campusId } = req.body;

    // Validation
    if (!code || !name || !type) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [
          { field: 'code', message: 'Account code is required', code: 'REQUIRED_FIELD' },
          { field: 'name', message: 'Account name is required', code: 'REQUIRED_FIELD' },
          { field: 'type', message: 'Account type is required', code: 'REQUIRED_FIELD' }
        ].filter(d => 
          (!code && d.field === 'code') || 
          (!name && d.field === 'name') || 
          (!type && d.field === 'type')
        )
      });
    }

    // Validate account type
    const validTypes = ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid account type',
        details: [
          { field: 'type', message: `Account type must be one of: ${validTypes.join(', ')}`, code: 'INVALID_TYPE' }
        ]
      });
    }

    // Check if account code already exists
    const existingAccount = await prisma.account.findUnique({
      where: { code }
    });

    if (existingAccount) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Account code already exists',
        details: {
          entityType: 'Account',
          field: 'code',
          value: code
        }
      });
    }

    // If parentId is provided, validate parent exists and is active
    if (parentId) {
      const parent = await prisma.account.findUnique({
        where: { id: parentId }
      });

      if (!parent) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Parent account not found',
          details: {
            entityType: 'Account',
            entityId: parentId
          }
        });
      }

      if (!parent.isActive) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Parent account is not active',
          details: [
            { field: 'parentId', message: 'Cannot create account under inactive parent', code: 'INACTIVE_PARENT' }
          ]
        });
      }

      // Update parent to mark it as non-leaf
      await prisma.account.update({
        where: { id: parentId },
        data: { isLeaf: false }
      });
    }

    // Create account
    const account = await prisma.account.create({
      data: {
        code,
        name,
        type,
        parentId: parentId || null,
        campusId: campusId || null,
        isActive: true,
        isLeaf: true,
        createdBy: req.user.id
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Account',
        entityId: account.id,
        action: 'CREATE',
        userId: req.user.id,
        newValue: account,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({
      message: 'Account created successfully',
      data: account
    });

  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({
      error: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred',
      details: {
        errorId: `error-${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/finance/accounts
 * List accounts with filtering
 */
router.get('/', authenticateWithBranch, requirePermission(FINANCE_PERMISSIONS.ACCOUNTS_VIEW), async (req, res) => {
  try {
    const { type, campusId, isActive, parentId, search, page = 1, limit = 50 } = req.query;

    // Build filter
    const where = {};
    
    if (type) {
      where.type = type;
    }
    
    if (campusId) {
      where.campusId = campusId;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (parentId) {
      where.parentId = parentId === 'null' ? null : parentId;
    }
    
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Fetch accounts
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip,
        take,
        orderBy: [
          { code: 'asc' }
        ],
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          _count: {
            select: {
              children: true
            }
          }
        }
      }),
      prisma.account.count({ where })
    ]);

    res.json({
      data: accounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('List accounts error:', error);
    res.status(500).json({
      error: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred',
      details: {
        errorId: `error-${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/finance/accounts/tree
 * Get hierarchical account tree
 */
router.get('/tree', authenticateWithBranch, requirePermission(FINANCE_PERMISSIONS.ACCOUNTS_VIEW), async (req, res) => {
  try {
    const { type, campusId } = req.query;

    // Build filter for root accounts
    const where = {
      parentId: null
    };
    
    if (type) {
      where.type = type;
    }
    
    if (campusId) {
      where.campusId = campusId;
    }

    // Fetch root accounts with nested children
    const accounts = await prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        children: {
          orderBy: { code: 'asc' },
          include: {
            children: {
              orderBy: { code: 'asc' },
              include: {
                children: {
                  orderBy: { code: 'asc' },
                  include: {
                    children: {
                      orderBy: { code: 'asc' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    res.json({
      data: accounts
    });

  } catch (error) {
    console.error('Get account tree error:', error);
    res.status(500).json({
      error: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred',
      details: {
        errorId: `error-${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/finance/accounts/:id
 * Get account details
 */
router.get('/:id', authenticateWithBranch, requirePermission(FINANCE_PERMISSIONS.ACCOUNTS_VIEW), async (req, res) => {
  try {
    const { id } = req.params;

    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true
          }
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            isActive: true,
            isLeaf: true
          },
          orderBy: { code: 'asc' }
        },
        _count: {
          select: {
            feeStructureItems: true,
            invoiceItems: true,
            expenses: true,
            budgetLines: true,
            transactionLines: true
          }
        }
      }
    });

    if (!account) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Account not found',
        details: {
          entityType: 'Account',
          entityId: id
        }
      });
    }

    res.json({
      data: account
    });

  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({
      error: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred',
      details: {
        errorId: `error-${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /api/finance/accounts/:id
 * Update account
 */
router.put('/:id', authenticateWithBranch, requirePermission(FINANCE_PERMISSIONS.ACCOUNTS_UPDATE), async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, type, parentId, campusId } = req.body;

    // Check if account exists
    const existingAccount = await prisma.account.findUnique({
      where: { id }
    });

    if (!existingAccount) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Account not found',
        details: {
          entityType: 'Account',
          entityId: id
        }
      });
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingAccount.code) {
      const duplicateCode = await prisma.account.findUnique({
        where: { code }
      });

      if (duplicateCode) {
        return res.status(409).json({
          error: 'CONFLICT',
          message: 'Account code already exists',
          details: {
            entityType: 'Account',
            field: 'code',
            value: code
          }
        });
      }
    }

    // Validate account type if provided
    if (type) {
      const validTypes = ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid account type',
          details: [
            { field: 'type', message: `Account type must be one of: ${validTypes.join(', ')}`, code: 'INVALID_TYPE' }
          ]
        });
      }
    }

    // If parentId is being changed, validate new parent
    if (parentId !== undefined && parentId !== existingAccount.parentId) {
      if (parentId) {
        const parent = await prisma.account.findUnique({
          where: { id: parentId }
        });

        if (!parent) {
          return res.status(404).json({
            error: 'NOT_FOUND',
            message: 'Parent account not found',
            details: {
              entityType: 'Account',
              entityId: parentId
            }
          });
        }

        if (!parent.isActive) {
          return res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Parent account is not active',
            details: [
              { field: 'parentId', message: 'Cannot move account under inactive parent', code: 'INACTIVE_PARENT' }
            ]
          });
        }

        // Prevent circular reference
        if (parentId === id) {
          return res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Account cannot be its own parent',
            details: [
              { field: 'parentId', message: 'Circular reference not allowed', code: 'CIRCULAR_REFERENCE' }
            ]
          });
        }
      }

      // Update old parent's isLeaf status if needed
      if (existingAccount.parentId) {
        const oldParentChildren = await prisma.account.count({
          where: {
            parentId: existingAccount.parentId,
            id: { not: id }
          }
        });

        if (oldParentChildren === 0) {
          await prisma.account.update({
            where: { id: existingAccount.parentId },
            data: { isLeaf: true }
          });
        }
      }

      // Update new parent's isLeaf status
      if (parentId) {
        await prisma.account.update({
          where: { id: parentId },
          data: { isLeaf: false }
        });
      }
    }

    // Update account
    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(type && { type }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(campusId !== undefined && { campusId: campusId || null })
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Account',
        entityId: id,
        action: 'UPDATE',
        userId: req.user.id,
        oldValue: existingAccount,
        newValue: updatedAccount,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      message: 'Account updated successfully',
      data: updatedAccount
    });

  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({
      error: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred',
      details: {
        errorId: `error-${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * DELETE /api/finance/accounts/:id
 * Deactivate account (soft delete)
 */
router.delete('/:id', authenticateWithBranch, requirePermission(FINANCE_PERMISSIONS.ACCOUNTS_DELETE), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if account exists
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            transactionLines: true
          }
        }
      }
    });

    if (!account) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Account not found',
        details: {
          entityType: 'Account',
          entityId: id
        }
      });
    }

    // Check if account has children
    const childrenCount = await prisma.account.count({
      where: { parentId: id }
    });

    if (childrenCount > 0) {
      return res.status(400).json({
        error: 'BUSINESS_LOGIC_ERROR',
        message: 'Cannot deactivate account with active children',
        details: {
          accountId: id,
          childrenCount
        }
      });
    }

    // Deactivate account (soft delete)
    const deactivatedAccount = await prisma.account.update({
      where: { id },
      data: { isActive: false }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Account',
        entityId: id,
        action: 'DELETE',
        userId: req.user.id,
        oldValue: account,
        newValue: deactivatedAccount,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      message: 'Account deactivated successfully',
      data: deactivatedAccount
    });

  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      error: 'SYSTEM_ERROR',
      message: 'An unexpected error occurred',
      details: {
        errorId: `error-${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;
