/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Implements fine-grained permission control for different user roles.
 * 
 * Phase 8.7: Role-Based Access Control
 */

const { logPermissionChange, logDataAccess } = require('../utils/logger');

/**
 * Define all permissions in the system
 */
const PERMISSIONS = {
  // Student Management
  STUDENTS_VIEW: 'students:view',
  STUDENTS_CREATE: 'students:create',
  STUDENTS_EDIT: 'students:edit',
  STUDENTS_DELETE: 'students:delete',
  STUDENTS_EXPORT: 'students:export',
  
  // Staff Management
  STAFF_VIEW: 'staff:view',
  STAFF_CREATE: 'staff:create',
  STAFF_EDIT: 'staff:edit',
  STAFF_DELETE: 'staff:delete',
  
  // Attendance
  ATTENDANCE_VIEW: 'attendance:view',
  ATTENDANCE_MARK: 'attendance:mark',
  ATTENDANCE_EDIT: 'attendance:edit',
  ATTENDANCE_EXPORT: 'attendance:export',
  
  // Marks/Grades
  MARKS_VIEW: 'marks:view',
  MARKS_ENTER: 'marks:enter',
  MARKS_EDIT: 'marks:edit',
  MARKS_LOCK: 'marks:lock',
  MARKS_EXPORT: 'marks:export',
  
  // Exams
  EXAMS_VIEW: 'exams:view',
  EXAMS_CREATE: 'exams:create',
  EXAMS_EDIT: 'exams:edit',
  EXAMS_DELETE: 'exams:delete',
  EXAMS_PUBLISH: 'exams:publish',
  EXAMS_GRADE: 'exams:grade',
  
  // Finance
  FINANCE_VIEW: 'finance:view',
  FINANCE_MANAGE: 'finance:manage',
  FINANCE_APPROVE: 'finance:approve',
  FINANCE_EXPORT: 'finance:export',
  
  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_GENERATE: 'reports:generate',
  REPORTS_EXPORT: 'reports:export',
  
  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  SETTINGS_SYSTEM: 'settings:system',
  
  // Users
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_PERMISSIONS: 'users:permissions',
  
  // Communication
  COMMUNICATION_VIEW: 'communication:view',
  COMMUNICATION_SEND: 'communication:send',
  COMMUNICATION_BROADCAST: 'communication:broadcast',
  
  // Schedule
  SCHEDULE_VIEW: 'schedule:view',
  SCHEDULE_EDIT: 'schedule:edit',
  
  // Faults
  FAULTS_VIEW: 'faults:view',
  FAULTS_CREATE: 'faults:create',
  FAULTS_EDIT: 'faults:edit',
  FAULTS_DELETE: 'faults:delete',
};

/**
 * Define role-permission mappings
 */
