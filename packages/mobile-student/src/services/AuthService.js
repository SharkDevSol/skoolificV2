/**
 * AuthService - Secure credential management for mobile applications
 * 
 * This service wraps the capacitor-secure-storage-plugin to provide
 * a clean API for managing user credentials across all mobile apps.
 * 
 * Features:
 * - Secure storage using platform-specific secure storage (Android Keystore, iOS Keychain)
 * - Support for username, password, and branch code
 * - Error handling and type safety
 * - Reusable across Staff, Student, Guardian, and Super Admin apps
 * 
 * @module AuthService
 */

import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

/**
 * Storage keys used by the AuthService
 */
const STORAGE_KEYS = {
  CREDENTIALS: 'auth_credentials',
  USERNAME: 'auth_username',
  BRANCH_CODE: 'auth_branch_code',
};

/**
 * AuthService class for managing secure credential storage
 */
class AuthService {
  /**
   * Save user credentials securely
   * 
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @param {string} branchCode - Branch code for multi-branch support
   * @returns {Promise<void>}
   * @throws {Error} If storage operation fails
   * 
   * @example
   * await AuthService.saveCredentials('john.doe', 'password123', 'ib3');
   */
  static async saveCredentials(username, password, branchCode) {
    try {
      // Validate inputs
      if (!username || !password || !branchCode) {
        throw new Error('Username, password, and branch code are required');
      }

      // Store credentials as a single JSON object
      const credentials = {
        username: username.trim(),
        password: password,
        branchCode: branchCode.trim(),
        savedAt: new Date().toISOString(),
      };

      await SecureStoragePlugin.set({
        key: STORAGE_KEYS.CREDENTIALS,
        value: JSON.stringify(credentials),
      });

      console.log('Credentials saved successfully');
    } catch (error) {
      console.error('Failed to save credentials:', error);
      throw new Error(`Failed to save credentials: ${error.message}`);
    }
  }

  /**
   * Retrieve stored credentials
   * 
   * @returns {Promise<{username: string, password: string, branchCode: string, savedAt: string}|null>}
   * Returns credentials object or null if no credentials are stored
   * 
   * @example
   * const credentials = await AuthService.getCredentials();
   * if (credentials) {
   *   console.log('Username:', credentials.username);
   * }
   */
  static async getCredentials() {
    try {
      const result = await SecureStoragePlugin.get({
        key: STORAGE_KEYS.CREDENTIALS,
      });

      if (!result || !result.value) {
        return null;
      }

      const credentials = JSON.parse(result.value);
      return credentials;
    } catch (error) {
      // If key doesn't exist, return null instead of throwing
      if (error.message && error.message.includes('not found')) {
        return null;
      }

      console.error('Failed to retrieve credentials:', error);
      throw new Error(`Failed to retrieve credentials: ${error.message}`);
    }
  }

  /**
   * Clear all stored credentials
   * 
   * @returns {Promise<void>}
   * @throws {Error} If clear operation fails
   * 
   * @example
   * await AuthService.clearCredentials();
   */
  static async clearCredentials() {
    try {
      await SecureStoragePlugin.remove({
        key: STORAGE_KEYS.CREDENTIALS,
      });

      console.log('Credentials cleared successfully');
    } catch (error) {
      // If key doesn't exist, consider it a success
      if (error.message && error.message.includes('not found')) {
        console.log('No credentials to clear');
        return;
      }

      console.error('Failed to clear credentials:', error);
      throw new Error(`Failed to clear credentials: ${error.message}`);
    }
  }

  /**
   * Check if credentials are stored
   * 
   * @returns {Promise<boolean>} True if credentials exist, false otherwise
   * 
   * @example
   * const hasCredentials = await AuthService.hasCredentials();
   * if (hasCredentials) {
   *   // Auto-login logic
   * }
   */
  static async hasCredentials() {
    try {
      const credentials = await this.getCredentials();
      return credentials !== null;
    } catch (error) {
      console.error('Failed to check credentials:', error);
      return false;
    }
  }

