/**
 * Property-Based Tests for Finance Module Authentication and Authorization
 * Using fast-check for property-based testing
 * 
 * **Feature: finance-management-module**
 */

const fc = require('fast-check');
const {
  FINANCE_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
} = require('../middleware/financeAuth');

// ============================================================================
// Test Data Generators
// ============================================================================

// Role generator
const roleArb = fc.constantFrom(
  'FINANCE_OFFICER',
  'SCHOOL_ADMINISTRATOR',
  'AUDITOR',
  'director',
  'teacher',
  'guardian'
);

// Permission generator - all finance permissions
const permissionArb = fc.constantFrom(...Object.values(FINANCE_PERMISSIONS));

// User generator
const userArb = fc.record({
  id: fc.uuid(),
  role: roleArb,
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
});

// Protected function generator
const protectedFunctionArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  requiredPermission: permissionArb,
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all permissions for a role
 */
function getRolePermissions(role) {
  // Map existing roles to finance roles
  let financeRole = role;
  if (ROLE_PERMISSIONS[role] === null) {
    return [];
  }
  if (typeof ROLE_PERMISSIONS[role] === 'string') {
    financeRole = ROLE_PERMISSIONS[role];
  }

  return ROLE_PERMISSIONS[financeRole] || [];
}

/**
 * Check if a role should have access to a permission
 */
