# Services Directory

This directory contains reusable service classes for the Skoolific Guardian Mobile App.

## Available Services

### AuthService

Secure credential management service that wraps the capacitor-secure-storage-plugin.

**Import:**
```javascript
import AuthService from './services/AuthService';
```

**Quick Start:**

```javascript
// Save credentials (on login with "Remember Me")
await AuthService.saveCredentials('username', 'password', 'branchCode');

// Check if credentials exist (on app launch)
const hasCredentials = await AuthService.hasCredentials();

// Get credentials (for auto-login)
const credentials = await AuthService.getCredentials();

// Clear credentials (on logout)
await AuthService.clearCredentials();
```

**Full Documentation:**
See `.kiro/specs/skoolific-v2-upgrade/AUTHSERVICE_DOCUMENTATION.md` for complete API reference and examples.

## Security Notes

- All credentials are stored using platform-specific secure storage
- Android: Android Keystore
- iOS: iOS Keychain
- Always use try-catch blocks when calling service methods
- Never log passwords in production

## Adding New Services

When adding new services to this directory:

1. Create a new file with a descriptive name (e.g., `WardService.js`)
2. Export a class or object with static methods
3. Add comprehensive JSDoc comments
4. Update this README with usage examples
5. Add unit tests if applicable
