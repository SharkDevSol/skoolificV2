/**
 * RBAC (Role-Based Access Control) Middleware Unit Tests
 * 
 * Comprehensive test suite for RBAC middleware.
 * Tests cover:
 * - Permission checking
 * - Role-permission mappings
 * - Authorization middleware
 * - Multiple permission checks
 * - User permission retrieval
 * - Error handling
 * 
 * Target: 80%+ code coverage
 */

// Mock logger
jest.mock('../../utils/logger', () => ({
  logPermissionChange: jest.fn(),
  logDataAccess: jest.fn()
}));

const {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  authorize,
  authorizeAll,
  getUserPermissions
} = require('../rbac');

const { logDataAccess } = require('../../utils/logger');

describe('RBAC Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null,
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST SUITE 1: Permission Constants
  // ============================================================================
  describe('1. Permission Constants', () => {
    test('1.1 Should have all required permission categories', () => {
      expect(PERMISSIONS.STUDENTS_VIEW).toBeDefined();
      expect(PERMISSIONS.STAFF_VIEW).toBeDefined();
      expect(PERMISSIONS.ATTENDANCE_VIEW).toBeDefined();
      expect(PERMISSIONS.MARKS_VIEW).toBeDefined();
      expect(PERMISSIONS.EXAMS_VIEW).toBeDefined();
      expect(PERMISSIONS.FINANCE_VIEW).toBeDefined();
      expect(PERMISSIONS.REPORTS_VIEW).toBeDefined();
      expect(PERMISSIONS.SETTINGS_VIEW).toBeDefined();
      expect(PERMISSIONS.USERS_VIEW).toBeDefined();
      expect(PERMISSIONS.COMMUNICATION_VIEW).toBeDefined();
    });

    test('1.2 Should have CRUD permissions for students', () => {
      expect(PERMISSIONS.STUDENTS_VIEW).toBe('students:view');
      expect(PERMISSIONS.STUDENTS_CREATE).toBe('students:create');
      expect(PERMISSIONS.STUDENTS_EDIT).toBe('students:edit');
      expect(PERMISSIONS.STUDENTS_DELETE).toBe('students:delete');
    });

    test('1.3 Should have exam-related permissions', () => {
      expect(PERMISSIONS.EXAMS_CREATE).toBe('exams:create');
      expect(PERMISSIONS.EXAMS_PUBLISH).toBe('exams:publish');
      expect(PERMISSIONS.EXAMS_GRADE).toBe('exams:grade');
    });
  });

  // ============================================================================
  // TEST SUITE 2: Role-Permission Mappings
  // ============================================================================
  describe('2. Role-Permission Mappings', () => {
    test('2.1 Super admin should have all permissions', () => {
      const superAdminPerms = ROLE_PERMISSIONS.super_admin;
      const allPermissions = Object.values(PERMISSIONS);

      expect(superAdminPerms).toEqual(allPermissions);
    });

    test('2.2 Admin should have most permissions', () => {
      const adminPerms = ROLE_PERMISSIONS.admin;

      expect(adminPerms).toContain(PERMISSIONS.STUDENTS_VIEW);
      expect(adminPerms).toContain(PERMISSIONS.STUDENTS_CREATE);
      expect(adminPerms).toContain(PERMISSIONS.STAFF_VIEW);
      expect(adminPerms).toContain(PERMISSIONS.FINANCE_MANAGE);
      expect(adminPerms).toContain(PERMISSIONS.EXAMS_CREATE);
    });

    test('2.3 Teacher should have academic permissions', () => {
      const teacherPerms = ROLE_PERMISSIONS.teacher;

      expect(teacherPerms).toContain(PERMISSIONS.STUDENTS_VIEW);
      expect(teacherPerms).toContain(PERMISSIONS.ATTENDANCE_MARK);
      expect(teacherPerms).toContain(PERMISSIONS.MARKS_ENTER);
      expect(teacherPerms).toContain(PERMISSIONS.EXAMS_CREATE);
      expect(teacherPerms).not.toContain(PERMISSIONS.STUDENTS_DELETE);
      expect(teacherPerms).not.toContain(PERMISSIONS.FINANCE_MANAGE);
    });

    test('2.4 Student should have view-only permissions', () => {
      const studentPerms = ROLE_PERMISSIONS.student;

      expect(studentPerms).toContain(PERMISSIONS.ATTENDANCE_VIEW);
      expect(studentPerms).toContain(PERMISSIONS.MARKS_VIEW);
      expect(studentPerms).toContain(PERMISSIONS.EXAMS_VIEW);
      expect(studentPerms).not.toContain(PERMISSIONS.STUDENTS_CREATE);
      expect(studentPerms).not.toContain(PERMISSIONS.MARKS_ENTER);
    });

    test('2.5 Guardian should have limited view permissions', () => {
      const guardianPerms = ROLE_PERMISSIONS.guardian;

      expect(guardianPerms).toContain(PERMISSIONS.ATTENDANCE_VIEW);
      expect(guardianPerms).toContain(PERMISSIONS.MARKS_VIEW);
      expect(guardianPerms).toContain(PERMISSIONS.FINANCE_VIEW);
      expect(guardianPerms).not.toContain(PERMISSIONS.STUDENTS_EDIT);
    });

    test('2.6 Administrative staff should have finance permissions', () => {
      const adminStaffPerms = ROLE_PERMISSIONS.administrative;

      expect(adminStaffPerms).toContain(PERMISSIONS.FINANCE_VIEW);
      expect(adminStaffPerms).toContain(PERMISSIONS.FINANCE_MANAGE);
      expect(adminStaffPerms).toContain(PERMISSIONS.STUDENTS_CREATE);
    });

    test('2.7 Supportive staff should have minimal permissions', () => {
      const supportivePerms = ROLE_PERMISSIONS.supportive;

      expect(supportivePerms).toContain(PERMISSIONS.STUDENTS_VIEW);
      expect(supportivePerms).toContain(PERMISSIONS.ATTENDANCE_VIEW);
      expect(supportivePerms).not.toContain(PERMISSIONS.STUDENTS_CREATE);
      expect(supportivePerms).not.toContain(PERMISSIONS.FINANCE_VIEW);
    });
  });

  // ============================================================================
  // TEST SUITE 3: hasPermission Function
  // ============================================================================
  describe('3. hasPermission Function', () => {
    test('3.1 Should return true when user has permission', () => {
      const user = { role: 'admin' };
      const result = hasPermission(user, PERMISSIONS.STUDENTS_VIEW);

      expect(result).toBe(true);
    });

    test('3.2 Should return false when user lacks permission', () => {
      const user = { role: 'student' };
      const result = hasPermission(user, PERMISSIONS.STUDENTS_CREATE);

      expect(result).toBe(false);
    });

    test('3.3 Should return false when user is null', () => {
      const result = hasPermission(null, PERMISSIONS.STUDENTS_VIEW);

      expect(result).toBe(false);
    });

    test('3.4 Should return false when user has no role', () => {
      const user = { id: 1, username: 'test' };
      const result = hasPermission(user, PERMISSIONS.STUDENTS_VIEW);

      expect(result).toBe(false);
    });

    test('3.5 Should return false for unknown role', () => {
      const user = { role: 'unknown_role' };
      const result = hasPermission(user, PERMISSIONS.STUDENTS_VIEW);

      expect(result).toBe(false);
    });

    test('3.6 Should handle super_admin role', () => {
      const user = { role: 'super_admin' };
      const result = hasPermission(user, PERMISSIONS.SETTINGS_SYSTEM);

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // TEST SUITE 4: hasAnyPermission Function
  // ============================================================================
  describe('4. hasAnyPermission Function', () => {
    test('4.1 Should return true if user has any of the permissions', () => {
      const user = { role: 'teacher' };
      const permissions = [
        PERMISSIONS.STUDENTS_DELETE,  // Teacher doesn't have
        PERMISSIONS.MARKS_ENTER,      // Teacher has
        PERMISSIONS.FINANCE_MANAGE    // Teacher doesn't have
      ];

      const result = hasAnyPermission(user, permissions);

      expect(result).toBe(true);
    });

    test('4.2 Should return false if user has none of the permissions', () => {
      const user = { role: 'student' };
      const permissions = [
        PERMISSIONS.STUDENTS_CREATE,
        PERMISSIONS.MARKS_ENTER,
        PERMISSIONS.FINANCE_MANAGE
      ];

      const result = hasAnyPermission(user, permissions);

      expect(result).toBe(false);
    });

    test('4.3 Should return true if user has all permissions', () => {
      const user = { role: 'admin' };
      const permissions = [
        PERMISSIONS.STUDENTS_VIEW,
        PERMISSIONS.STUDENTS_CREATE,
        PERMISSIONS.STUDENTS_EDIT
      ];

      const result = hasAnyPermission(user, permissions);

      expect(result).toBe(true);
    });

    test('4.4 Should handle empty permissions array', () => {
      const user = { role: 'admin' };
      const result = hasAnyPermission(user, []);

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // TEST SUITE 5: hasAllPermissions Function
  // ============================================================================
  describe('5. hasAllPermissions Function', () => {
    test('5.1 Should return true if user has all permissions', () => {
      const user = { role: 'admin' };
      const permissions = [
        PERMISSIONS.STUDENTS_VIEW,
        PERMISSIONS.STUDENTS_CREATE,
        PERMISSIONS.STUDENTS_EDIT
      ];

      const result = hasAllPermissions(user, permissions);

      expect(result).toBe(true);
    });

    test('5.2 Should return false if user lacks any permission', () => {
      const user = { role: 'teacher' };
      const permissions = [
        PERMISSIONS.STUDENTS_VIEW,    // Teacher has
        PERMISSIONS.STUDENTS_DELETE   // Teacher doesn't have
      ];

      const result = hasAllPermissions(user, permissions);

      expect(result).toBe(false);
    });

    test('5.3 Should return true for empty permissions array', () => {
      const user = { role: 'student' };
      const result = hasAllPermissions(user, []);

      expect(result).toBe(true);
    });

    test('5.4 Should return true for super_admin with any permissions', () => {
      const user = { role: 'super_admin' };
      const permissions = [
        PERMISSIONS.STUDENTS_DELETE,
        PERMISSIONS.FINANCE_MANAGE,
        PERMISSIONS.SETTINGS_SYSTEM
      ];

      const result = hasAllPermissions(user, permissions);

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // TEST SUITE 6: authorize Middleware
  // ============================================================================
  describe('6. authorize Middleware', () => {
    test('6.1 Should allow access when user has required permission', () => {
      req.user = { id: 1, username: 'admin', role: 'admin' };

      const middleware = authorize(PERMISSIONS.STUDENTS_VIEW);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(logDataAccess).toHaveBeenCalledWith('admin', '/api/test', 'GET', '127.0.0.1', true);
    });

    test('6.2 Should allow access when user has any of multiple permissions', () => {
      req.user = { id: 1, username: 'teacher', role: 'teacher' };

      const middleware = authorize([
        PERMISSIONS.STUDENTS_DELETE,  // Teacher doesn't have
        PERMISSIONS.MARKS_ENTER       // Teacher has
      ]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('6.3 Should deny access when user lacks permission', () => {
      req.user = { id: 1, username: 'student', role: 'student' };

      const middleware = authorize(PERMISSIONS.STUDENTS_CREATE);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to perform this action',
        requiredPermissions: [PERMISSIONS.STUDENTS_CREATE]
      });
      expect(next).not.toHaveBeenCalled();
      expect(logDataAccess).toHaveBeenCalledWith('student', '/api/test', 'GET', '127.0.0.1', false);
    });

    test('6.4 Should return 401 when no user', () => {
      req.user = null;

      const middleware = authorize(PERMISSIONS.STUDENTS_VIEW);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('6.5 Should handle single permission string', () => {
      req.user = { id: 1, username: 'admin', role: 'admin' };

      const middleware = authorize(PERMISSIONS.STUDENTS_VIEW);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('6.6 Should handle array of permissions', () => {
      req.user = { id: 1, username: 'admin', role: 'admin' };

      const middleware = authorize([PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.STAFF_VIEW]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TEST SUITE 7: authorizeAll Middleware
  // ============================================================================
  describe('7. authorizeAll Middleware', () => {
    test('7.1 Should allow access when user has all required permissions', () => {
      req.user = { id: 1, username: 'admin', role: 'admin' };

      const middleware = authorizeAll([
        PERMISSIONS.STUDENTS_VIEW,
        PERMISSIONS.STUDENTS_CREATE,
        PERMISSIONS.STUDENTS_EDIT
      ]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(logDataAccess).toHaveBeenCalledWith('admin', '/api/test', 'GET', '127.0.0.1', true);
    });

    test('7.2 Should deny access when user lacks any permission', () => {
      req.user = { id: 1, username: 'teacher', role: 'teacher' };

      const middleware = authorizeAll([
        PERMISSIONS.STUDENTS_VIEW,    // Teacher has
        PERMISSIONS.STUDENTS_DELETE   // Teacher doesn't have
      ]);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have all required permissions',
        requiredPermissions: [PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.STUDENTS_DELETE]
      });
      expect(next).not.toHaveBeenCalled();
      expect(logDataAccess).toHaveBeenCalledWith('teacher', '/api/test', 'GET', '127.0.0.1', false);
    });

    test('7.3 Should return 401 when no user', () => {
      req.user = null;

      const middleware = authorizeAll([PERMISSIONS.STUDENTS_VIEW]);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });

    test('7.4 Should allow super_admin with any permissions', () => {
      req.user = { id: 1, username: 'superadmin', role: 'super_admin' };

      const middleware = authorizeAll([
        PERMISSIONS.STUDENTS_DELETE,
        PERMISSIONS.FINANCE_MANAGE,
        PERMISSIONS.SETTINGS_SYSTEM
      ]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TEST SUITE 8: getUserPermissions Function
  // ============================================================================
  describe('8. getUserPermissions Function', () => {
    test('8.1 Should return permissions for valid user', () => {
      const user = { role: 'teacher' };
      const permissions = getUserPermissions(user);

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toContain(PERMISSIONS.STUDENTS_VIEW);
      expect(permissions).toContain(PERMISSIONS.MARKS_ENTER);
    });

    test('8.2 Should return empty array for null user', () => {
      const permissions = getUserPermissions(null);

      expect(permissions).toEqual([]);
    });

    test('8.3 Should return empty array for user without role', () => {
      const user = { id: 1, username: 'test' };
      const permissions = getUserPermissions(user);

      expect(permissions).toEqual([]);
    });

    test('8.4 Should return empty array for unknown role', () => {
      const user = { role: 'unknown_role' };
      const permissions = getUserPermissions(user);

      expect(permissions).toEqual([]);
    });

    test('8.5 Should return all permissions for super_admin', () => {
      const user = { role: 'super_admin' };
      const permissions = getUserPermissions(user);

      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain(PERMISSIONS.SETTINGS_SYSTEM);
    });
  });

  // ============================================================================
  // TEST SUITE 9: Edge Cases
  // ============================================================================
  describe('9. Edge Cases', () => {
    test('9.1 Should handle user with id but no username', () => {
      req.user = { id: 123, role: 'admin' };

      const middleware = authorize(PERMISSIONS.STUDENTS_VIEW);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(logDataAccess).toHaveBeenCalledWith(123, '/api/test', 'GET', '127.0.0.1', true);
    });

    test('9.2 Should handle undefined permissions', () => {
      const user = { role: 'admin' };
      const result = hasPermission(user, undefined);

      expect(result).toBe(false);
    });

    test('9.3 Should handle null permissions array', () => {
      const user = { role: 'admin' };
      const result = hasAnyPermission(user, null);

      expect(result).toBe(false);
    });

    test('9.4 Should handle case-sensitive role names', () => {
      const user = { role: 'Admin' }; // Wrong case
      const result = hasPermission(user, PERMISSIONS.STUDENTS_VIEW);

      expect(result).toBe(false);
    });

    test('9.5 Should handle empty string role', () => {
      const user = { role: '' };
      const result = hasPermission(user, PERMISSIONS.STUDENTS_VIEW);

      expect(result).toBe(false);
    });

    test('9.6 Should handle numeric role', () => {
      const user = { role: 123 };
      const result = hasPermission(user, PERMISSIONS.STUDENTS_VIEW);

      expect(result).toBe(false);
    });
  });
});
