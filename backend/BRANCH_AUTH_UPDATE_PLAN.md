# Branch Authentication Update Plan

## Task 1.7.5: Update all protected routes to use new authentication middleware

### Overview
This document tracks the systematic update of all backend routes to support multi-branch authentication using the new `authenticateWithBranch` middleware.

### Strategy

**Current Authentication:**
```javascript
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
router.get('/protected-route', authenticateToken, (req, res) => { ... });
```

**New Branch Authentication:**
```javascript
const { authenticateWithBranch, validateBranchCode } = require('../middleware/branchAuth');
router.get('/protected-route', authenticateWithBranch, (req, res) => {
  // req.branchCode and req.branchPool are now available
  const pool = req.branchPool;
  // Use pool for database queries
});
```

### Migration Rules

1. **Public Routes** (no auth) → No changes needed
2. **Protected Routes** (authenticateToken) → Replace with `authenticateWithBranch`
3. **Database Queries** → Use `req.branchPool` instead of global `db`
4. **Branch Context** → Access via `req.branchCode`

### Route Files Status

#### ✅ Already Updated
- [x] `branchRoutes.js` - Already uses branch authentication

#### 🔄 Need Update (High Priority - Core Features)
- [ ] `studentRoutes.js` - Student management
- [ ] `staffRoutes.js` - Staff management
- [ ] `attendanceRoutes.js` - Attendance tracking
- [ ] `markListRoutes.js` - Mark lists/grades
- [ ] `financePaymentRoutes.js` - Payment processing
- [ ] `dashboardRoutes.js` - Dashboard data

#### 🔄 Need Update (Medium Priority - Academic)
- [ ] `classTeacherRoutes.js`
- [ ] `evaluationBookRoutes.js`
- [ ] `evaluations.js`
- [ ] `scheduleRoutes.js`
- [ ] `schoolSetupRoutes.js`
- [ ] `task6Routes.js`
- [ ] `taskStatusRoutes.js`

#### 🔄 Need Update (Medium Priority - Finance)
- [ ] `financeAccountRoutes.js`
- [ ] `financeClassStudentRoutes.js`
- [ ] `financeDiscountRoutes.js`
- [ ] `financeFeeStructureRoutes.js`
- [ ] `financeInvoiceRoutes.js`
- [ ] `financeLateFeeApplicationRoutes.js`
- [ ] `financeLateFeeRoutes.js`
- [ ] `financeMonthlyPaymentRoutes.js`
- [ ] `financeMonthlyPaymentViewRoutes.js`
- [ ] `financeProgressiveInvoiceRoutes.js`
- [ ] `financeScholarshipRoutes.js`
- [ ] `financeSimpleInvoiceRoutes.js`
- [ ] `simpleBudgetRoutes.js`
- [ ] `simpleExpenseRoutes.js`
- [ ] `simpleFeeManagement.js`
- [ ] `simpleFeePayments.js`

#### 🔄 Need Update (Medium Priority - HR)
- [ ] `staffAttendanceRoutes.js`
- [ ] `staffAttendanceLog.js`
- [ ] `staffFaultsRoutes.js`
- [ ] `staffMachineMapping.js`
- [ ] `adminAttendanceRoutes.js`
- [ ] `attendanceTimeSettings.js`
- [ ] `shiftSettings.js`

#### 🔄 Need Update (Medium Priority - Communication)
- [ ] `chatRoutes.js`
- [ ] `classCommunicationRoutes.js`
- [ ] `postRoutes.js`
- [ ] `guardianNotificationRoutes.js`

#### 🔄 Need Update (Low Priority - Guardian/Student Views)
- [ ] `guardianAttendanceRoutes.js`
- [ ] `guardianListRoutes.js`
- [ ] `guardianPayments.js`
- [ ] `guardianStudentAttendance.js`
- [ ] `studentActivitiesRoutes.js`
- [ ] `studentAttendanceRoutes.js`
- [ ] `studentFaultsRoutes.js`
- [ ] `studentListRoutes.js`
- [ ] `viewStudentAttendanceRoutes.js`

#### 🔄 Need Update (Low Priority - Reports & Settings)
- [ ] `reportsRoutes.js`
- [ ] `settingsRoutes.js`
- [ ] `subAccountRoutes.js`
- [ ] `adminRoutes.js`

#### 🔄 Need Update (Low Priority - Specialized)
- [ ] `machineAttendance.js`
- [ ] `machineWebhook.js`
- [ ] `usbAttendanceImport.js`
- [ ] `deviceUserManagement.js`

#### ⚠️ Special Cases (Review Needed)
- [ ] `staff_auth.js` - Authentication routes (may need special handling)
- [ ] `healthRoutes.js` - Health check (probably no auth needed)

#### 📁 Subdirectories
- [ ] `routes/academic/` - Need to explore
- [ ] `routes/assets/` - Need to explore
- [ ] `routes/finance/` - Need to explore
- [ ] `routes/hr/` - Need to explore
- [ ] `routes/inventory/` - Need to explore

### Update Template

```javascript
// OLD CODE
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/db');

router.get('/example', authenticateToken, async (req, res) => {
  const result = await db.query('SELECT * FROM table');
  res.json(result.rows);
});

// NEW CODE
const { authenticateWithBranch } = require('../middleware/branchAuth');

router.get('/example', authenticateWithBranch, async (req, res) => {
  const pool = req.branchPool;
  const result = await pool.query('SELECT * FROM table');
  res.json(result.rows);
});
```

### Testing Checklist

After updating each route file:
- [ ] Verify imports are correct
- [ ] Verify all protected routes use `authenticateWithBranch`
- [ ] Verify database queries use `req.branchPool`
- [ ] Verify branch code is accessible via `req.branchCode`
- [ ] Test with valid branch code
- [ ] Test with invalid branch code
- [ ] Test without branch code

### Progress Tracking

**Total Route Files:** ~70+
**Updated:** 1
**Remaining:** ~69

**Estimated Time:** 
- High Priority (6 files): ~3 hours
- Medium Priority (40 files): ~8 hours
- Low Priority (24 files): ~4 hours
- **Total:** ~15 hours

### Notes

1. **Backward Compatibility:** The old `authenticateToken` middleware still works for routes that don't need branch context
2. **Gradual Migration:** We can update routes incrementally without breaking existing functionality
3. **Database Pool:** Each branch has its own connection pool managed by DatabaseConnectionManager
4. **Branch Code:** Always available in `req.branchCode` after authentication
5. **Error Handling:** Branch validation errors return 404 with clear messages

### Next Steps

1. ✅ Update middleware exports
2. 🔄 Update high-priority routes (studentRoutes, staffRoutes, etc.)
3. 🔄 Update medium-priority routes
4. 🔄 Update low-priority routes
5. 🔄 Test all updated routes
6. 🔄 Update frontend to send branch codes
7. 🔄 Complete Task 1.7.6-1.7.8
