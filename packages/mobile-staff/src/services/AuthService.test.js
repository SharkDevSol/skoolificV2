/**
 * Unit tests for AuthService autoLogin() method
 * 
 * These tests verify the autoLogin functionality works correctly
 * in various scenarios.
 */

import AuthService from './AuthService';

// Mock the SecureStoragePlugin
jest.mock('capacitor-secure-storage-plugin', () => ({
  SecureStoragePlugin: {
    set: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
}));

import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

describe('AuthService.autoLogin()', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clear console logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console
    console.log.mockRestore();
    console.error.mockRestore();
  });

  test('should return success false when no credentials are stored', async () => {
    // Mock no credentials found
    SecureStoragePlugin.get.mockRejectedValue(new Error('Key not found'));

    const result = await AuthService.autoLogin(async () => {});

    expect(result).toEqual({
      success: false,
      error: 'No stored credentials',
    });
  });

  test('should return success false when credentials retrieval fails', async () => {
    // Mock hasCredentials returns true but getCredentials returns null
    SecureStoragePlugin.get
      .mockResolvedValueOnce({ value: JSON.stringify({ username: 'test' }) }) // hasCredentials
      .mockResolvedValueOnce({ value: null }); // getCredentials

    const result = await AuthService.autoLogin(async () => {});

    expect(result).toEqual({
      success: false,
      error: 'Failed to retrieve credentials',
    });
  });

  test('should return success true when login succeeds', async () => {
    const mockCredentials = {
      username: 'john.doe',
      password: 'password123',
      branchCode: 'ib3',
      savedAt: new Date().toISOString(),
    };

    const mockUser = {
      id: 1,
      username: 'john.doe',
      role: 'teacher',
    };

    // Mock credentials exist
    SecureStoragePlugin.get.mockResolvedValue({
      value: JSON.stringify(mockCredentials),
    });

    // Mock successful login
    const loginCallback = jest.fn().mockResolvedValue(mockUser);

    const result = await AuthService.autoLogin(loginCallback);

    expect(loginCallback).toHaveBeenCalledWith(mockCredentials);
    expect(result).toEqual({
      success: true,
      user: mockUser,
    });
  });

  test('should clear credentials and return error when login fails', async () => {
    const mockCredentials = {
      username: 'john.doe',
      password: 'wrongpassword',
      branchCode: 'ib3',
      savedAt: new Date().toISOString(),
    };

    // Mock credentials exist
    SecureStoragePlugin.get.mockResolvedValue({
      value: JSON.stringify(mockCredentials),
    });

    // Mock failed login
    const loginCallback = jest.fn().mockRejectedValue(new Error('Invalid credentials'));

    const result = await AuthService.autoLogin(loginCallback);

    expect(loginCallback).toHaveBeenCalledWith(mockCredentials);
    expect(SecureStoragePlugin.remove).toHaveBeenCalledWith({
      key: 'auth_credentials',
    });
    expect(result).toEqual({
      success: false,
      error: 'Invalid credentials - cleared from storage',
    });
  });

  test('should handle network errors gracefully', async () => {
    const mockCredentials = {
      username: 'john.doe',
      password: 'password123',
      branchCode: 'ib3',
      savedAt: new Date().toISOString(),
    };

    // Mock credentials exist
    SecureStoragePlugin.get.mockResolvedValue({
      value: JSON.stringify(mockCredentials),
    });

    // Mock network error
    const loginCallback = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await AuthService.autoLogin(loginCallback);

    expect(result).toEqual({
      success: false,
      error: 'Invalid credentials - cleared from storage',
    });
  });

  test('should log appropriate messages during auto-login', async () => {
    const mockCredentials = {
      username: 'john.doe',
      password: 'password123',
      branchCode: 'ib3',
      savedAt: new Date().toISOString(),
    };

    const mockUser = { id: 1, username: 'john.doe' };

    SecureStoragePlugin.get.mockResolvedValue({
      value: JSON.stringify(mockCredentials),
    });

    const loginCallback = jest.fn().mockResolvedValue(mockUser);

    await AuthService.autoLogin(loginCallback);

    expect(console.log).toHaveBeenCalledWith(
      'Attempting auto-login for user:',
      'john.doe'
    );
    expect(console.log).toHaveBeenCalledWith('Auto-login successful');
  });

  test('should handle unexpected errors', async () => {
    // Mock unexpected error during hasCredentials
    SecureStoragePlugin.get.mockRejectedValue(new Error('Unexpected error'));

    const result = await AuthService.autoLogin(async () => {});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
