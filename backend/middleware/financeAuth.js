const { authenticateToken } = require('./auth');

/**
 * Finance Module Permission Constants
 * Defines all permissions for financial operations
 */
const FINANCE_PERMISSIONS = {
  // Chart of Accounts
  ACCOUNTS_VIEW: 'accounts:view',
  ACCOUNTS_CREATE: 'accounts:create',
  ACCOUNTS_UPDATE: 'accounts:update',
  ACCOUNTS_DELETE: 'accounts:delete',

  // Fee Management
  FEE_STRUCTURES_VIEW: 'fee_structures:view',
  FEE_STRUCTURES_CREATE: 'fee_structures:create',
  FEE_STRUCTURES_UPDATE: 'fee_structures:update',
  FEE_STRUCTURES_DELETE: 'fee_structures:delete',
  FEE_STRUCTURES_MANAGE: 'fee_structures:manage',
  DISCOUNTS_VIEW: 'discounts:view',
  DISCOUNTS_MANAGE: 'discounts:manage',
  SCHOLARSHIPS_VIEW: 'scholarships:view',
  SCHOLARSHIPS_MANAGE: 'scholarships:manage',
  LATE_FEES_MANAGE: 'late_fees:manage',

  // Billing
  INVOICES_VIEW: 'invoices:view',
  INVOICES_CREATE: 'invoices:create',
  INVOICES_UPDATE: 'invoices:update',
  INVOICES_ADJUST: 'invoices:adjust',
  INVOICES_REVERSE: 'invoices:reverse',
  INVOICES_GENERATE_BULK: 'invoices:generate_bulk',

  // Payments
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_RECORD: 'payments:record',
  PAYMENTS_RECONCILE: 'payments:reconcile',
  REFUNDS_VIEW: 'refunds:view',
  REFUNDS_REQUEST: 'refunds:request',
  REFUNDS_APPROVE: 'refunds:approve',

  // Expenses
  EXPENSES_VIEW: 'expenses:view',
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_UPDATE: 'expenses:update',
  EXPENSES_SUBMIT: 'expenses:submit',
  EXPENSES_APPROVE: 'expenses:approve',
  VENDORS_MANAGE: 'vendors:manage',

  // Budget
  BUDGETS_VIEW: 'budgets:view',
  BUDGETS_CREATE: 'budgets:create',
  BUDGETS_UPDATE: 'budgets:update',
  BUDGETS_APPROVE: 'budgets:approve',

  // Payroll
  PAYROLL_VIEW: 'payroll:view',
  PAYROLL_CREATE: 'payroll:create',
  PAYROLL_UPDATE: 'payroll:update',
  PAYROLL_APPROVE: 'payroll:approve',
  SALARY_STRUCTURES_MANAGE: 'salary_structures:manage',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  REPORTS_FINANCIAL_STATEMENTS: 'reports:financial_statements',

  // Audit
  AUDIT_LOGS_VIEW: 'audit_logs:view',
  AUDIT_LOGS_EXPORT: 'audit_logs:export',

  // Approvals
  APPROVALS_VIEW: 'approvals:view',
  APPROVALS_PROCESS: 'approvals:process',
  WORKFLOWS_MANAGE: 'workflows:manage',
};

/**
 * Role-Permission Mapping
 * Defines which permissions each role has
 */