const ROLE_PERMISSIONS = {
  // Super Admin - Full access
  'super_admin': Object.values(PERMISSIONS),
  
  // Admin - Most permissions except system settings
  'admin': [
    PERMISSIONS.STUDENTS_VIEW,
    PERMISSIONS.STUDENTS_CREATE,
    PERMISSIONS.STUDENTS_EDIT,
    PERMISSIONS.STUDENTS_DELETE,
    PERMISSIONS.STUDENTS_EXPORT,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_EDIT,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.ATTENDANCE_EDIT,
    PERMISSIONS.ATTENDANCE_EXPORT,
    PERMISSIONS.MARKS_VIEW,
    PERMISSIONS.MARKS_ENTER,
    PERMISSIONS.MARKS_EDIT,
    PERMISSIONS.MARKS_LOCK,
    PERMISSIONS.MARKS_EXPORT,
    PERMISSIONS.EXAMS_VIEW,
    PERMISSIONS.EXAMS_CREATE,
    PERMISSIONS.EXAMS_EDIT,
    PERMISSIONS.EXAMS_DELETE,
    PERMISSIONS.EXAMS_PUBLISH,
    PERMISSIONS.EXAMS_GRADE,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.FINANCE_APPROVE,
    PERMISSIONS.FINANCE_EXPORT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.COMMUNICATION_VIEW,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.COMMUNICATION_BROADCAST,
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.SCHEDULE_EDIT,
    PERMISSIONS.FAULTS_VIEW,
    PERMISSIONS.FAULTS_CREATE,
    PERMISSIONS.FAULTS_EDIT,
    PERMISSIONS.FAULTS_DELETE,
  ],
  
  // Teacher - Academic permissions
  'teacher': [
    PERMISSIONS.STUDENTS_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.MARKS_VIEW,
    PERMISSIONS.MARKS_ENTER,
    PERMISSIONS.MARKS_EDIT,
    PERMISSIONS.EXAMS_VIEW,
    PERMISSIONS.EXAMS_CREATE,
    PERMISSIONS.EXAMS_EDIT,
    PERMISSIONS.EXAMS_PUBLISH,
    PERMISSIONS.EXAMS_GRADE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.COMMUNICATION_VIEW,
    PERMISSIONS.COMMUNICATION_SEND,
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.FAULTS_VIEW,
    PERMISSIONS.FAULTS_CREATE,
  ],
  
  // Administrative Staff - Finance and admin tasks
  'administrative': [
    PERMISSIONS.STUDENTS_VIEW,
    PERMISSIONS.STUDENTS_CREATE,
    PERMISSIONS.STUDENTS_EDIT,
    PERMISSIONS.STUDENTS_EXPORT,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.COMMUNICATION_VIEW,
    PERMISSIONS.COMMUNICATION_SEND,
  ],
  
  // Supportive Staff - Limited access
  'supportive': [
    PERMISSIONS.STUDENTS_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.COMMUNICATION_VIEW,
  ],
  
  // Student - View only
  'student': [
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.MARKS_VIEW,
    PERMISSIONS.EXAMS_VIEW,
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.COMMUNICATION_VIEW,
  ],
  
  // Guardian - View child's data
  'guardian': [
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.MARKS_VIEW,
    PERMISSIONS.EXAMS_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.COMMUNICATION_VIEW,
    PERMISSIONS.COMMUNICATION_SEND,
  ],
};

/**
 * Check if user has permission
 * @param {object} user - User object with role
 * @param {string} permission - Permission to check
 * @returns {boolean} - True if user has permission
 */
function hasPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}

/**
 * Check if user has any of the permissions
 * @param {object} user - User object with role
 * @param {array} permissions - Array of permissions
 * @returns {boolean} - True if user has any permission
 */
function hasAnyPermission(user, permissions) {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all permissions
 * @param {object} user - User object with role
 * @param {array} permissions - Array of permissions
 * @returns {boolean} - True if user has all permissions
 */
function hasAllPermissions(user, permissions) {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Middleware to check if user has required permission
 * @param {string|array} requiredPermissions - Permission(s) required
 * @returns {function} - Express middleware
 */
function authorize(requiredPermissions) {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
    
    // Convert single permission to array
    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];
    
    // Check if user has any of the required permissions
    const hasAccess = hasAnyPermission(user, permissions);
    
    if (!hasAccess) {
      // Log unauthorized access attempt
      logDataAccess(
        user.username || user.id,
        req.path,
        req.method,
        req.ip,
        false
      );
      
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        requiredPermissions: permissions,
      });
    }
    
    // Log successful access
    logDataAccess(
      user.username || user.id,
      req.path,
      req.method,
      req.ip,
      true
    );
    
    next();
  };
}

/**
 * Middleware to check if user has all required permissions
 * @param {array} requiredPermissions - Permissions required
 * @returns {function} - Express middleware
 */
function authorizeAll(requiredPermissions) {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
    
    const hasAccess = hasAllPermissions(user, requiredPermissions);
    
    if (!hasAccess) {
      logDataAccess(
        user.username || user.id,
        req.path,
        req.method,
        req.ip,
        false
      );
      
      return res.status(403).json({
        success: false,
        message: 'You do not have all required permissions',
        requiredPermissions,
      });
    }
    
    logDataAccess(
      user.username || user.id,
      req.path,
      req.method,
      req.ip,
      true
    );
    
    next();
  };
}

/**
 * Get user permissions
 * @param {object} user - User object with role
 * @returns {array} - Array of permissions
 */
function getUserPermissions(user) {
  if (!user || !user.role) {
    return [];
  }
  
  return ROLE_PERMISSIONS[user.role] || [];
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  authorize,
  authorizeAll,
  getUserPermissions,
};
