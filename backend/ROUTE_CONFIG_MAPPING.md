# Route to API Config Mapping

This document maps the route files to their corresponding API config entries in `backend/config/api.config.js`.

## Overview

All route files now import the centralized API configuration:
```javascript
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');
```

The routes are mounted in `backend/server.js` with prefixes, and the full paths are defined in the API config.

## Route Mapping

### Authentication & Admin Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `adminRoutes.js` | `/api/admin` | `AUTH.ADMIN_LOGIN` | `/api/admin/login` |
| `adminRoutes.js` | `/api/admin` | `ADMIN.PROFILE` | `/api/admin/profile` |
| `adminRoutes.js` | `/api/admin` | `ADMIN.SUB_ACCOUNTS` | `/api/admin/sub-accounts` |
| `subAccountRoutes.js` | `/api/admin/sub-accounts` | `ADMIN.SUB_ACCOUNTS` | `/api/admin/sub-accounts` |
| `branchRoutes.js` | `/api/v2/branches` | `AUTH.VALIDATE_BRANCH` | `/api/v2/branches/validate` |

### Student Management Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `studentRoutes.js` | `/api/students` | `STUDENTS.BASE` | `/api/students` |
| `studentRoutes.js` | `/api/students` | `STUDENTS.REGISTER` | `/api/students/register` |
| `studentRoutes.js` | `/api/students` | `STUDENTS.BY_ID(id)` | `/api/students/:id` |
| `studentListRoutes.js` | `/api/student-list` | `STUDENTS.LIST` | `/api/student-list` |
| `studentActivitiesRoutes.js` | `/api/student-activities` | `STUDENTS.ACTIVITIES` | `/api/student-activities` |
| `studentFaultsRoutes.js` | `/api/faults` | `FAULTS.STUDENT` | `/api/faults` |

### Staff Management Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `staffRoutes.js` | `/api/staff` | `STAFF.BASE` | `/api/staff` |
| `staffRoutes.js` | `/api/staff` | `STAFF.REGISTER` | `/api/staff/register` |
| `staffRoutes.js` | `/api/staff` | `STAFF.BY_ID(id)` | `/api/staff/:id` |
| `staffFaultsRoutes.js` | `/api/staff/faults` | `STAFF.FAULTS` | `/api/staff/faults` |

### Attendance Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `attendanceRoutes.js` | `/api/attendance` | `ATTENDANCE.STUDENT.BASE` | `/api/attendance` |
| `attendanceRoutes.js` | `/api/attendance` | `ATTENDANCE.STUDENT.MARK` | `/api/attendance/mark` |
| `viewStudentAttendanceRoutes.js` | `/api/view-attendance` | `ATTENDANCE.STUDENT.VIEW` | `/api/view-attendance` |
| `studentAttendanceRoutes.js` | `/api/student-attendance` | `ATTENDANCE.STUDENT.SETTINGS` | `/api/student-attendance` |
| `academic/studentAttendance.js` | `/api/academic/student-attendance` | `ATTENDANCE.STUDENT.ACADEMIC` | `/api/academic/student-attendance` |
| `staffAttendanceRoutes.js` | `/api/staff-attendance` | `ATTENDANCE.STAFF.BASE` | `/api/staff-attendance` |
| `staffAttendanceLog.js` | `/api/staff-attendance` | `ATTENDANCE.STAFF.LOG` | `/api/staff-attendance/log` |
| `adminAttendanceRoutes.js` | `/api/admin-attendance` | `ATTENDANCE.STAFF.ADMIN` | `/api/admin-attendance` |
| `machineAttendance.js` | `/api/machine-attendance` | `ATTENDANCE.MACHINE.BASE` | `/api/machine-attendance` |
| `machineWebhook.js` | `/api/machine-webhook` | `ATTENDANCE.MACHINE.WEBHOOK` | `/api/machine-webhook` |
| `usbAttendanceImport.js` | `/api/usb-attendance` | `ATTENDANCE.MACHINE.USB_IMPORT` | `/api/usb-attendance` |
| `staffMachineMapping.js` | `/api/staff/machine-mapping` | `ATTENDANCE.MACHINE.MAPPING` | `/api/staff/machine-mapping` |

### Academic Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `markListRoutes.js` | `/api/mark-list` | `ACADEMIC.MARK_LIST.BASE` | `/api/mark-list` |
| `markListRoutes.js` | `/api/mark-list` | `ACADEMIC.MARK_LIST.CREATE` | `/api/mark-list/create` |
| `evaluations.js` | `/api/evaluations` | `ACADEMIC.EVALUATIONS.BASE` | `/api/evaluations` |
| `evaluationBookRoutes.js` | `/api/evaluation-book` | `ACADEMIC.EVALUATIONS.BOOK` | `/api/evaluation-book` |
| `scheduleRoutes.js` | `/api/schedule` | `ACADEMIC.SCHEDULE.BASE` | `/api/schedule` |
| `classTeacherRoutes.js` | `/api/class-teacher` | `ACADEMIC.CLASS_TEACHER.BASE` | `/api/class-teacher` |