const ROLE_PERMISSIONS = {
  FINANCE_OFFICER: [
    // Full access to most financial operations
    FINANCE_PERMISSIONS.ACCOUNTS_VIEW,
    FINANCE_PERMISSIONS.ACCOUNTS_CREATE,
    FINANCE_PERMISSIONS.ACCOUNTS_UPDATE,
    FINANCE_PERMISSIONS.ACCOUNTS_DELETE,
    FINANCE_PERMISSIONS.FEE_STRUCTURES_VIEW,
    FINANCE_PERMISSIONS.FEE_STRUCTURES_CREATE,
    FINANCE_PERMISSIONS.FEE_STRUCTURES_UPDATE,
    FINANCE_PERMISSIONS.FEE_STRUCTURES_MANAGE,
    FINANCE_PERMISSIONS.DISCOUNTS_VIEW,
    FINANCE_PERMISSIONS.DISCOUNTS_MANAGE,
    FINANCE_PERMISSIONS.SCHOLARSHIPS_VIEW,
    FINANCE_PERMISSIONS.SCHOLARSHIPS_MANAGE,
    FINANCE_PERMISSIONS.LATE_FEES_MANAGE,
    FINANCE_PERMISSIONS.INVOICES_VIEW,
    FINANCE_PERMISSIONS.INVOICES_CREATE,
    FINANCE_PERMISSIONS.INVOICES_UPDATE,
    FINANCE_PERMISSIONS.INVOICES_ADJUST,
    FINANCE_PERMISSIONS.INVOICES_GENERATE_BULK,
    FINANCE_PERMISSIONS.PAYMENTS_VIEW,
    FINANCE_PERMISSIONS.PAYMENTS_CREATE,
    FINANCE_PERMISSIONS.PAYMENTS_RECORD,
    FINANCE_PERMISSIONS.PAYMENTS_RECONCILE,
    FINANCE_PERMISSIONS.REFUNDS_VIEW,
    FINANCE_PERMISSIONS.REFUNDS_REQUEST,
    FINANCE_PERMISSIONS.EXPENSES_VIEW,
    FINANCE_PERMISSIONS.EXPENSES_CREATE,
    FINANCE_PERMISSIONS.EXPENSES_UPDATE,
    FINANCE_PERMISSIONS.EXPENSES_SUBMIT,
    FINANCE_PERMISSIONS.VENDORS_MANAGE,
    FINANCE_PERMISSIONS.BUDGETS_VIEW,
    FINANCE_PERMISSIONS.BUDGETS_CREATE,
    FINANCE_PERMISSIONS.BUDGETS_UPDATE,
    FINANCE_PERMISSIONS.PAYROLL_VIEW,
    FINANCE_PERMISSIONS.PAYROLL_CREATE,
    FINANCE_PERMISSIONS.PAYROLL_UPDATE,
    FINANCE_PERMISSIONS.SALARY_STRUCTURES_MANAGE,
    FINANCE_PERMISSIONS.REPORTS_VIEW,
    FINANCE_PERMISSIONS.REPORTS_EXPORT,
    FINANCE_PERMISSIONS.REPORTS_FINANCIAL_STATEMENTS,
    FINANCE_PERMISSIONS.APPROVALS_VIEW,
    FINANCE_PERMISSIONS.APPROVALS_PROCESS,
  ],

  SCHOOL_ADMINISTRATOR: [
    // Oversight and approval permissions
    FINANCE_PERMISSIONS.ACCOUNTS_VIEW,
    FINANCE_PERMISSIONS.FEE_STRUCTURES_VIEW,
    FINANCE_PERMISSIONS.FEE_STRUCTURES_CREATE,
    FINANCE_PERMISSIONS.FEE_STRUCTURES_UPDATE,
    FINANCE_PERMISSIONS.FEE_STRUCTURES_DELETE,
    FINANCE_PERMISSIONS.DISCOUNTS_VIEW,
    FINANCE_PERMISSIONS.SCHOLARSHIPS_VIEW,
    FINANCE_PERMISSIONS.LATE_FEES_MANAGE,
    FINANCE_PERMISSIONS.INVOICES_VIEW,
    FINANCE_PERMISSIONS.INVOICES_CREATE,
    FINANCE_PERMISSIONS.INVOICES_REVERSE,
    FINANCE_PERMISSIONS.PAYMENTS_VIEW,
    FINANCE_PERMISSIONS.PAYMENTS_CREATE,
    FINANCE_PERMISSIONS.REFUNDS_VIEW,
    FINANCE_PERMISSIONS.REFUNDS_APPROVE,
    FINANCE_PERMISSIONS.EXPENSES_VIEW,
    FINANCE_PERMISSIONS.EXPENSES_APPROVE,
    FINANCE_PERMISSIONS.BUDGETS_VIEW,
    FINANCE_PERMISSIONS.BUDGETS_APPROVE,
    FINANCE_PERMISSIONS.PAYROLL_VIEW,
    FINANCE_PERMISSIONS.PAYROLL_APPROVE,
    FINANCE_PERMISSIONS.REPORTS_VIEW,
    FINANCE_PERMISSIONS.REPORTS_EXPORT,
    FINANCE_PERMISSIONS.REPORTS_FINANCIAL_STATEMENTS,
    FINANCE_PERMISSIONS.AUDIT_LOGS_VIEW,
    FINANCE_PERMISSIONS.AUDIT_LOGS_EXPORT,
    FINANCE_PERMISSIONS.APPROVALS_VIEW,
    FINANCE_PERMISSIONS.APPROVALS_PROCESS,
    FINANCE_PERMISSIONS.WORKFLOWS_MANAGE,
  ],

  AUDITOR: [
    // Read-only access to all financial records
    FINANCE_PERMISSIONS.ACCOUNTS_VIEW,
    FINANCE_PERMISSIONS.FEE_STRUCTURES_VIEW,
    FINANCE_PERMISSIONS.DISCOUNTS_VIEW,
    FINANCE_PERMISSIONS.SCHOLARSHIPS_VIEW,
    FINANCE_PERMISSIONS.INVOICES_VIEW,
    FINANCE_PERMISSIONS.PAYMENTS_VIEW,
    FINANCE_PERMISSIONS.REFUNDS_VIEW,
    FINANCE_PERMISSIONS.EXPENSES_VIEW,
    FINANCE_PERMISSIONS.BUDGETS_VIEW,
    FINANCE_PERMISSIONS.PAYROLL_VIEW,
    FINANCE_PERMISSIONS.REPORTS_VIEW,
    FINANCE_PERMISSIONS.REPORTS_EXPORT,
    FINANCE_PERMISSIONS.REPORTS_FINANCIAL_STATEMENTS,
    FINANCE_PERMISSIONS.AUDIT_LOGS_VIEW,
    FINANCE_PERMISSIONS.AUDIT_LOGS_EXPORT,
    FINANCE_PERMISSIONS.APPROVALS_VIEW,
  ],

  // Map existing roles to finance roles
  director: 'SCHOOL_ADMINISTRATOR',
  admin: 'SCHOOL_ADMINISTRATOR',
  'sub-account': 'SCHOOL_ADMINISTRATOR', // Sub-accounts get admin access
  super_admin: 'SCHOOL_ADMINISTRATOR', // Super admin gets full access
  teacher: null, // No finance access by default
  guardian: null, // No finance access by default
  staff: null, // No finance access by default
  student: null, // No finance access by default
};

