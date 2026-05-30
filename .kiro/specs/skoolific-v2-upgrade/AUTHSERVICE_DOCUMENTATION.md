# AuthService Documentation

**Date:** January 2025  
**Version:** 1.0.0  
**Spec:** Skoolific V2 Upgrade - Phase 7: Security Enhancements  
**Task:** 7.1.4 - Create AuthService class for mobile apps

---

## 📋 Overview

The **AuthService** is a reusable service class that provides secure credential management for all Skoolific V2 mobile applications. It wraps the `capacitor-secure-storage-plugin` to provide a clean, consistent API for storing and retrieving user credentials across Staff, Student, Guardian, and Super Admin mobile apps.

### Key Features

✅ **Secure Storage**: Uses platform-specific secure storage mechanisms
- Android: Android Keystore
- iOS: iOS Keychain
- Web: Encrypted localStorage (fallback)

✅ **Multi-Branch Support**: Stores username, password, and branch code together

✅ **Error Handling**: Comprehensive error handling with meaningful error messages

✅ **Type Safety**: Well-documented methods with JSDoc annotations

✅ **Reusability**: Identical implementation across all mobile apps

---

## 📁 File Locations

The AuthService has been created in all four mobile applications:

```
packages/
├── mobile-staff/
│   └── src/
│       └── services/
│           └── AuthService.js
├── mobile-student/
│   └── src/
│       └── services/
│           └── AuthService.js
├── mobile-guardian/
│   └── src/
│       └── services/
│           └── AuthService.js
└── mobile-super-admin/
    └── src/
        └── services/
            └── AuthService.js
```

---

## 🔧 API Reference

### Import

```javascript
import AuthService from './services/AuthService';
// or
import AuthService from '@/services/AuthService';
```

---

### Methods

#### 1. `saveCredentials(username, password, branchCode)`

Save user credentials securely to device storage.

**Parameters:**
- `username` (string, required): User's username
- `password` (string, required): User's password
- `branchCode` (string, required): Branch code for multi-branch support

**Returns:** `Promise<void>`

**Throws:** `Error` if storage operation fails or if any parameter is missing

**Example:**
```javascript
try {
  await AuthService.saveCredentials('john.doe', 'password123', 'ib3');
  console.log('Credentials saved successfully');
} catch (error) {
  console.error('Failed to save credentials:', error.message);
}
```

**Storage Format:**
```json
{
  "username": "john.doe",
  "password": "password123",
  "branchCode": "ib3",
  "savedAt": "2025-01-15T10:30:00.000Z"
}
```

---

#### 2. `getCredentials()`

Retrieve stored credentials from secure storage.

**Parameters:** None

**Returns:** `Promise<Object|null>`
- Returns credentials object if found
- Returns `null` if no credentials are stored

**Credentials Object:**
```javascript
{
  username: string,
  password: string,
  branchCode: string,
  savedAt: string (ISO 8601 timestamp)
}
```

**Example:**
```javascript
try {
  const credentials = await AuthService.getCredentials();
  
  if (credentials) {
    console.log('Username:', credentials.username);
    console.log('Branch Code:', credentials.branchCode);
    console.log('Saved At:', credentials.savedAt);
    // Use credentials for auto-login
  } else {
    console.log('No credentials found');
    // Show login screen
  }
} catch (error) {
  console.error('Failed to retrieve credentials:', error.message);
}
```

---

#### 3. `clearCredentials()`

Clear all stored credentials from secure storage.

**Parameters:** None

**Returns:** `Promise<void>`