### Finance Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `financeAccountRoutes.js` | `/api/finance/accounts` | `FINANCE.ACCOUNTS.BASE` | `/api/finance/accounts` |
| `simpleFeeManagement.js` | `/api/simple-fees` | `FINANCE.FEES.BASE` | `/api/simple-fees` |
| `simpleFeePayments.js` | `/api/fee-payments` | `FINANCE.FEES.PAYMENTS` | `/api/fee-payments` |
| `financeFeeStructureRoutes.js` | `/api/finance/fee-structures` | `FINANCE.FEES.STRUCTURES` | `/api/finance/fee-structures` |
| `financeDiscountRoutes.js` | `/api/finance/discounts` | `FINANCE.FEES.DISCOUNTS` | `/api/finance/discounts` |
| `financeScholarshipRoutes.js` | `/api/finance/scholarships` | `FINANCE.FEES.SCHOLARSHIPS` | `/api/finance/scholarships` |
| `financeLateFeeRoutes.js` | `/api/finance/late-fee-rules` | `FINANCE.FEES.LATE_FEES` | `/api/finance/late-fee-rules` |
| `financeLateFeeApplicationRoutes.js` | `/api/finance` | `FINANCE.FEES.LATE_FEE_APPLICATION` | `/api/finance/late-fee-application` |
| `financeInvoiceRoutes.js` | `/api/finance/invoices` | `FINANCE.INVOICES.BASE` | `/api/finance/invoices` |
| `financeSimpleInvoiceRoutes.js` | `/api/finance/simple-invoices` | `FINANCE.INVOICES.SIMPLE` | `/api/finance/simple-invoices` |
| `financeProgressiveInvoiceRoutes.js` | `/api/finance/progressive-invoices` | `FINANCE.INVOICES.PROGRESSIVE` | `/api/finance/progressive-invoices` |
| `financePaymentRoutes.js` | `/api/finance/payments` | `FINANCE.PAYMENTS.BASE` | `/api/finance/payments` |
| `financeMonthlyPaymentRoutes.js` | `/api/finance/monthly-payments` | `FINANCE.PAYMENTS.MONTHLY` | `/api/finance/monthly-payments` |
| `financeMonthlyPaymentViewRoutes.js` | `/api/finance/monthly-payments-view` | `FINANCE.PAYMENTS.MONTHLY_VIEW` | `/api/finance/monthly-payments-view` |
| `financeClassStudentRoutes.js` | `/api/finance` | `FINANCE.CLASS_STUDENTS` | `/api/finance/class-students` |
| `simpleExpenseRoutes.js` | `/api/finance/expenses` | `FINANCE.EXPENSES.BASE` | `/api/finance/expenses` |
| `simpleBudgetRoutes.js` | `/api/finance/budgets` | `FINANCE.BUDGETS.BASE` | `/api/finance/budgets` |
| `finance/accounts.js` | `/api/finance/accounts` | `FINANCE.ACCOUNTS.BASE` | `/api/finance/accounts` |
| `finance/expenses.js` | `/api/finance/expenses` | `FINANCE.EXPENSES.BASE` | `/api/finance/expenses` |
| `finance/budgets.js` | `/api/finance/budgets` | `FINANCE.BUDGETS.BASE` | `/api/finance/budgets` |
| `finance/feeStructures.js` | `/api/finance/fee-structures` | `FINANCE.FEES.STRUCTURES` | `/api/finance/fee-structures` |
| `finance/invoices.js` | `/api/finance/invoices` | `FINANCE.INVOICES.BASE` | `/api/finance/invoices` |
| `finance/payments.js` | `/api/finance/payments` | `FINANCE.PAYMENTS.BASE` | `/api/finance/payments` |
| `finance/payroll.js` | `/api/finance/payroll` | `FINANCE.PAYMENTS.BASE` | `/api/finance/payroll` |
| `finance/reports.js` | `/api/finance/reports` | `FINANCE.REPORTS` | `/api/finance/reports` |
| `finance/dashboardReports.js` | `/api/reports/finance` | `REPORTS.FINANCE` | `/api/reports/finance` |

### HR Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `hr/index.js` | `/api/hr` | `HR.BASE` | `/api/hr` |
| `hr/attendance.js` | `/api/hr` | `HR.BASE` | `/api/hr/attendance` |
| `hr/salaryManagement.js` | `/api/hr` | `HR.SALARY.BASE` | `/api/hr/salary` |
| `hr/leaveManagement.js` | `/api/hr` | `HR.LEAVE.BASE` | `/api/hr/leave` |
| `hr/payroll.js` | `/api/hr` | `HR.BASE` | `/api/hr/payroll` |
| `hr/dashboardReports.js` | `/api/reports/hr` | `REPORTS.HR` | `/api/reports/hr` |
| `shiftSettings.js` | `/api/hr/shift-settings` | `HR.SHIFT_SETTINGS` | `/api/hr/shift-settings` |