/**
 * Check if a user has a specific permission
 * @param {Object} user - User object with role property
 * @param {string} permission - Permission to check
 * @returns {boolean} - True if user has permission
 */
function hasPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }

  // Super Admin has all permissions
  if (user.isSuperAdmin || user.role === 'super_admin') {
    return true;
  }

  // Support staff users - check userType and staffType
  let userRole = user.role;
  
  // If user is from staff_users table
  if (user.userType === 'staff' && user.staffType) {
    // Map staff types to finance roles
    const staffTypeMapping = {
      'director': 'director',
      'admin': 'admin',
      'vice_director': 'admin',
      'accountant': 'director', // Give accountants full finance access
      'finance_officer': 'director', // Give finance officers full access
      'teachers': 'teacher', // Map Teachers to teacher role
      'teacher': 'teacher',
      'staff': 'staff'
    };
    
    userRole = staffTypeMapping[user.staffType.toLowerCase()] || user.staffType.toLowerCase();
  }

  // Check if role exists in ROLE_PERMISSIONS (own property only, not inherited)
  if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, userRole)) {
    return false;
  }

  // Map existing role to finance role if needed
  let financeRole = userRole;
  if (ROLE_PERMISSIONS[userRole] === null) {
    return false;
  }
  if (typeof ROLE_PERMISSIONS[userRole] === 'string') {
    financeRole = ROLE_PERMISSIONS[userRole];
  }

  // Check if financeRole exists in ROLE_PERMISSIONS (own property only)
  if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, financeRole)) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[financeRole];
  if (!permissions || !Array.isArray(permissions)) {
    return false;
  }

  return permissions.includes(permission);
}