**Throws:** `Error` if clear operation fails (except when key doesn't exist)

**Example:**
```javascript
try {
  await AuthService.clearCredentials();
  console.log('Credentials cleared successfully');
  // Redirect to login screen
} catch (error) {
  console.error('Failed to clear credentials:', error.message);
}
```

**Use Cases:**
- User logout
- Account switching
- Security requirement (e.g., after password change)

---

#### 4. `hasCredentials()`

Check if credentials are stored without retrieving them.

**Parameters:** None

**Returns:** `Promise<boolean>`
- `true` if credentials exist
- `false` if no credentials are stored or if an error occurs

**Example:**
```javascript
const hasCredentials = await AuthService.hasCredentials();

if (hasCredentials) {
  // Show auto-login option or proceed with auto-login
  console.log('Credentials found - enabling auto-login');
} else {
  // Show login form
  console.log('No credentials - showing login screen');
}
```

**Use Cases:**
- App initialization (decide whether to show login or auto-login)
- Settings screen (show "Remember Me" status)
- Conditional UI rendering

---

#### 5. `updatePassword(newPassword)`

Update only the password while keeping username and branch code unchanged.

**Parameters:**
- `newPassword` (string, required): New password to save

**Returns:** `Promise<void>`

**Throws:** `Error` if no credentials exist or if update fails

**Example:**
```javascript
try {
  await AuthService.updatePassword('newSecurePassword456');
  console.log('Password updated successfully');
} catch (error) {
  console.error('Failed to update password:', error.message);
}
```

**Use Cases:**
- Password change functionality
- Password reset flow
- Security updates

---

#### 6. `updateUsername(newUsername)`

Update only the username while keeping password and branch code unchanged.

**Parameters:**
- `newUsername` (string, required): New username to save

**Returns:** `Promise<void>`

**Throws:** `Error` if no credentials exist or if update fails

**Example:**
```javascript
try {
  await AuthService.updateUsername('jane.doe');
  console.log('Username updated successfully');
} catch (error) {
  console.error('Failed to update username:', error.message);
}
```

**Use Cases:**
- Username change functionality
- Profile updates

---

#### 7. `getUsername()`

Get only the username without retrieving the password.

**Parameters:** None

**Returns:** `Promise<string|null>`
- Returns username if found
- Returns `null` if no credentials are stored

**Example:**
```javascript
const username = await AuthService.getUsername();

if (username) {
  console.log('Current user:', username);
  // Display in UI
} else {
  console.log('No user logged in');
}
```

**Use Cases:**
- Display current user in UI
- Profile screen
- Settings screen
- Header/navigation bar

---

#### 8. `getBranchCode()`

Get only the branch code without retrieving the password.

**Parameters:** None

**Returns:** `Promise<string|null>`
- Returns branch code if found
- Returns `null` if no credentials are stored

**Example:**
```javascript
const branchCode = await AuthService.getBranchCode();

if (branchCode) {
  console.log('Current branch:', branchCode);
  // Display in UI or use for API calls
} else {
  console.log('No branch selected');
}
```

**Use Cases:**
- Display current branch in UI
- API request headers
- Branch-specific configuration

---

#### 9. `clearAllStorage()`

Clear ALL secure storage, including any other keys beyond credentials.

**Parameters:** None

**Returns:** `Promise<void>`

**Throws:** `Error` if clear operation fails

**⚠️ Warning:** This method removes ALL data from secure storage, not just credentials. Use with caution.

**Example:**
```javascript
try {
  await AuthService.clearAllStorage();
  console.log('All secure storage cleared');
} catch (error) {
  console.error('Failed to clear all storage:', error.message);
}
```

**Use Cases:**
- App reset
- Account deletion
- Troubleshooting storage issues
- Development/testing

---

## 💡 Usage Examples

### Example 1: Login with "Remember Me"

```javascript
import AuthService from '@/services/AuthService';

async function handleLogin(username, password, branchCode, rememberMe) {
  try {
    // Call your login API
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, branchCode })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();

    // If "Remember Me" is checked, save credentials
    if (rememberMe) {
      await AuthService.saveCredentials(username, password, branchCode);
      console.log('Credentials saved for auto-login');
    }

    // Navigate to home screen
    navigateToHome(data);
  } catch (error) {
    console.error('Login error:', error.message);
    showErrorMessage(error.message);
  }
}
```

---

### Example 2: Auto-Login on App Launch

```javascript
import AuthService from '@/services/AuthService';

async function initializeApp() {
  try {
    // Check if credentials exist
    const hasCredentials = await AuthService.hasCredentials();

    if (hasCredentials) {
      // Retrieve credentials
      const credentials = await AuthService.getCredentials();

      // Attempt auto-login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          branchCode: credentials.branchCode
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Auto-login successful');
        navigateToHome(data);
        return;
      } else {
        // Auto-login failed - clear invalid credentials
        await AuthService.clearCredentials();
        console.log('Auto-login failed - credentials cleared');
      }
    }

    // No credentials or auto-login failed - show login screen
    navigateToLogin();
  } catch (error) {
    console.error('App initialization error:', error.message);
    navigateToLogin();
  }
}
```

---

### Example 3: Logout

```javascript
import AuthService from '@/services/AuthService';

async function handleLogout() {
  try {
    // Call logout API (if needed)
    await fetch('/api/auth/logout', { method: 'POST' });

    // Clear stored credentials
    await AuthService.clearCredentials();

    // Clear any other app state
    clearAppState();

    // Navigate to login screen
    navigateToLogin();

    console.log('Logout successful');
  } catch (error) {
    console.error('Logout error:', error.message);
  }
}
```

---

### Example 4: Change Password

```javascript
import AuthService from '@/services/AuthService';

async function handlePasswordChange(currentPassword, newPassword) {
  try {
    // Get current credentials
    const credentials = await AuthService.getCredentials();

    if (!credentials) {
      throw new Error('No credentials found');
    }

    // Verify current password
    if (credentials.password !== currentPassword) {
      throw new Error('Current password is incorrect');
    }

    // Call password change API
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        currentPassword,
        newPassword
      })
    });

    if (!response.ok) {
      throw new Error('Password change failed');
    }

    // Update stored password
    await AuthService.updatePassword(newPassword);

    console.log('Password changed successfully');
    showSuccessMessage('Password updated');
  } catch (error) {
    console.error('Password change error:', error.message);
    showErrorMessage(error.message);
  }
}
```

---

### Example 5: Display Current User in UI

```javascript
import React, { useEffect, useState } from 'react';
import AuthService from '@/services/AuthService';

function ProfileHeader() {
  const [username, setUsername] = useState('');
  const [branchCode, setBranchCode] = useState('');

  useEffect(() => {
    async function loadUserInfo() {
      const user = await AuthService.getUsername();
      const branch = await AuthService.getBranchCode();

      setUsername(user || 'Guest');
      setBranchCode(branch || 'N/A');
    }

    loadUserInfo();
  }, []);

  return (
    <div className="profile-header">
      <h2>Welcome, {username}</h2>
      <p>Branch: {branchCode}</p>
    </div>
  );
}

export default ProfileHeader;
```

---

## 🔒 Security Considerations

### 1. Platform-Specific Security

**Android (Keystore):**
- Hardware-backed encryption on supported devices
- Keys stored in Android Keystore system
- Protected against root access
- Biometric authentication support

**iOS (Keychain):**
- Hardware-backed encryption (Secure Enclave)
- Keys stored in iOS Keychain
- Protected against jailbreak
- Face ID / Touch ID support

**Web (Fallback):**
- AES-256 encryption
- localStorage with encryption
- ⚠️ Less secure than native platforms
- Recommended for development only

### 2. Best Practices

✅ **DO:**
- Always use try-catch blocks when calling AuthService methods
- Clear credentials on logout
- Validate credentials before saving
- Use HTTPS for all API calls
- Implement token-based authentication alongside credential storage

❌ **DON'T:**
- Store credentials in plain text anywhere else
- Log passwords to console in production
- Share credentials between apps
- Store sensitive data beyond authentication credentials

### 3. Error Handling

Always handle errors gracefully:

```javascript
try {
  await AuthService.saveCredentials(username, password, branchCode);
} catch (error) {
  // Log error for debugging
  console.error('Storage error:', error);
  
  // Show user-friendly message
  showErrorMessage('Failed to save credentials. Please try again.');
  
  // Optionally, fall back to session-only login
  proceedWithoutRememberMe();
}
```

---

## 🧪 Testing

### Unit Test Example

```javascript
import AuthService from '@/services/AuthService';

describe('AuthService', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await AuthService.clearAllStorage();
  });

  test('should save and retrieve credentials', async () => {
    await AuthService.saveCredentials('testuser', 'testpass', 'tb1');
    
    const credentials = await AuthService.getCredentials();
    
    expect(credentials).not.toBeNull();
    expect(credentials.username).toBe('testuser');
    expect(credentials.password).toBe('testpass');
    expect(credentials.branchCode).toBe('tb1');
    expect(credentials.savedAt).toBeDefined();
  });

  test('should return null when no credentials exist', async () => {
    const credentials = await AuthService.getCredentials();
    expect(credentials).toBeNull();
  });

  test('should clear credentials', async () => {
    await AuthService.saveCredentials('testuser', 'testpass', 'tb1');
    await AuthService.clearCredentials();
    
    const credentials = await AuthService.getCredentials();
    expect(credentials).toBeNull();
  });

  test('should check if credentials exist', async () => {
    let hasCredentials = await AuthService.hasCredentials();
    expect(hasCredentials).toBe(false);

    await AuthService.saveCredentials('testuser', 'testpass', 'tb1');
    
    hasCredentials = await AuthService.hasCredentials();
    expect(hasCredentials).toBe(true);
  });

  test('should update password', async () => {
    await AuthService.saveCredentials('testuser', 'oldpass', 'tb1');
    await AuthService.updatePassword('newpass');
    
    const credentials = await AuthService.getCredentials();
    expect(credentials.password).toBe('newpass');
    expect(credentials.username).toBe('testuser');
    expect(credentials.branchCode).toBe('tb1');
  });

  test('should throw error when saving without required fields', async () => {
    await expect(
      AuthService.saveCredentials('', 'pass', 'tb1')
    ).rejects.toThrow('Username, password, and branch code are required');
  });
});
```

---

## 🚀 Integration with Login Components

### React Component Example

```javascript
import React, { useState, useEffect } from 'react';
import AuthService from '@/services/AuthService';

function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check for saved credentials on mount
  useEffect(() => {
    async function checkSavedCredentials() {
      const hasCredentials = await AuthService.hasCredentials();
      
      if (hasCredentials) {
        // Optionally pre-fill the form or auto-login
        const credentials = await AuthService.getCredentials();
        setUsername(credentials.username);
        setBranchCode(credentials.branchCode);
        setRememberMe(true);
      }
    }

    checkSavedCredentials();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, branchCode })
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();

      // Save credentials if "Remember Me" is checked
      if (rememberMe) {
        await AuthService.saveCredentials(username, password, branchCode);
      } else {
        // Clear any existing credentials if "Remember Me" is unchecked
        await AuthService.clearCredentials();
      }

      // Navigate to home
      navigateToHome(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="Branch Code"
        value={branchCode}
        onChange={(e) => setBranchCode(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <label>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        Remember Me
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

export default LoginScreen;
```

---

## 📊 Storage Keys Reference

The AuthService uses the following storage keys internally:

| Key | Purpose | Value Type |
|-----|---------|------------|
| `auth_credentials` | Main credentials storage | JSON string |
| `auth_username` | Reserved for future use | String |
| `auth_branch_code` | Reserved for future use | String |

**Note:** Currently, only `auth_credentials` is actively used. The other keys are reserved for potential future enhancements.

---

## 🔄 Migration from localStorage

If you have existing credentials stored in localStorage, migrate them to secure storage:

```javascript
async function migrateCredentials() {
  try {
    // Check if credentials exist in localStorage
    const oldCredentials = localStorage.getItem('credentials');
    
    if (oldCredentials) {
      const { username, password, branchCode } = JSON.parse(oldCredentials);
      
      // Save to secure storage
      await AuthService.saveCredentials(username, password, branchCode);
      
      // Remove from localStorage
      localStorage.removeItem('credentials');
      
      console.log('Credentials migrated to secure storage');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
```

---

## 📝 Changelog

### Version 1.0.0 (January 2025)
- ✅ Initial implementation
- ✅ Created AuthService for all 4 mobile apps
- ✅ Implemented all core methods
- ✅ Added comprehensive error handling
- ✅ Added JSDoc documentation
- ✅ Created usage examples

---

## 🎯 Success Criteria

✅ **All criteria met:**

1. ✅ AuthService class created for all mobile apps
2. ✅ All methods implemented with proper error handling
3. ✅ Service can be imported and used in React components
4. ✅ Documentation created
5. ✅ Supports username, password, and branch code storage
6. ✅ Provides type safety through JSDoc
7. ✅ Reusable across all mobile apps

---

## 🔗 Related Tasks

- **Task 7.1.1:** Implement JWT token generation ✅
- **Task 7.1.2:** Add token refresh mechanism ✅
- **Task 7.1.3:** Install secure storage plugin ✅
- **Task 7.1.4:** Create AuthService class ✅ (This task)
- **Task 7.1.5:** Implement saveCredentials() method (Next)
- **Task 7.1.6:** Implement getCredentials() method (Next)

---

## 📚 Additional Resources

- [Capacitor Secure Storage Plugin](https://github.com/martinkasa/capacitor-secure-storage-plugin)
- [Android Keystore System](https://developer.android.com/training/articles/keystore)
- [iOS Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [Capacitor Documentation](https://capacitorjs.com/docs)

---

**Status:** ✅ **TASK COMPLETED**  
**Next Task:** 7.1.5 - Implement saveCredentials() method (already included in AuthService)

---

*AuthService created and documented for all mobile applications - January 2025*