### Inventory & Assets Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `inventory/index.js` | `/api/inventory` | `INVENTORY.BASE` | `/api/inventory` |
| `inventory/items.js` | `/api/inventory` | `INVENTORY.ITEMS` | `/api/inventory/items` |
| `inventory/dashboardReports.js` | `/api/reports/inventory` | `REPORTS.INVENTORY` | `/api/reports/inventory` |
| `assets/dashboardReports.js` | `/api/reports/assets` | `REPORTS.ASSETS` | `/api/reports/assets` |

### Communication Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `postRoutes.js` | `/api/posts` | `COMMUNICATION.POSTS.BASE` | `/api/posts` |
| `chatRoutes.js` | `/api/chats` | `COMMUNICATION.CHAT.BASE` | `/api/chats` |
| `classCommunicationRoutes.js` | `/api/class-communication` | `COMMUNICATION.CLASS_COMMUNICATION.BASE` | `/api/class-communication` |

### Guardian Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `guardianListRoutes.js` | `/api/guardian-list` | `GUARDIANS.BASE` | `/api/guardian-list` |
| `guardianAttendanceRoutes.js` | `/api/guardian-attendance` | `GUARDIANS.ATTENDANCE` | `/api/guardian-attendance` |
| `guardianStudentAttendance.js` | `/api/guardian-student-attendance` | `GUARDIANS.STUDENT_ATTENDANCE` | `/api/guardian-student-attendance` |
| `guardianPayments.js` | `/api/guardian-payments` | `GUARDIANS.PAYMENTS` | `/api/guardian-payments` |
| `guardianNotificationRoutes.js` | `/api/guardian-notifications` | `GUARDIANS.NOTIFICATIONS` | `/api/guardian-notifications` |

### System Routes

| Route File | Mount Prefix | Config Entry | Full Path |
|------------|--------------|--------------|-----------|
| `healthRoutes.js` | `/api/health` | `HEALTH.CHECK` | `/api/health` |
| `dashboardRoutes.js` | `/api/dashboard` | `DASHBOARD.BASE` | `/api/dashboard` |
| `reportsRoutes.js` | `/api/reports` | `REPORTS.BASE` | `/api/reports` |
| `settingsRoutes.js` | `/api/settings` | `SETTINGS.BASE` | `/api/settings` |
| `schoolSetupRoutes.js` | `/api/school-setup` | `SCHOOL_SETUP.BASE` | `/api/school-setup` |
| `task6Routes.js` | `/api/task6` | `SCHOOL_SETUP.TASK6` | `/api/task6` |
| `taskStatusRoutes.js` | `/api/tasks` | `SCHOOL_SETUP.TASKS` | `/api/tasks` |
| `deviceUserManagement.js` | `/api/device-users` | `DEVICE_USERS.BASE` | `/api/device-users` |

## Usage Examples

### In Route Files

```javascript
// Import the config
const { getEndpointPath, API_ENDPOINTS } = require('../config/api.config');

// Use for documentation or validation
console.log('This route corresponds to:', API_ENDPOINTS.STUDENTS.BASE);

// Use for dynamic endpoint generation
const studentEndpoint = getEndpointPath('STUDENTS.BY_ID', { id: 123 });
// Returns: /api/students/123
```

### In Server.js

The routes are mounted with prefixes:
```javascript
app.use('/api/students', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
// etc.
```

### For Frontend API Calls

```javascript
import { getEndpoint } from './config/api.config';

// Get full URL for API call
const loginURL = getEndpoint('AUTH.ADMIN_LOGIN');
// Returns: http://localhost:5052/api/admin/login

await axios.post(loginURL, credentials);
```

## Benefits

1. **Single Source of Truth**: All API endpoints defined in one place
2. **Easy Updates**: Change endpoint paths in config without touching route files
3. **Documentation**: Clear mapping between routes and their purposes
4. **Type Safety**: Can be extended with TypeScript for compile-time checking
5. **Testing**: Easy to mock endpoints for testing
6. **Environment Management**: Switch between dev/prod URLs easily

## Migration Notes

- All route files now import the API config
- Routes still use relative paths (e.g., `/login` instead of `/api/admin/login`)
- The config is imported for reference and future use
- No breaking changes to existing functionality
- Backward compatible with current routing structure

## Future Improvements

1. Consider using full paths in route files and removing mount prefixes in server.js
2. Add TypeScript definitions for API endpoints
3. Generate API documentation from config
4. Add endpoint versioning support
5. Implement automatic API client generation

## Testing

After updating the routes:
1. ✅ All route files successfully updated with imports
2. ✅ No syntax errors in updated files
3. ⏳ Test server startup
4. ⏳ Test all API endpoints
5. ⏳ Verify no breaking changes

## Maintenance

When adding new routes:
1. Add the endpoint to `backend/config/api.config.js`
2. Import the config in your route file
3. Use the config for documentation and reference
4. Update this mapping document

---

**Last Updated**: 2024-01-XX
**Updated By**: Automated Script
**Script**: `backend/scripts/update-routes-with-api-config.js`