/**
 * Middleware to check if user has required permission
 * @param {string} permission - Required permission
 * @returns {Function} - Express middleware function
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
      });
    }

    // ⚠️ TEMPORARY DEV MODE: Allow all authenticated users
    // TODO: Remove this before production!
    console.log(`\n⚠️  DEV MODE: Bypassing permission check for ${req.user.username || req.user.id}`);
    console.log(`User: ${req.user.username}, Role: ${req.user.role}, UserType: ${req.user.userType}, StaffType: ${req.user.staffType}`);
    console.log(`Permission requested: ${permission}`);
    console.log(`✅ Access granted (DEV MODE)\n`);
    return next();

    // Original permission check (commented out for dev)
    /*
    if (!hasPermission(req.user, permission)) {
      // Log access denial for audit with more details
      console.log(`\n❌ ACCESS DENIED ❌`);
      console.log(`User ID: ${req.user.id}`);
      console.log(`Username: ${req.user.username || 'N/A'}`);
      console.log(`Role: ${req.user.role}`);
      console.log(`UserType: ${req.user.userType || 'N/A'}`);
      console.log(`StaffType: ${req.user.staffType || 'N/A'}`);
      console.log(`Attempted Permission: ${permission}`);
      console.log(`Full User Object:`, JSON.stringify(req.user, null, 2));
      console.log(`\n`);
      
      return res.status(403).json({
        error: 'AUTHORIZATION_ERROR',
        message: 'Insufficient permissions',
        details: {
          requiredPermission: permission,
          userRole: req.user.role,
          userType: req.user.userType,
          staffType: req.user.staffType,
          hint: 'Please ensure you are logged in as an admin or have the required finance permissions. Current user does not have access.'
        },
      });
    }

    next();
    */
  };
}

/**
 * Middleware to check if user has any of the required permissions
 * @param {...string} permissions - Required permissions (any)
 * @returns {Function} - Express middleware function
 */
function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
      });
    }

    const hasAnyPermission = permissions.some(permission => 
      hasPermission(req.user, permission)
    );

    if (!hasAnyPermission) {
      console.log(`Access denied: User ${req.user.id} (${req.user.role}) attempted one of [${permissions.join(', ')}]`);
      
      return res.status(403).json({
        error: 'AUTHORIZATION_ERROR',
        message: 'Insufficient permissions',
        details: {
          requiredPermissions: permissions,
          userRole: req.user.role,
        },
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has all required permissions
 * @param {...string} permissions - Required permissions (all)
 * @returns {Function} - Express middleware function
 */
function requireAllPermissions(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
      });
    }

    const hasAllPermissions = permissions.every(permission => 
      hasPermission(req.user, permission)
    );

    if (!hasAllPermissions) {
      console.log(`Access denied: User ${req.user.id} (${req.user.role}) attempted all of [${permissions.join(', ')}]`);
      
      return res.status(403).json({
        error: 'AUTHORIZATION_ERROR',
        message: 'Insufficient permissions',
        details: {
          requiredPermissions: permissions,
          userRole: req.user.role,
        },
      });
    }

    next();
  };
}

/**
 * Combined authentication and permission check middleware
 * @param {string} permission - Required permission
 * @returns {Function} - Express middleware function
 */
function authenticateAndAuthorize(permission) {
  return [authenticateToken, requirePermission(permission)];
}

module.exports = {
  FINANCE_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  authenticateAndAuthorize,
};