  /**
   * Update only the password (keep username and branch code)
   * 
   * @param {string} newPassword - New password to save
   * @returns {Promise<void>}
   * @throws {Error} If no credentials exist or update fails
   * 
   * @example
   * await AuthService.updatePassword('newPassword123');
   */
  static async updatePassword(newPassword) {
    try {
      const credentials = await this.getCredentials();

      if (!credentials) {
        throw new Error('No credentials found to update');
      }

      await this.saveCredentials(
        credentials.username,
        newPassword,
        credentials.branchCode
      );

      console.log('Password updated successfully');
    } catch (error) {
      console.error('Failed to update password:', error);
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Update only the username (keep password and branch code)
   * 
   * @param {string} newUsername - New username to save
   * @returns {Promise<void>}
   * @throws {Error} If no credentials exist or update fails
   * 
   * @example
   * await AuthService.updateUsername('jane.doe');
   */
  static async updateUsername(newUsername) {
    try {
      const credentials = await this.getCredentials();

      if (!credentials) {
        throw new Error('No credentials found to update');
      }

      await this.saveCredentials(
        newUsername,
        credentials.password,
        credentials.branchCode
      );

      console.log('Username updated successfully');
    } catch (error) {
      console.error('Failed to update username:', error);
      throw new Error(`Failed to update username: ${error.message}`);
    }
  }

  /**
   * Get only the username (without password)
   * Useful for displaying current user without exposing password
   * 
   * @returns {Promise<string|null>} Username or null if not found
   * 
   * @example
   * const username = await AuthService.getUsername();
   */
  static async getUsername() {
    try {
      const credentials = await this.getCredentials();
      return credentials ? credentials.username : null;
    } catch (error) {
      console.error('Failed to get username:', error);
      return null;
    }
  }

  /**
   * Get only the branch code (without password)
   * Useful for displaying current branch without exposing password
   * 
   * @returns {Promise<string|null>} Branch code or null if not found
   * 
   * @example
   * const branchCode = await AuthService.getBranchCode();
   */
  static async getBranchCode() {
    try {
      const credentials = await this.getCredentials();
      return credentials ? credentials.branchCode : null;
    } catch (error) {
      console.error('Failed to get branch code:', error);
      return null;
    }
  }

  /**
   * Clear all secure storage (including any other keys)
   * Use with caution - this will remove ALL stored data
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await AuthService.clearAllStorage();
   */
  static async clearAllStorage() {
    try {
      await SecureStoragePlugin.clear();
      console.log('All secure storage cleared');
    } catch (error) {
      console.error('Failed to clear all storage:', error);
      throw new Error(`Failed to clear all storage: ${error.message}`);
    }
  }

  /**
   * Automatically login user if valid credentials exist
   * This method should be called on app initialization
   * 
   * @param {Function} loginCallback - Callback function to perform actual login with backend API
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   * 
   * @example
   * // In App.jsx or main component
   * useEffect(() => {
   *   const initializeApp = async () => {
   *     const result = await AuthService.autoLogin(async (credentials) => {
   *       // Call your backend API login endpoint
   *       const response = await fetch('https://api.example.com/auth/login', {
   *         method: 'POST',
   *         headers: { 'Content-Type': 'application/json' },
   *         body: JSON.stringify({
   *           username: credentials.username,
   *           password: credentials.password,
   *           branchCode: credentials.branchCode
   *         })
   *       });
   *       
   *       if (!response.ok) {
   *         throw new Error('Login failed');
   *       }
   *       
   *       return await response.json();
   *     });
   *     
   *     if (result.success) {
   *       // Navigate to home screen
   *       console.log('Auto-login successful:', result.user);
   *     } else {
   *       // Show login screen
   *       console.log('Auto-login failed:', result.error);
   *     }
   *   };
   *   
   *   initializeApp();
   * }, []);
   */
  static async autoLogin(loginCallback) {
    try {
      // Check if credentials exist
      const hasCredentials = await this.hasCredentials();
      
      if (!hasCredentials) {
        console.log('No stored credentials found');
        return {
          success: false,
          error: 'No stored credentials'
        };
      }

      // Retrieve stored credentials
      const credentials = await this.getCredentials();
      
      if (!credentials) {
        console.log('Failed to retrieve credentials');
        return {
          success: false,
          error: 'Failed to retrieve credentials'
        };
      }

      console.log('Attempting auto-login for user:', credentials.username);

      // Attempt login with backend API using provided callback
      try {
        const user = await loginCallback(credentials);
        
        console.log('Auto-login successful');
        return {
          success: true,
          user: user
        };
      } catch (loginError) {
        console.error('Auto-login failed - invalid credentials:', loginError);
        
        // Clear invalid credentials
        await this.clearCredentials();
        
        return {
          success: false,
          error: 'Invalid credentials - cleared from storage'
        };
      }
    } catch (error) {
      console.error('Auto-login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default AuthService;
