const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const db = require('../config/db');
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

/**
 * GET /api/health
 * System health check endpoint
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check PostgreSQL connection
    try {
      await db.query('SELECT 1');
      health.checks.database = { status: 'ok', message: 'PostgreSQL connected' };
    } catch (error) {
      health.checks.database = { status: 'error', message: error.message };
      health.status = 'degraded';
    }

    // Check Prisma connection and tables
    try {
      await prisma.account.findFirst();
      health.checks.prisma = { status: 'ok', message: 'Prisma tables exist' };
    } catch (error) {
      if (error.code === 'P2021') {
        health.checks.prisma = { status: 'error', message: 'Prisma tables not found - run migrations' };
      } else {
        health.checks.prisma = { status: 'error', message: error.message };
      }
      health.status = 'degraded';
    }

    // Check default accounts
    try {
      const accountCount = await prisma.account.count({
        where: {
          code: {
            in: ['1000', '2000', '4000', '5000']
          }
        }
      });
      
      if (accountCount >= 4) {
        health.checks.defaultAccounts = { status: 'ok', message: 'All default accounts exist' };
      } else {
        health.checks.defaultAccounts = { 
          status: 'warning', 
          message: `Only ${accountCount}/4 default accounts found` 
        };
        if (health.status === 'ok') health.status = 'degraded';
      }
    } catch (error) {
      health.checks.defaultAccounts = { status: 'error', message: 'Could not check accounts' };
      if (health.status === 'ok') health.status = 'degraded';
    }

    // Check class tables
    try {
      const tables = await db.query(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1',
        ['classes_schema']
      );
      const tableCount = parseInt(tables.rows[0].count);
      health.checks.classTables = { 
        status: 'ok', 
        message: `${tableCount} class tables found` 
      };
    } catch (error) {
      health.checks.classTables = { status: 'error', message: error.message };
      if (health.status === 'ok') health.status = 'degraded';
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error.message
    });
  }
});

/**
 * GET /api/health/setup-status
 * Detailed setup status
 */
router.get('/setup-status', async (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    setup: {
      migrations: { completed: false, message: '' },
      defaultAccounts: { completed: false, message: '', accounts: [] },
      recommendations: []
    }
  };

  try {
    // Check migrations
    try {
      await prisma.account.findFirst();
      status.setup.migrations.completed = true;
      status.setup.migrations.message = 'Prisma migrations are up to date';
    } catch (error) {
      if (error.code === 'P2021') {
        status.setup.migrations.message = 'Prisma tables not found';
        status.setup.recommendations.push('Run: npx prisma migrate deploy');
      } else {
        status.setup.migrations.message = error.message;
      }
    }

    // Check default accounts
    try {
      const accounts = await prisma.account.findMany({
        where: {
          code: {
            in: ['1000', '2000', '4000', '5000']
          }
        },
        select: {
          code: true,
          name: true,
          type: true,
          isActive: true
        }
      });

      status.setup.defaultAccounts.accounts = accounts;
      status.setup.defaultAccounts.completed = accounts.length >= 4;
      status.setup.defaultAccounts.message = `${accounts.length}/4 default accounts found`;

      if (accounts.length < 4) {
        status.setup.recommendations.push('Run: node scripts/setup-default-accounts.js');
      }
    } catch (error) {
      status.setup.defaultAccounts.message = 'Could not check accounts';
    }

    // Overall status
    status.ready = status.setup.migrations.completed && status.setup.defaultAccounts.completed;

    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
