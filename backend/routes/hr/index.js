const express = require('express');
const { getEndpointPath, API_ENDPOINTS } = require('../../config/api.config');
const router = express.Router();

// Import sub-routers
const salaryManagementRouter = require('./salaryManagement');
const dashboardReportsRouter = require('./dashboardReports');
const attendanceRouter = require('./attendance');
const leaveManagementRouter = require('./leaveManagement');
const payrollRouter = require('./payroll');

// Mount sub-routers
router.use('/salary', salaryManagementRouter);
router.use('/dashboard', dashboardReportsRouter);
router.use('/leave', leaveManagementRouter);
router.use('/payroll', payrollRouter);
router.use('/', attendanceRouter); // Mount attendance routes at /api/hr/

module.exports = router;
