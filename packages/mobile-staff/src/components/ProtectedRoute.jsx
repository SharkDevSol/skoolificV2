/**
 * ProtectedRoute Component
 * 
 * A route wrapper component that implements role-based access control for features
 * in the Skoolific Staff mobile application.
 * 
 * Features:
 * - Checks if user has access to a specific feature using hasFeatureAccess()
 * - Redirects unauthorized users to an access denied page
 * - Displays appropriate error messages for unauthorized access attempts
 * - Integrates with authentication context
 * 
 * @module ProtectedRoute
 */

import { Navigate } from 'react-router-dom';
import { hasFeatureAccess } from '../config/roleFeatures';
import './ProtectedRoute.css';

/**
 * ProtectedRoute Component
 * 
 * Wraps route components to enforce role-based access control.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The component to render if access is granted
 * @param {Object} props.user - Current authenticated user object
 * @param {string} props.user.staffType - Staff role type (Teacher, Administrative, Supportive)
 * @param {string} props.featureId - The feature identifier to check access for
 * @param {string} [props.redirectTo='/access-denied'] - Route to redirect to if access is denied
 * @param {boolean} [props.showAccessDenied=true] - Whether to show access denied page or redirect
 * 
 * @example
 * // Basic usage with redirect to access denied page
 * <Route 
 *   path="/marks" 
 *   element={
 *     <ProtectedRoute user={user} featureId="mark-lists">
 *       <MarkListsPage />
 *     </ProtectedRoute>
 *   } 
 * />
 * 
 * @example
 * // With custom redirect
 * <Route 
 *   path="/marks" 
 *   element={
 *     <ProtectedRoute user={user} featureId="mark-lists" redirectTo="/">
 *       <MarkListsPage />
 *     </ProtectedRoute>
 *   } 
 * />
 */
function ProtectedRoute({ 
  children, 
  user, 
  featureId, 
  redirectTo = '/access-denied',
  showAccessDenied = true 
}) {
  // Validate user object
  if (!user || !user.staffType) {
    console.warn('ProtectedRoute: Invalid user object provided');
    return showAccessDenied ? <AccessDeniedPage featureId={featureId} /> : <Navigate to="/" replace />;
  }

  // Check if user has access to the feature
  const hasAccess = hasFeatureAccess(user.staffType, featureId);

  // If user has access, render the protected component
  if (hasAccess) {
    return children;
  }

  // If user doesn't have access, show access denied or redirect
  if (showAccessDenied) {
    return <AccessDeniedPage featureId={featureId} userRole={user.staffType} />;
  }

  return <Navigate to={redirectTo} replace />;
}

/**
 * AccessDeniedPage Component
 * 
 * Displays an access denied message when a user attempts to access
 * a feature they don't have permission for.
 * 
 * @param {Object} props - Component props
 * @param {string} props.featureId - The feature that was denied
 * @param {string} [props.userRole] - The user's role type
 */
function AccessDeniedPage({ featureId, userRole }) {
  // Map feature IDs to user-friendly names
  const featureNames = {
    'mark-lists': 'Mark Lists',
    'attendance': 'Attendance',
    'exam-creation': 'Exam Creation',
    'class-management': 'Class Management',
    'schedule-view': 'Schedule',
    'student-reports': 'Student Reports',
    'evaluation-book': 'Evaluation Book',
    'student-registration': 'Student Registration',
    'fee-management': 'Fee Management',
    'reports': 'Reports',
    'communication': 'Communication',
    'attendance-view': 'Attendance View',
    'student-list': 'Students',
    'payment-tracking': 'Payment Tracking'
  };

  const featureName = featureNames[featureId] || featureId;

  return (
    <div className="access-denied-page">
      <div className="access-denied-container">
        <div className="access-denied-icon">
          <span role="img" aria-label="Access Denied">🚫</span>
        </div>
        
        <h1 className="access-denied-title">Access Denied</h1>
        
        <div className="access-denied-message">
          <p>
            You do not have permission to access the <strong>{featureName}</strong> feature.
          </p>
          {userRole && (
            <p className="access-denied-role">
              Your current role (<strong>{userRole}</strong>) does not include access to this feature.
            </p>
          )}
          <p className="access-denied-help">
            If you believe you should have access to this feature, please contact your school administrator.
          </p>
        </div>

        <div className="access-denied-actions">
          <button 
            className="btn-primary"
            onClick={() => window.history.back()}
          >
            Go Back
          </button>
          <button 
            className="btn-secondary"
            onClick={() => window.location.href = '/'}
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProtectedRoute;
export { AccessDeniedPage };
