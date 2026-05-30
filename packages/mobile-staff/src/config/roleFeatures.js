/**
 * Role-Based Feature Access Configuration
 * 
 * This configuration defines which features are accessible to each staff role type
 * in the Skoolific Staff mobile application.
 * 
 * Staff Role Types:
 * - Teacher: Teaching staff who handle academic activities
 * - Administrative: Administrative staff who handle student registration, fees, etc.
 * - Supportive: Support staff with limited access
 * 
 * Feature IDs correspond to navigation items and feature components in the app.
 * 
 * @module roleFeatures
 */

/**
 * Feature access mapping for each staff role
 * @constant {Object.<string, string[]>}
 */
export const ROLE_FEATURES = {
  /**
   * Teacher Role Features
   * Teachers have access to academic and classroom management features
   */
  Teacher: [
    'mark-lists',           // Enter and manage student marks
    'attendance',           // Mark student attendance
    'exam-creation',        // Create and manage exams
    'class-management',     // Manage class information and students
    'schedule-view',        // View class schedules
    'student-reports',      // Generate and view student reports
    'evaluation-book',      // Access evaluation book for student assessments
    'communication'         // Message parents and students
  ],

  /**
   * Administrative Role Features
   * Administrative staff handle student registration, fees, and administrative tasks
   */
  Administrative: [
    'student-registration', // Register new students
    'fee-management',       // Manage student fees and payments
    'reports',              // Generate administrative reports
    'communication',        // Message parents and students
    'student-list',         // View and manage student lists
    'payment-tracking'      // Track payment status
  ],

  /**
   * Supportive Role Features
   * Support staff have limited access to view-only features
   */
  Supportive: [
    'attendance-view',      // View attendance records (read-only)
    'schedule-view',        // View class schedules (read-only)
    'communication',        // Message parents and students
    'student-list'          // View student lists (read-only)
  ]
};

/**
 * Feature metadata containing display information and descriptions
 * @constant {Object.<string, Object>}
 */
export const FEATURE_METADATA = {
  'mark-lists': {
    title: 'Mark Lists',
    description: 'Enter and manage student marks',
    icon: '📚',
    route: '/marks'
  },
  'attendance': {
    title: 'Attendance',
    description: 'Mark student attendance',
    icon: '✅',
    route: '/attendance'
  },
  'exam-creation': {
    title: 'Exam Creation',
    description: 'Create and manage exams',
    icon: '📝',
    route: '/exams'
  },
  'class-management': {
    title: 'Class Management',
    description: 'Manage class information and students',
    icon: '🏫',
    route: '/classes'
  },
  'schedule-view': {
    title: 'Schedule',
    description: 'View class schedules',
    icon: '📅',
    route: '/schedule'
  },
  'student-reports': {
    title: 'Student Reports',
    description: 'Generate and view student reports',
    icon: '📊',
    route: '/reports/students'
  },
  'evaluation-book': {
    title: 'Evaluation Book',
    description: 'Student assessments and observations',
    icon: '📖',
    route: '/evaluation'
  },
  'student-registration': {
    title: 'Student Registration',
    description: 'Register new students',
    icon: '➕',
    route: '/students/register'
  },
  'fee-management': {
    title: 'Fee Management',
    description: 'Manage student fees and payments',
    icon: '💰',
    route: '/fees'
  },
  'reports': {
    title: 'Reports',
    description: 'Generate administrative reports',
    icon: '📊',
    route: '/reports'
  },
  'communication': {
    title: 'Communication',
    description: 'Message parents and students',
    icon: '💬',
    route: '/communication'
  },
  'attendance-view': {
    title: 'Attendance View',
    description: 'View attendance records',
    icon: '👁️',
    route: '/attendance/view'
  },
  'student-list': {
    title: 'Students',
    description: 'View student information',
    icon: '👥',
    route: '/students'
  },
  'payment-tracking': {
    title: 'Payment Tracking',
    description: 'Track payment status',
    icon: '💳',
    route: '/payments/track'
  }
};

/**
 * Check if a user has access to a specific feature
 * @param {string} staffType - The staff role type (Teacher, Administrative, Supportive)
 * @param {string} featureId - The feature identifier to check
 * @returns {boolean} True if the user has access to the feature
 */
export function hasFeatureAccess(staffType, featureId) {
  const features = ROLE_FEATURES[staffType];
  if (!features) {
    console.warn(`Unknown staff type: ${staffType}`);
    return false;
  }
  return features.includes(featureId);
}

/**
 * Get all features accessible to a specific staff role
 * @param {string} staffType - The staff role type (Teacher, Administrative, Supportive)
 * @returns {string[]} Array of feature IDs accessible to the role
 */
export function getRoleFeatures(staffType) {
  return ROLE_FEATURES[staffType] || [];
}

/**
 * Get feature metadata for accessible features
 * @param {string} staffType - The staff role type (Teacher, Administrative, Supportive)
 * @returns {Object[]} Array of feature metadata objects
 */
export function getRoleFeaturesWithMetadata(staffType) {
  const featureIds = getRoleFeatures(staffType);
  return featureIds.map(featureId => ({
    id: featureId,
    ...FEATURE_METADATA[featureId]
  })).filter(feature => feature.title); // Filter out features without metadata
}

/**
 * Get all available staff role types
 * @returns {string[]} Array of staff role type names
 */
export function getAvailableRoles() {
  return Object.keys(ROLE_FEATURES);
}

/**
 * Validate if a staff type is valid
 * @param {string} staffType - The staff role type to validate
 * @returns {boolean} True if the staff type is valid
 */
export function isValidStaffType(staffType) {
  return ROLE_FEATURES.hasOwnProperty(staffType);
}

export default ROLE_FEATURES;
