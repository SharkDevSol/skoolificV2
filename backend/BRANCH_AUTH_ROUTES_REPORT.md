# Branch Authentication Routes Update Report

Generated: 2026-04-29T09:24:29.675Z

## Summary

- **Total Route Files:** 80
- **Already Updated:** 1
- **Needs Update:** 28
- **No Authentication:** 51

## Files Needing Update (28)

| File | Auth Usage | DB Usage | Priority |
|------|------------|----------|----------|
| machineAttendance.js | 15 routes | 0 queries | 🔴 High |
| deviceUserManagement.js | 12 routes | 0 queries | 🔴 High |
| financeMonthlyPaymentViewRoutes.js | 12 routes | 0 queries | 🔴 High |
| simpleExpenseRoutes.js | 9 routes | 0 queries | 🟡 Medium |
| financeInvoiceRoutes.js | 8 routes | 0 queries | 🟡 Medium |
| financeAccountRoutes.js | 7 routes | 0 queries | 🟡 Medium |
| guardianNotificationRoutes.js | 7 routes | 0 queries | 🟡 Medium |
| simpleFeePayments.js | 7 routes | 0 queries | 🟡 Medium |
| adminRoutes.js | 6 routes | 0 queries | 🟡 Medium |
| financeFeeStructureRoutes.js | 6 routes | 0 queries | 🟡 Medium |
| financeLateFeeRoutes.js | 6 routes | 0 queries | 🟡 Medium |
| financeMonthlyPaymentRoutes.js | 6 routes | 0 queries | 🟡 Medium |
| financePaymentRoutes.js | 6 routes | 0 queries | 🟡 Medium |
| simpleBudgetRoutes.js | 6 routes | 0 queries | 🟡 Medium |
| simpleFeeManagement.js | 6 routes | 0 queries | 🟡 Medium |
| financeClassStudentRoutes.js | 5 routes | 0 queries | 🟢 Low |
| financeDiscountRoutes.js | 4 routes | 0 queries | 🟢 Low |
| financeLateFeeApplicationRoutes.js | 4 routes | 0 queries | 🟢 Low |
| financeScholarshipRoutes.js | 4 routes | 0 queries | 🟢 Low |
| staffRoutes.js | 4 routes | 2 queries | 🟢 Low |
| financeProgressiveInvoiceRoutes.js | 3 routes | 0 queries | 🟢 Low |
| dashboardRoutes.js | 2 routes | 40 queries | 🟢 Low |
| financeSimpleInvoiceRoutes.js | 2 routes | 0 queries | 🟢 Low |
| postRoutes.js | 2 routes | 0 queries | 🟢 Low |
| reportsRoutes.js | 2 routes | 0 queries | 🟢 Low |
| staffFaultsRoutes.js | 2 routes | 0 queries | 🟢 Low |
| studentFaultsRoutes.js | 2 routes | 0 queries | 🟢 Low |
| subAccountRoutes.js | 2 routes | 0 queries | 🟢 Low |

## Already Updated (1)

- ✅ studentRoutes.js

## No Authentication (51)

- ✓ studentAttendance.js
- ✓ adminAttendanceRoutes.js
- ✓ dashboardReports.js
- ✓ attendanceRoutes.js
- ✓ attendanceTimeSettings.js
- ✓ chatRoutes.js
- ✓ classCommunicationRoutes.js
- ✓ classTeacherRoutes.js
- ✓ evaluationBookRoutes.js
- ✓ evaluations.js
- ✓ accounts.js
- ✓ budgets.js
- ✓ dashboardReports.js
- ✓ expenses.js
- ✓ feeStructures.js
- ✓ index.js
- ✓ invoices.js
- ✓ payments.js
- ✓ payroll.js
- ✓ reports.js
- ✓ guardianAttendanceRoutes.js
- ✓ guardianListRoutes.js
- ✓ guardianPayments.js
- ✓ guardianStudentAttendance.js
- ✓ attendance.js
- ✓ dashboardReports.js
- ✓ index.js
- ✓ leaveManagement.js
- ✓ payroll.js
- ✓ salaryManagement.js
- ✓ dashboardReports.js
- ✓ index.js
- ✓ items.js
- ✓ machineWebhook.js
- ✓ markListRoutes.js
- ✓ SchoolYear.js
- ✓ scheduleRoutes.js
- ✓ schoolSetupRoutes.js
- ✓ settingsRoutes.js
- ✓ shiftSettings.js
- ✓ staffAttendanceLog.js
- ✓ staffAttendanceRoutes.js
- ✓ staffMachineMapping.js
- ✓ staff_auth.js
- ✓ studentActivitiesRoutes.js
- ✓ studentAttendanceRoutes.js
- ✓ studentListRoutes.js
- ✓ task6Routes.js
- ✓ taskStatusRoutes.js
- ✓ usbAttendanceImport.js
- ✓ viewStudentAttendanceRoutes.js

## Update Instructions

For each file that needs update:

1. **Update imports:**
   ```javascript
   // Add this import
   const { authenticateWithBranch, validateBranchCode } = require('../middleware/branchAuth');
   ```

2. **Replace middleware in routes:**
   ```javascript
   // OLD
   router.get('/route', authenticateToken, (req, res) => { ... });

   // NEW
   router.get('/route', authenticateWithBranch, (req, res) => { ... });
   ```

3. **Update database queries:**
   ```javascript
   // OLD
   const result = await db.query('SELECT ...');

   // NEW
   const pool = req.branchPool;
   const result = await pool.query('SELECT ...');
   ```

