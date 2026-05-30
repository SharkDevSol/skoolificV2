/**
 * Example Usage of Role-Based Feature Access
 * 
 * This file demonstrates how to use the roleFeatures configuration
 * in various React components throughout the Staff mobile app.
 */

import React from 'react';
import {
  ROLE_FEATURES,
  hasFeatureAccess,
  getRoleFeatures,
  getRoleFeaturesWithMetadata,
  getAvailableRoles,
  isValidStaffType
} from './roleFeatures';

// ============================================================================
// Example 1: Simple Feature Access Check
// ============================================================================

function MarkListsButton({ user }) {
  // Only show the button if the user has access to mark-lists
  if (!hasFeatureAccess(user.staffType, 'mark-lists')) {
    return null;
  }

  return (
    <button onClick={() => navigateToMarkLists()}>
      📚 Mark Lists
    </button>
  );
}

// ============================================================================
// Example 2: Conditional Rendering Based on Multiple Features
// ============================================================================

function StaffDashboard({ user }) {
  return (
    <div className="dashboard">
      <h1>Welcome, {user.name}</h1>
      <p>Role: {user.staffType}</p>

      <div className="feature-grid">
        {/* Teacher-specific features */}
        {hasFeatureAccess(user.staffType, 'mark-lists') && (
          <FeatureCard
            title="Mark Lists"
            icon="📚"
            route="/marks"
          />
        )}

        {hasFeatureAccess(user.staffType, 'exam-creation') && (
          <FeatureCard
            title="Create Exam"
            icon="📝"
            route="/exams/create"
          />
        )}

        {/* Administrative-specific features */}
        {hasFeatureAccess(user.staffType, 'student-registration') && (
          <FeatureCard
            title="Register Student"
            icon="➕"
            route="/students/register"
          />
        )}

        {hasFeatureAccess(user.staffType, 'fee-management') && (
          <FeatureCard
            title="Fee Management"
            icon="💰"
            route="/fees"
          />
        )}

        {/* Common features (available to all roles) */}
        {hasFeatureAccess(user.staffType, 'communication') && (
          <FeatureCard
            title="Communication"
            icon="💬"
            route="/communication"
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Example 3: Dynamic Navigation Based on Role
// ============================================================================

function NavigationMenu({ user }) {
  // Get all features with metadata for the user's role
  const features = getRoleFeaturesWithMetadata(user.staffType);

  return (
    <nav className="navigation">
      <ul>
        {features.map(feature => (
          <li key={feature.id}>
            <a href={feature.route}>
              <span className="icon">{feature.icon}</span>
              <span className="title">{feature.title}</span>
              <span className="description">{feature.description}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ============================================================================
// Example 4: Protected Route Component
// ============================================================================

function ProtectedFeature({ featureId, user, children, fallback }) {
  if (!hasFeatureAccess(user.staffType, featureId)) {
    return fallback || (
      <div className="unauthorized">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this feature.</p>
      </div>
    );
  }

  return children;
}

// Usage:
function ExamCreationPage({ user }) {
  return (
    <ProtectedFeature featureId="exam-creation" user={user}>
      <div>
        <h1>Create Exam</h1>
        {/* Exam creation form */}
      </div>
    </ProtectedFeature>
  );
}

// ============================================================================
// Example 5: Custom Hook for Feature Access
// ============================================================================

function useFeatureAccess(user) {
  return {
    hasAccess: (featureId) => hasFeatureAccess(user.staffType, featureId),
    features: getRoleFeatures(user.staffType),
    featuresWithMetadata: getRoleFeaturesWithMetadata(user.staffType),
    staffType: user.staffType,
    isValidRole: isValidStaffType(user.staffType)
  };
}

// Usage in component:
function MyComponent({ user }) {
  const { hasAccess, features } = useFeatureAccess(user);

  return (
    <div>
      <h2>Available Features: {features.length}</h2>
      
      {hasAccess('mark-lists') && (
        <button>Enter Marks</button>
      )}
      
      {hasAccess('attendance') && (
        <button>Mark Attendance</button>
      )}
    </div>
  );
}

// ============================================================================
// Example 6: Role Validation on Login
// ============================================================================

async function handleLogin(credentials) {
  try {
    const response = await api.post('/auth/login', credentials);
    const userData = response.data;

    // Validate staff type before proceeding
    if (!isValidStaffType(userData.staffType)) {
      throw new Error(
        `Invalid staff type: ${userData.staffType}. ` +
        `Valid types are: ${getAvailableRoles().join(', ')}`
      );
    }

    // Get user's features
    const userFeatures = getRoleFeatures(userData.staffType);
    console.log(`User has access to ${userFeatures.length} features`);

    // Store user data and proceed
    setUser(userData);
    navigateToDashboard();
  } catch (error) {
    console.error('Login failed:', error.message);
    showError(error.message);
  }
}

// ============================================================================
// Example 7: Feature List Display
// ============================================================================

function FeatureListPage({ user }) {
  const features = getRoleFeaturesWithMetadata(user.staffType);

  return (
    <div className="feature-list">
      <h1>Your Features</h1>
      <p>As a {user.staffType}, you have access to:</p>

      <div className="features">
        {features.map(feature => (
          <div key={feature.id} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <a href={feature.route} className="feature-link">
              Open →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Example 8: Role Selector (for Admin/Testing)
// ============================================================================

function RoleSelector({ currentRole, onRoleChange }) {
  const roles = getAvailableRoles();

  return (
    <div className="role-selector">
      <label htmlFor="role">Select Role:</label>
      <select
        id="role"
        value={currentRole}
        onChange={(e) => onRoleChange(e.target.value)}
      >
        {roles.map(role => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <div className="role-info">
        <h4>Features for {currentRole}:</h4>
        <ul>
          {getRoleFeatures(currentRole).map(featureId => (
            <li key={featureId}>{featureId}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// Example 9: Bottom Navigation with Role-Based Items
// ============================================================================

function BottomNavigation({ user, currentRoute }) {
  // Define navigation items with their required feature access
  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠', route: '/', feature: null },
    { id: 'marks', label: 'Marks', icon: '📚', route: '/marks', feature: 'mark-lists' },
    { id: 'attendance', label: 'Attendance', icon: '✅', route: '/attendance', feature: 'attendance' },
    { id: 'fees', label: 'Fees', icon: '💰', route: '/fees', feature: 'fee-management' },
    { id: 'profile', label: 'Profile', icon: '👤', route: '/profile', feature: null }
  ];

  // Filter items based on user's role
  const visibleItems = navItems.filter(item => 
    !item.feature || hasFeatureAccess(user.staffType, item.feature)
  );

  return (
    <nav className="bottom-navigation">
      {visibleItems.map(item => (
        <a
          key={item.id}
          href={item.route}
          className={currentRoute === item.route ? 'active' : ''}
        >
          <span className="icon">{item.icon}</span>
          <span className="label">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

// ============================================================================
// Example 10: Feature Access Summary Component
// ============================================================================

function FeatureAccessSummary({ user }) {
  const allRoles = getAvailableRoles();
  const userFeatures = getRoleFeatures(user.staffType);

  return (
    <div className="access-summary">
      <h2>Access Summary</h2>
      
      <div className="current-role">
        <h3>Your Role: {user.staffType}</h3>
        <p>You have access to {userFeatures.length} features</p>
      </div>

      <div className="role-comparison">
        <h3>Role Comparison</h3>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Feature Count</th>
              <th>Features</th>
            </tr>
          </thead>
          <tbody>
            {allRoles.map(role => {
              const features = getRoleFeatures(role);
              return (
                <tr key={role} className={role === user.staffType ? 'current' : ''}>
                  <td>{role}</td>
                  <td>{features.length}</td>
                  <td>{features.join(', ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Example 11: Direct Access to ROLE_FEATURES Constant
// ============================================================================

function FeatureMatrix() {
  return (
    <div className="feature-matrix">
      <h2>Feature Access Matrix</h2>
      
      {Object.entries(ROLE_FEATURES).map(([role, features]) => (
        <div key={role} className="role-section">
          <h3>{role}</h3>
          <ul>
            {features.map(feature => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 12: Error Boundary with Role Validation
// ============================================================================

class RoleBasedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { user } = this.props;
    
    console.error('Error in role-based component:', {
      error,
      errorInfo,
      staffType: user?.staffType,
      isValidRole: user?.staffType ? isValidStaffType(user.staffType) : false,
      availableRoles: getAvailableRoles()
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>Please check your role permissions and try again.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Export examples for documentation
// ============================================================================

export {
  MarkListsButton,
  StaffDashboard,
  NavigationMenu,
  ProtectedFeature,
  useFeatureAccess,
  handleLogin,
  FeatureListPage,
  RoleSelector,
  BottomNavigation,
  FeatureAccessSummary,
  FeatureMatrix,
  RoleBasedErrorBoundary
};
