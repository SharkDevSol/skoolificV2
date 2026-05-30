/**
 * RoleBasedNavigation Component
 * 
 * A mobile-optimized navigation component that dynamically displays navigation items
 * based on the logged-in user's staff role type (Teacher, Administrative, Supportive).
 * 
 * Features:
 * - Bottom navigation bar (mobile-friendly)
 * - Dynamic feature filtering based on role
 * - Active route highlighting
 * - Icon-based navigation with labels
 * - Integrates with authentication context
 * - Uses ROLE_FEATURES mapping from roleFeatures.js
 * 
 * @module RoleBasedNavigation
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { getRoleFeaturesWithMetadata } from '../config/roleFeatures';
import './RoleBasedNavigation.css';

/**
 * RoleBasedNavigation Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - Current authenticated user object
 * @param {string} props.user.staffType - Staff role type (Teacher, Administrative, Supportive)
 * @param {string} props.user.username - User's username
 * @param {boolean} [props.showHome=true] - Whether to show home navigation item
 * @param {boolean} [props.showProfile=true] - Whether to show profile navigation item
 * @param {Function} [props.onNavigate] - Optional callback when navigation occurs
 * 
 * @example
 * // Basic usage with authentication context
 * import { useAuth } from '../context/AuthContext';
 * 
 * function App() {
 *   const { user } = useAuth();
 *   
 *   return (
 *     <div>
 *       <MainContent />
 *       <RoleBasedNavigation user={user} />
 *     </div>
 *   );
 * }
 * 
 * @example
 * // With custom navigation callback
 * <RoleBasedNavigation 
 *   user={user} 
 *   onNavigate={(route) => console.log('Navigating to:', route)}
 * />
 */
function RoleBasedNavigation({ 
  user, 
  showHome = true, 
  showProfile = true,
  onNavigate 
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Validate user object
  if (!user || !user.staffType) {
    console.warn('RoleBasedNavigation: Invalid user object provided');
    return null;
  }

  // Get features accessible to the user's role with metadata
  const roleFeatures = getRoleFeaturesWithMetadata(user.staffType);

  // Build navigation items array
  const navigationItems = [];

  // Add home item if enabled
  if (showHome) {
    navigationItems.push({
      id: 'home',
      title: 'Home',
      icon: '🏠',
      route: '/',
      description: 'Dashboard and overview',
      feature: null // Always accessible
    });
  }

  // Add role-based feature items
  roleFeatures.forEach(feature => {
    navigationItems.push({
      id: feature.id,
      title: feature.title,
      icon: feature.icon,
      route: feature.route,
      description: feature.description,
      feature: feature.id
    });
  });

  // Add profile item if enabled
  if (showProfile) {
    navigationItems.push({
      id: 'profile',
      title: 'Profile',
      icon: '👤',
      route: '/profile',
      description: 'User settings and profile',
      feature: null // Always accessible
    });
  }

  /**
   * Handle navigation item click
   * @param {string} route - Route to navigate to
   * @param {string} itemId - Navigation item ID
   */
  const handleNavigate = (route, itemId) => {
    // Call optional callback
    if (onNavigate) {
      onNavigate(route, itemId);
    }

    // Navigate to route
    navigate(route);
  };

  /**
   * Check if a route is currently active
   * @param {string} route - Route to check
   * @returns {boolean} True if route is active
   */
  const isActive = (route) => {
    if (route === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(route);
  };

  // Limit navigation items to 5 for mobile bottom navigation
  // If more than 5 items, prioritize most important features
  const displayItems = navigationItems.slice(0, 5);

  if (navigationItems.length > 5) {
    console.warn(
      `RoleBasedNavigation: ${navigationItems.length} items available, showing first 5. ` +
      'Consider implementing a drawer or menu for additional items.'
    );
  }

  return (
    <nav className="role-based-navigation" role="navigation" aria-label="Main navigation">
      <div className="navigation-container">
        {displayItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${isActive(item.route) ? 'active' : ''}`}
            onClick={() => handleNavigate(item.route, item.id)}
            aria-label={item.description}
            aria-current={isActive(item.route) ? 'page' : undefined}
          >
            <span className="nav-icon" role="img" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-label">{item.title}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default RoleBasedNavigation;
