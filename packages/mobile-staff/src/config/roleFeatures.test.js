/**
 * Unit tests for roleFeatures configuration
 * 
 * These tests verify that the role-based feature access control
 * works correctly for all staff types.
 */

import {
  ROLE_FEATURES,
  FEATURE_METADATA,
  hasFeatureAccess,
  getRoleFeatures,
  getRoleFeaturesWithMetadata,
  getAvailableRoles,
  isValidStaffType
} from './roleFeatures';

describe('ROLE_FEATURES Configuration', () => {
  describe('ROLE_FEATURES constant', () => {
    test('should define all three staff roles', () => {
      expect(ROLE_FEATURES).toHaveProperty('Teacher');
      expect(ROLE_FEATURES).toHaveProperty('Administrative');
      expect(ROLE_FEATURES).toHaveProperty('Supportive');
    });

    test('Teacher role should have correct features', () => {
      const teacherFeatures = ROLE_FEATURES.Teacher;
      expect(teacherFeatures).toContain('mark-lists');
      expect(teacherFeatures).toContain('attendance');
      expect(teacherFeatures).toContain('exam-creation');
      expect(teacherFeatures).toContain('class-management');
      expect(teacherFeatures).toContain('schedule-view');
      expect(teacherFeatures).toContain('student-reports');
      expect(teacherFeatures).toContain('evaluation-book');
      expect(teacherFeatures).toContain('communication');
    });

    test('Administrative role should have correct features', () => {
      const adminFeatures = ROLE_FEATURES.Administrative;
      expect(adminFeatures).toContain('student-registration');
      expect(adminFeatures).toContain('fee-management');
      expect(adminFeatures).toContain('reports');
      expect(adminFeatures).toContain('communication');
      expect(adminFeatures).toContain('student-list');
      expect(adminFeatures).toContain('payment-tracking');
    });

    test('Supportive role should have correct features', () => {
      const supportiveFeatures = ROLE_FEATURES.Supportive;
      expect(supportiveFeatures).toContain('attendance-view');
      expect(supportiveFeatures).toContain('schedule-view');
      expect(supportiveFeatures).toContain('communication');
      expect(supportiveFeatures).toContain('student-list');
    });

    test('Teacher should NOT have administrative features', () => {
      const teacherFeatures = ROLE_FEATURES.Teacher;
      expect(teacherFeatures).not.toContain('student-registration');
      expect(teacherFeatures).not.toContain('fee-management');
      expect(teacherFeatures).not.toContain('payment-tracking');
    });

    test('Administrative should NOT have teacher-specific features', () => {
      const adminFeatures = ROLE_FEATURES.Administrative;
      expect(adminFeatures).not.toContain('mark-lists');
      expect(adminFeatures).not.toContain('exam-creation');
      expect(adminFeatures).not.toContain('class-management');
      expect(adminFeatures).not.toContain('evaluation-book');
    });

    test('Supportive should have limited features', () => {
      const supportiveFeatures = ROLE_FEATURES.Supportive;
      expect(supportiveFeatures.length).toBeLessThan(ROLE_FEATURES.Teacher.length);
      expect(supportiveFeatures.length).toBeLessThan(ROLE_FEATURES.Administrative.length);
    });
  });

  describe('FEATURE_METADATA constant', () => {
    test('should have metadata for all features', () => {
      const allFeatures = [
        ...ROLE_FEATURES.Teacher,
        ...ROLE_FEATURES.Administrative,
        ...ROLE_FEATURES.Supportive
      ];
      const uniqueFeatures = [...new Set(allFeatures)];

      uniqueFeatures.forEach(featureId => {
        expect(FEATURE_METADATA).toHaveProperty(featureId);
      });
    });

    test('each feature metadata should have required properties', () => {
      Object.values(FEATURE_METADATA).forEach(metadata => {
        expect(metadata).toHaveProperty('title');
        expect(metadata).toHaveProperty('description');
        expect(metadata).toHaveProperty('icon');
        expect(metadata).toHaveProperty('route');
      });
    });

    test('feature routes should start with /', () => {
      Object.values(FEATURE_METADATA).forEach(metadata => {
        expect(metadata.route).toMatch(/^\//);
      });
    });
  });

  describe('hasFeatureAccess()', () => {
    test('should return true for valid role and feature', () => {
      expect(hasFeatureAccess('Teacher', 'mark-lists')).toBe(true);
      expect(hasFeatureAccess('Administrative', 'fee-management')).toBe(true);
      expect(hasFeatureAccess('Supportive', 'attendance-view')).toBe(true);
    });

    test('should return false for invalid role and feature combination', () => {
      expect(hasFeatureAccess('Teacher', 'fee-management')).toBe(false);
      expect(hasFeatureAccess('Administrative', 'mark-lists')).toBe(false);
      expect(hasFeatureAccess('Supportive', 'exam-creation')).toBe(false);
    });

    test('should return false for invalid staff type', () => {
      expect(hasFeatureAccess('InvalidRole', 'mark-lists')).toBe(false);
    });

    test('should return false for non-existent feature', () => {
      expect(hasFeatureAccess('Teacher', 'non-existent-feature')).toBe(false);
    });

    test('all roles should have access to communication', () => {
      expect(hasFeatureAccess('Teacher', 'communication')).toBe(true);
      expect(hasFeatureAccess('Administrative', 'communication')).toBe(true);
      expect(hasFeatureAccess('Supportive', 'communication')).toBe(true);
    });
  });

  describe('getRoleFeatures()', () => {
    test('should return array of features for valid role', () => {
      const teacherFeatures = getRoleFeatures('Teacher');
      expect(Array.isArray(teacherFeatures)).toBe(true);
      expect(teacherFeatures.length).toBeGreaterThan(0);
    });

    test('should return empty array for invalid role', () => {
      const features = getRoleFeatures('InvalidRole');
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBe(0);
    });

    test('should return correct number of features per role', () => {
      expect(getRoleFeatures('Teacher').length).toBe(8);
      expect(getRoleFeatures('Administrative').length).toBe(6);
      expect(getRoleFeatures('Supportive').length).toBe(4);
    });
  });

  describe('getRoleFeaturesWithMetadata()', () => {
    test('should return array of feature objects with metadata', () => {
      const features = getRoleFeaturesWithMetadata('Teacher');
      expect(Array.isArray(features)).toBe(true);
      
      features.forEach(feature => {
        expect(feature).toHaveProperty('id');
        expect(feature).toHaveProperty('title');
        expect(feature).toHaveProperty('description');
        expect(feature).toHaveProperty('icon');
        expect(feature).toHaveProperty('route');
      });
    });

    test('should return empty array for invalid role', () => {
      const features = getRoleFeaturesWithMetadata('InvalidRole');
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBe(0);
    });

    test('should include feature ID in returned objects', () => {
      const features = getRoleFeaturesWithMetadata('Teacher');
      const markListsFeature = features.find(f => f.id === 'mark-lists');
      
      expect(markListsFeature).toBeDefined();
      expect(markListsFeature.title).toBe('Mark Lists');
      expect(markListsFeature.route).toBe('/marks');
    });
  });

  describe('getAvailableRoles()', () => {
    test('should return array of all role names', () => {
      const roles = getAvailableRoles();
      expect(Array.isArray(roles)).toBe(true);
      expect(roles).toContain('Teacher');
      expect(roles).toContain('Administrative');
      expect(roles).toContain('Supportive');
    });

    test('should return exactly 3 roles', () => {
      const roles = getAvailableRoles();
      expect(roles.length).toBe(3);
    });
  });

  describe('isValidStaffType()', () => {
    test('should return true for valid staff types', () => {
      expect(isValidStaffType('Teacher')).toBe(true);
      expect(isValidStaffType('Administrative')).toBe(true);
      expect(isValidStaffType('Supportive')).toBe(true);
    });

    test('should return false for invalid staff types', () => {
      expect(isValidStaffType('InvalidRole')).toBe(false);
      expect(isValidStaffType('teacher')).toBe(false); // case-sensitive
      expect(isValidStaffType('')).toBe(false);
      expect(isValidStaffType(null)).toBe(false);
      expect(isValidStaffType(undefined)).toBe(false);
    });
  });

  describe('Role-specific feature requirements', () => {
    test('Teacher should have mark-lists feature (Requirement 23.9)', () => {
      expect(hasFeatureAccess('Teacher', 'mark-lists')).toBe(true);
    });

    test('Teacher should have exam-creation feature (Requirement 23.9)', () => {
      expect(hasFeatureAccess('Teacher', 'exam-creation')).toBe(true);
    });

    test('Teacher should have class-management feature (Requirement 23.9)', () => {
      expect(hasFeatureAccess('Teacher', 'class-management')).toBe(true);
    });

    test('Administrative should have student-registration feature (Requirement 23.10)', () => {
      expect(hasFeatureAccess('Administrative', 'student-registration')).toBe(true);
    });

    test('Administrative should have fee-management feature (Requirement 23.10)', () => {
      expect(hasFeatureAccess('Administrative', 'fee-management')).toBe(true);
    });

    test('Supportive should have limited features (Requirement 23.11)', () => {
      const supportiveFeatures = getRoleFeatures('Supportive');
      const teacherFeatures = getRoleFeatures('Teacher');
      const adminFeatures = getRoleFeatures('Administrative');
      
      expect(supportiveFeatures.length).toBeLessThan(teacherFeatures.length);
      expect(supportiveFeatures.length).toBeLessThan(adminFeatures.length);
    });
  });

  describe('Common features across roles', () => {
    test('communication should be available to all roles', () => {
      expect(hasFeatureAccess('Teacher', 'communication')).toBe(true);
      expect(hasFeatureAccess('Administrative', 'communication')).toBe(true);
      expect(hasFeatureAccess('Supportive', 'communication')).toBe(true);
    });

    test('schedule-view should be available to Teacher and Supportive', () => {
      expect(hasFeatureAccess('Teacher', 'schedule-view')).toBe(true);
      expect(hasFeatureAccess('Supportive', 'schedule-view')).toBe(true);
    });

    test('student-list should be available to Administrative and Supportive', () => {
      expect(hasFeatureAccess('Administrative', 'student-list')).toBe(true);
      expect(hasFeatureAccess('Supportive', 'student-list')).toBe(true);
    });
  });
});
