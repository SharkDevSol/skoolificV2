# Authentication Fix Guide

## Problem Summary

You're experiencing **403 Forbidden** errors with the message "Access denied: Invalid or expired token" on all API requests. This means your authentication token is either:

1. Missing
2. Invalid
3. Expired
4. Generated with a different JWT secret

## Root Cause

The most likely cause is that you have an **old/invalid token** stored in your browser's localStorage that was generated with a different JWT_SECRET or has expired.

## Solution

### Option 1: Use the Fix Tool (Recommended)

1. Open your browser and navigate to: `http://localhost:5052/fix-auth.html`
2. Click "Run Diagnostics" to see your current authentication state
3. Click "Clear Auth & Go to Login" to clear all authentication data
4. Log in again with your credentials

### Option 2: Manual Fix

1. Open your browser's Developer Tools (F12)
2. Go to the "Application" or "Storage" tab
3. Find "Local Storage" → `http://localhost:5052`
4. Delete these keys:
   - `authToken`
   - `isLoggedIn`
   - `adminUser`
   - `staffUser`
   - `userType`
   - `staffProfile`
   - `userPermissions`
5. Refresh the page and log in again

### Option 3: Clear All Browser Data

1. In your browser, press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cookies and other site data" and "Cached images and files"
3. Choose "All time" as the time range
4. Click "Clear data"
5. Navigate to `http://localhost:5052/login` and log in again

## What Was Fixed

### 1. Enhanced Error Handling in API Interceptor

**File:** `APP/src/utils/api.js`

- Added a `isRedirecting` flag to prevent multiple simultaneous redirects
- Enhanced 403 error handling to detect token-related issues
- Improved error messages and logging
- Automatic cleanup of all auth-related localStorage items on token errors

### 2. Token Validation in Protected Routes

**File:** `APP/src/COMPONENTS/ProtectedRoute.jsx`

- Added automatic token validation on route access
- Validates token with backend before allowing access
- Shows loading state during validation
- Automatically clears invalid tokens and redirects to login

### 3. Created Authentication Fix Tool

**File:** `APP/fix-auth.html`

- Standalone diagnostic tool to check authentication state
- Visual interface to see all localStorage auth data
- One-click solution to clear auth and redirect to login
- No dependencies - works even if the main app is broken

## How to Prevent This in the Future

### For Development

1. **Don't change JWT_SECRET** in `.env` file once you've started using it
2. **Clear localStorage** when switching between different backend instances
3. **Use consistent JWT_SECRET** across all environments

### For Production

1. **Set a strong JWT_SECRET** before deploying
2. **Never change JWT_SECRET** in production (will invalidate all user sessions)
3. **Implement token refresh** mechanism for long-lived sessions
4. **Set appropriate token expiration** (currently 24h)

## Testing the Fix

1. Clear your browser's localStorage (use the fix tool or manual method)
2. Navigate to `http://localhost:5052/login`
3. Log in with your credentials:
   - Branch Code: Your branch code (e.g., MAI, AMA, SOL)
   - Username: Your admin username
   - Password: Your password
4. After successful login, you should be redirected to the dashboard
5. All API requests should now work without 403 errors

## Manifest Warnings (Bonus Fix)

The warnings about manifest properties being invalid are harmless and come from the Content Security Policy allowing blob: URLs for manifests. These don't affect functionality but if you want to remove them:

**File:** `APP/index.html`

Change this line:
```html
manifest-src 'self' blob:;
```

To:
```html
manifest-src 'self';
```

## Backend Configuration

Your backend is correctly configured with:
- JWT_SECRET: Set in `.env` file
- Token expiration: 24 hours
- Authentication middleware: Working correctly

## Summary

The issue is **not with your code** - it's with **stale authentication data** in your browser. Simply clearing the localStorage and logging in again will fix all the 403 errors.

The enhancements made to the code will:
1. Automatically detect and clear invalid tokens
2. Provide better error messages
3. Prevent the repeated 403 errors from cluttering your console
4. Give you tools to diagnose and fix auth issues quickly

## Need More Help?

If you're still experiencing issues after following this guide:

1. Check that your backend server is running on `http://localhost:3000`
2. Verify the JWT_SECRET in `backend/.env` matches what was used to generate your token
3. Check the browser console for any additional error messages
4. Try the fix tool at `http://localhost:5052/fix-auth.html`