function shouldHaveAccess(role, permission) {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Finance Module - Property Tests', () => {
  
  /**
   * **Feature: finance-management-module, Property 42: Role-Based Access Control Enforcement**
   * **Validates: Requirements 16.5**
   * 
   * For any user and protected function, access should be granted if and only if
   * the user's role has permission for that function.
   */
  describe('Property 42: Role-Based Access Control Enforcement', () => {
    
    it('should grant access if and only if user role has required permission', () => {
      fc.assert(
        fc.property(userArb, permissionArb, (user, permission) => {
          const hasAccess = hasPermission(user, permission);
          const shouldHaveAccessResult = shouldHaveAccess(user.role, permission);
          
          // Access should match expected permission
          expect(hasAccess).toBe(shouldHaveAccessResult);
        }),
        { numRuns: 100 }
      );
    });

    it('should deny access for users without role', () => {
      fc.assert(
        fc.property(permissionArb, (permission) => {
          const userWithoutRole = { id: 'user-123', name: 'Test User' };
          const hasAccess = hasPermission(userWithoutRole, permission);
          
          expect(hasAccess).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should deny access for null or undefined users', () => {
      fc.assert(
        fc.property(permissionArb, (permission) => {
          expect(hasPermission(null, permission)).toBe(false);
          expect(hasPermission(undefined, permission)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should consistently grant or deny access for same user-permission pair', () => {
      fc.assert(
        fc.property(userArb, permissionArb, (user, permission) => {
          const firstCheck = hasPermission(user, permission);
          const secondCheck = hasPermission(user, permission);
          
          // Should be consistent
          expect(firstCheck).toBe(secondCheck);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle all defined finance permissions', () => {
      const allPermissions = Object.values(FINANCE_PERMISSIONS);
      
      fc.assert(
        fc.property(userArb, (user) => {
          allPermissions.forEach(permission => {
            const hasAccess = hasPermission(user, permission);
            const expected = shouldHaveAccess(user.role, permission);
            
            expect(hasAccess).toBe(expected);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Role-specific permission tests
   */
  describe('Role-Specific Permission Validation', () => {
    
    it('FINANCE_OFFICER should have full operational access', () => {
      const financeOfficer = { id: 'fo-1', role: 'FINANCE_OFFICER', name: 'Finance Officer' };
      
      // Should have access to operational permissions
      expect(hasPermission(financeOfficer, FINANCE_PERMISSIONS.ACCOUNTS_CREATE)).toBe(true);
      expect(hasPermission(financeOfficer, FINANCE_PERMISSIONS.INVOICES_CREATE)).toBe(true);
      expect(hasPermission(financeOfficer, FINANCE_PERMISSIONS.PAYMENTS_RECORD)).toBe(true);
      expect(hasPermission(financeOfficer, FINANCE_PERMISSIONS.EXPENSES_CREATE)).toBe(true);
      expect(hasPermission(financeOfficer, FINANCE_PERMISSIONS.BUDGETS_CREATE)).toBe(true);
      expect(hasPermission(financeOfficer, FINANCE_PERMISSIONS.PAYROLL_CREATE)).toBe(true);
      
      // Should NOT have high-level approval permissions
      expect(hasPermission(financeOfficer, FINANCE_PERMISSIONS.INVOICES_REVERSE)).toBe(false);
    });

    it('SCHOOL_ADMINISTRATOR should have oversight and approval access', () => {
      const admin = { id: 'admin-1', role: 'SCHOOL_ADMINISTRATOR', name: 'Administrator' };
      
      // Should have approval permissions
      expect(hasPermission(admin, FINANCE_PERMISSIONS.REFUNDS_APPROVE)).toBe(true);
      expect(hasPermission(admin, FINANCE_PERMISSIONS.EXPENSES_APPROVE)).toBe(true);
      expect(hasPermission(admin, FINANCE_PERMISSIONS.BUDGETS_APPROVE)).toBe(true);
      expect(hasPermission(admin, FINANCE_PERMISSIONS.PAYROLL_APPROVE)).toBe(true);
      expect(hasPermission(admin, FINANCE_PERMISSIONS.INVOICES_REVERSE)).toBe(true);
      
      // Should have view access
      expect(hasPermission(admin, FINANCE_PERMISSIONS.REPORTS_VIEW)).toBe(true);
      expect(hasPermission(admin, FINANCE_PERMISSIONS.AUDIT_LOGS_VIEW)).toBe(true);
      
      // Should NOT have operational create permissions
      expect(hasPermission(admin, FINANCE_PERMISSIONS.ACCOUNTS_CREATE)).toBe(false);
      expect(hasPermission(admin, FINANCE_PERMISSIONS.INVOICES_CREATE)).toBe(false);
      expect(hasPermission(admin, FINANCE_PERMISSIONS.PAYMENTS_RECORD)).toBe(false);
    });

    it('AUDITOR should have read-only access', () => {
      const auditor = { id: 'auditor-1', role: 'AUDITOR', name: 'Auditor' };
      
      // Should have view permissions
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.ACCOUNTS_VIEW)).toBe(true);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.INVOICES_VIEW)).toBe(true);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.PAYMENTS_VIEW)).toBe(true);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.EXPENSES_VIEW)).toBe(true);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.BUDGETS_VIEW)).toBe(true);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.PAYROLL_VIEW)).toBe(true);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.REPORTS_VIEW)).toBe(true);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.AUDIT_LOGS_VIEW)).toBe(true);
      
      // Should NOT have any create, update, or approval permissions
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.ACCOUNTS_CREATE)).toBe(false);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.INVOICES_CREATE)).toBe(false);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.PAYMENTS_RECORD)).toBe(false);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.EXPENSES_CREATE)).toBe(false);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.REFUNDS_APPROVE)).toBe(false);
      expect(hasPermission(auditor, FINANCE_PERMISSIONS.EXPENSES_APPROVE)).toBe(false);
    });

    it('director role should map to SCHOOL_ADMINISTRATOR', () => {
      const director = { id: 'dir-1', role: 'director', name: 'Director' };
      
      // Should have same permissions as SCHOOL_ADMINISTRATOR
      expect(hasPermission(director, FINANCE_PERMISSIONS.REFUNDS_APPROVE)).toBe(true);
      expect(hasPermission(director, FINANCE_PERMISSIONS.EXPENSES_APPROVE)).toBe(true);
      expect(hasPermission(director, FINANCE_PERMISSIONS.BUDGETS_APPROVE)).toBe(true);
      expect(hasPermission(director, FINANCE_PERMISSIONS.AUDIT_LOGS_VIEW)).toBe(true);
    });

    it('teacher and guardian roles should have no finance access', () => {
      const teacher = { id: 'teacher-1', role: 'teacher', name: 'Teacher' };
      const guardian = { id: 'guardian-1', role: 'guardian', name: 'Guardian' };
      
      const allPermissions = Object.values(FINANCE_PERMISSIONS);
      
      allPermissions.forEach(permission => {
        expect(hasPermission(teacher, permission)).toBe(false);
        expect(hasPermission(guardian, permission)).toBe(false);
      });
    });
  });

  /**
   * Permission boundary tests
   */
  describe('Permission Boundary Tests', () => {
    
    it('should not grant permissions outside role definition', () => {
      fc.assert(
        fc.property(userArb, permissionArb, (user, permission) => {
          const rolePermissions = getRolePermissions(user.role);
          const hasAccess = hasPermission(user, permission);
          
          if (hasAccess) {
            // If access is granted, permission must be in role's permission list
            expect(rolePermissions).toContain(permission);
          } else {
            // If access is denied, permission must not be in role's permission list
            expect(rolePermissions).not.toContain(permission);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle unknown permissions gracefully', () => {
      fc.assert(
        fc.property(
          userArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          (user, unknownPermission) => {
            // Ensure it's not a real permission
            fc.pre(!Object.values(FINANCE_PERMISSIONS).includes(unknownPermission));
            
            const hasAccess = hasPermission(user, unknownPermission);
            
            // Should deny access to unknown permissions
            expect(hasAccess).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle unknown roles gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
            !['FINANCE_OFFICER', 'SCHOOL_ADMINISTRATOR', 'AUDITOR', 'director', 'teacher', 'guardian'].includes(s)
          ),
          permissionArb,
          (unknownRole, permission) => {
            const user = { id: 'user-1', role: unknownRole, name: 'Unknown User' };
            const hasAccess = hasPermission(user, permission);
            
            // Should deny access for unknown roles
            expect(hasAccess).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Permission inheritance and composition tests
   */
  describe('Permission Composition Tests', () => {
    
    it('should maintain permission hierarchy - view before modify', () => {
      const financeOfficer = { id: 'fo-1', role: 'FINANCE_OFFICER', name: 'Finance Officer' };
      
      // If you can create/update, you should be able to view
      const createPermissions = [
        { create: FINANCE_PERMISSIONS.ACCOUNTS_CREATE, view: FINANCE_PERMISSIONS.ACCOUNTS_VIEW },
        { create: FINANCE_PERMISSIONS.INVOICES_CREATE, view: FINANCE_PERMISSIONS.INVOICES_VIEW },
        { create: FINANCE_PERMISSIONS.EXPENSES_CREATE, view: FINANCE_PERMISSIONS.EXPENSES_VIEW },
        { create: FINANCE_PERMISSIONS.BUDGETS_CREATE, view: FINANCE_PERMISSIONS.BUDGETS_VIEW },
      ];

      createPermissions.forEach(({ create, view }) => {
        const canCreate = hasPermission(financeOfficer, create);
        const canView = hasPermission(financeOfficer, view);
        
        if (canCreate) {
          // If you can create, you should be able to view
          expect(canView).toBe(true);
        }
      });
    });

    it('should enforce separation of duties - auditor cannot modify', () => {
      const auditor = { id: 'auditor-1', role: 'AUDITOR', name: 'Auditor' };
      
      const modifyPermissions = [
        FINANCE_PERMISSIONS.ACCOUNTS_CREATE,
        FINANCE_PERMISSIONS.ACCOUNTS_UPDATE,
        FINANCE_PERMISSIONS.ACCOUNTS_DELETE,
        FINANCE_PERMISSIONS.INVOICES_CREATE,
        FINANCE_PERMISSIONS.INVOICES_UPDATE,
        FINANCE_PERMISSIONS.PAYMENTS_RECORD,
        FINANCE_PERMISSIONS.EXPENSES_CREATE,
        FINANCE_PERMISSIONS.BUDGETS_CREATE,
        FINANCE_PERMISSIONS.PAYROLL_CREATE,
      ];

      modifyPermissions.forEach(permission => {
        expect(hasPermission(auditor, permission)).toBe(false);
      });
    });

    it('should enforce approval authority - only administrators can approve high-value items', () => {
      const financeOfficer = { id: 'fo-1', role: 'FINANCE_OFFICER', name: 'Finance Officer' };
      const admin = { id: 'admin-1', role: 'SCHOOL_ADMINISTRATOR', name: 'Administrator' };
      
      const highLevelApprovals = [
        FINANCE_PERMISSIONS.REFUNDS_APPROVE,
        FINANCE_PERMISSIONS.EXPENSES_APPROVE,
        FINANCE_PERMISSIONS.BUDGETS_APPROVE,
        FINANCE_PERMISSIONS.PAYROLL_APPROVE,
      ];

      highLevelApprovals.forEach(permission => {
        // Finance officer should not have high-level approval
        expect(hasPermission(financeOfficer, permission)).toBe(false);
        
        // Administrator should have approval authority
        expect(hasPermission(admin, permission)).toBe(true);
      });
    });
  });

  /**
   * Edge cases and error conditions
   */
  describe('Edge Cases', () => {
    
    it('should handle empty user object', () => {
      fc.assert(
        fc.property(permissionArb, (permission) => {
          const emptyUser = {};
          expect(hasPermission(emptyUser, permission)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle user with null role', () => {
      fc.assert(
        fc.property(permissionArb, (permission) => {
          const userWithNullRole = { id: 'user-1', role: null, name: 'User' };
          expect(hasPermission(userWithNullRole, permission)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle empty permission string', () => {
      fc.assert(
        fc.property(userArb, (user) => {
          expect(hasPermission(user, '')).toBe(false);
          expect(hasPermission(user, null)).toBe(false);
          expect(hasPermission(user, undefined)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should be case-sensitive for roles', () => {
      const lowerCaseRole = { id: 'user-1', role: 'finance_officer', name: 'User' };
      const upperCaseRole = { id: 'user-2', role: 'FINANCE_OFFICER', name: 'User' };
      
      const permission = FINANCE_PERMISSIONS.ACCOUNTS_CREATE;
      
      expect(hasPermission(lowerCaseRole, permission)).toBe(false);
      expect(hasPermission(upperCaseRole, permission)).toBe(true);
    });

    it('should be case-sensitive for permissions', () => {
      const user = { id: 'user-1', role: 'FINANCE_OFFICER', name: 'Finance Officer' };
      
      expect(hasPermission(user, 'ACCOUNTS:CREATE')).toBe(false);
      expect(hasPermission(user, 'accounts:create')).toBe(true);
    });
  });
});

// ============================================================================
// Unit Tests for Permission System
// ============================================================================

describe('Permission System Unit Tests', () => {
  
  describe('FINANCE_PERMISSIONS constant', () => {
    it('should have all required permission categories', () => {
      const permissionKeys = Object.keys(FINANCE_PERMISSIONS);
      
      // Check for major categories
      expect(permissionKeys.some(k => k.startsWith('ACCOUNTS_'))).toBe(true);
      expect(permissionKeys.some(k => k.startsWith('INVOICES_'))).toBe(true);
      expect(permissionKeys.some(k => k.startsWith('PAYMENTS_'))).toBe(true);
      expect(permissionKeys.some(k => k.startsWith('EXPENSES_'))).toBe(true);
      expect(permissionKeys.some(k => k.startsWith('BUDGETS_'))).toBe(true);
      expect(permissionKeys.some(k => k.startsWith('PAYROLL_'))).toBe(true);
      expect(permissionKeys.some(k => k.startsWith('REPORTS_'))).toBe(true);
      expect(permissionKeys.some(k => k.startsWith('AUDIT_'))).toBe(true);
    });

    it('should have unique permission values', () => {
      const permissionValues = Object.values(FINANCE_PERMISSIONS);
      const uniqueValues = new Set(permissionValues);
      
      expect(uniqueValues.size).toBe(permissionValues.length);
    });

    it('should use consistent naming convention', () => {
      const permissionValues = Object.values(FINANCE_PERMISSIONS);
      
      permissionValues.forEach(permission => {
        // Should be lowercase with colons
        expect(permission).toMatch(/^[a-z_]+:[a-z_]+$/);
      });
    });
  });

  describe('ROLE_PERMISSIONS mapping', () => {
    it('should define permissions for all finance roles', () => {
      expect(ROLE_PERMISSIONS.FINANCE_OFFICER).toBeDefined();
      expect(ROLE_PERMISSIONS.SCHOOL_ADMINISTRATOR).toBeDefined();
      expect(ROLE_PERMISSIONS.AUDITOR).toBeDefined();
    });

    it('should map existing roles to finance roles', () => {
      expect(ROLE_PERMISSIONS.director).toBe('SCHOOL_ADMINISTRATOR');
      expect(ROLE_PERMISSIONS.teacher).toBe(null);
      expect(ROLE_PERMISSIONS.guardian).toBe(null);
    });

    it('should have non-empty permission arrays for finance roles', () => {
      expect(ROLE_PERMISSIONS.FINANCE_OFFICER.length).toBeGreaterThan(0);
      expect(ROLE_PERMISSIONS.SCHOOL_ADMINISTRATOR.length).toBeGreaterThan(0);
      expect(ROLE_PERMISSIONS.AUDITOR.length).toBeGreaterThan(0);
    });

    it('should only contain valid permissions', () => {
      const allValidPermissions = Object.values(FINANCE_PERMISSIONS);
      
      Object.keys(ROLE_PERMISSIONS).forEach(role => {
        const permissions = ROLE_PERMISSIONS[role];
        
        if (Array.isArray(permissions)) {
          permissions.forEach(permission => {
            expect(allValidPermissions).toContain(permission);
          });
        }
      });
    });
  });

  describe('hasPermission function', () => {
    it('should return boolean', () => {
      const user = { id: 'user-1', role: 'FINANCE_OFFICER', name: 'User' };
      const result = hasPermission(user, FINANCE_PERMISSIONS.ACCOUNTS_VIEW);
      
      expect(typeof result).toBe('boolean');
    });

    it('should handle role mapping correctly', () => {
      const director = { id: 'dir-1', role: 'director', name: 'Director' };
      const admin = { id: 'admin-1', role: 'SCHOOL_ADMINISTRATOR', name: 'Admin' };
      
      const permission = FINANCE_PERMISSIONS.BUDGETS_APPROVE;
      
      // Both should have same access since director maps to SCHOOL_ADMINISTRATOR
      expect(hasPermission(director, permission)).toBe(hasPermission(admin, permission));
    });
  });
});
