/**
 * AuthContext - Authentication state management
 * 
 * Provides authentication state and methods throughout the app.
 * Integrates with AuthService for secure credential storage.
 * 
 * @module AuthContext
 */

import { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../services/AuthService';

/**
 * Authentication Context
 */
const AuthContext = createContext(null);

/**
 * Hook to access authentication context
 * @returns {Object} Authentication context value
 * @throws {Error} If used outside AuthProvider
 * 
 * @example
 * function MyComponent() {
 *   const { user, login, logout, isAuthenticated } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <LoginScreen />;
 *   }
 *   
 *   return <div>Welcome, {user.username}!</div>;
 * }
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * AuthProvider Component
 * 
 * Wraps the app to provide authentication state and methods.
 * Handles auto-login on app initialization.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} [props.apiBaseUrl] - Base URL for authentication API
 * 
 * @example
 * // In main.jsx or App.jsx
 * import { AuthProvider } from './context/AuthContext';
 * 
 * function App() {
 *   return (
 *     <AuthProvider apiBaseUrl="https://api.skoolific.com">
 *       <MainApp />
 *     </AuthProvider>
 *   );
 * }
 */
export function AuthProvider({ children, apiBaseUrl = 'http://localhost:3000' }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Initialize app and attempt auto-login
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Initialize authentication state
   */
  async function initializeAuth() {
    try {
      setIsLoading(true);

      // Attempt auto-login with stored credentials
      const result = await AuthService.autoLogin(async (credentials) => {
        // Call backend API to validate credentials
        const response = await fetch(`${apiBaseUrl}/api/v2/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
            branchCode: credentials.branchCode,
          }),
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        return data.user;
      });

      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        console.log('Auto-login successful');
      } else {
        console.log('No valid credentials found');
      }
    } catch (error) {
      console.error('Auto-login error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Login user with credentials
   * 
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @param {string} branchCode - Branch code
   * @param {boolean} [rememberMe=true] - Whether to save credentials
   * @returns {Promise<{success: boolean, error?: string}>}
   * 
   * @example
   * const { login } = useAuth();
   * 
   * async function handleLogin(username, password, branchCode) {
   *   const result = await login(username, password, branchCode);
   *   
   *   if (result.success) {
   *     // Navigate to home
   *   } else {
   *     // Show error
   *     alert(result.error);
   *   }
   * }
   */
  async function login(username, password, branchCode, rememberMe = true) {
    try {
      setIsLoading(true);

      // Call backend API
      const response = await fetch(`${apiBaseUrl}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          branchCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();

      // Save credentials if remember me is enabled
      if (rememberMe) {
        await AuthService.saveCredentials(username, password, branchCode);
      }

      // Update state
      setUser(data.user);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed. Please try again.',
      };
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Logout user and clear credentials
   * 
   * @param {boolean} [clearCredentials=true] - Whether to clear saved credentials
   * @returns {Promise<void>}
   * 
   * @example
   * const { logout } = useAuth();
   * 
   * async function handleLogout() {
   *   await logout();
   *   // Navigate to login screen
   * }
   */
  async function logout(clearCredentials = true) {
    try {
      setIsLoading(true);

      // Clear saved credentials if requested
      if (clearCredentials) {
        await AuthService.clearCredentials();
      }

      // Clear state
      setUser(null);
      setIsAuthenticated(false);

      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Update user password
   * 
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function updatePassword(currentPassword, newPassword) {
    try {
      setIsLoading(true);

      // Call backend API to update password
      const response = await fetch(`${apiBaseUrl}/api/v2/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          currentPassword,
          newPassword,
          branchCode: user.branchCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password update failed');
      }

      // Update stored credentials
      await AuthService.updatePassword(newPassword);

      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        error: error.message || 'Password update failed. Please try again.',
      };
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Update username
   * 
   * @param {string} newUsername - New username
   * @param {string} password - Current password for verification
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function updateUsername(newUsername, password) {
    try {
      setIsLoading(true);

      // Call backend API to update username
      const response = await fetch(`${apiBaseUrl}/api/v2/auth/update-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUsername: user.username,
          newUsername,
          password,
          branchCode: user.branchCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Username update failed');
      }

      const data = await response.json();

      // Update stored credentials
      await AuthService.updateUsername(newUsername);

      // Update user state
      setUser({ ...user, username: newUsername });

      return { success: true };
    } catch (error) {
      console.error('Username update error:', error);
      return {
        success: false,
        error: error.message || 'Username update failed. Please try again.',
      };
    } finally {
      setIsLoading(false);
    }
  }

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updatePassword,
    updateUsername,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
