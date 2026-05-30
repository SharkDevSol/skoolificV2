const express = require('express');
const { getEndpointPath, API_ENDPOINTS } = require('../../config/api.config');
const router = express.Router();

// Import sub-routes
const accountsRouter = require('./accounts');
const feeStructuresRouter = require('./feeStructures');
const invoicesRouter = require('./invoices');
const paymentsRouter = require('./payments');
const expensesRouter = require('./expenses');
const budgetsRouter = require('./budgets');
const payrollRouter = require('./payroll');
const reportsRouter = require('./reports');

// Mount sub-routes
router.use('/accounts', accountsRouter);
router.use('/fee-structures', feeStructuresRouter);
router.use('/invoices', invoicesRouter);
router.use('/payments', paymentsRouter);
router.use('/expenses', expensesRouter);
router.use('/budgets', budgetsRouter);
router.use('/payroll', payrollRouter);
router.use('/reports', reportsRouter);

module.exports = router;
