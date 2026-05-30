# Protected Routes Implementation

## Overview

This document describes the implementation of role-based access control for the mark lists feature and other protected routes in the Skoolific Staff mobile application.

## Task 7.2.3: Show Mark Lists Only for Teacher Role

### Implementation Summary

The mark lists feature has been protected using role-based access control to ensure only users with the Teacher role can access it.

### Components Created

#### 1. ProtectedRoute Component
**Location:** `packages/mobile-staff/src/components/ProtectedRoute.jsx`

A reusable route wrapper component that:
- Checks if a user has access to a specific feature using `hasFeatureAccess()` from `roleFeatures.js`
- Displays an access denied page for unauthorized users
- Supports custom redirect behavior
- Integrates seamlessly with React Router

**Usage Example:**
```jsx
<Route 
  path="/marks" 
  element={
    <ProtectedRoute user={user} featureId="mark-lists">
      <MarkListsPage />
    </ProtectedRoute>
  } 
/>
```

#### 2. AccessDeniedPage Component
**Location:** `packages/mobile-staff/src/components/ProtectedRoute.jsx`

A user-friendly access denied page that:
- Displays clear error messages
- Shows the user's current role
- Provides navigation options (Go Back, Go to Home)
- Includes helpful guidance for users
- Supports dark mode

#### 3. MarkListsPage Component
**Location:** `packages/mobile-staff/src/pages/MarkListsPage.jsx`

The actual mark lists page that teachers can access, featuring:
- Clean, mobile-optimized UI
- Feature overview cards
- Action buttons for creating and viewing mark lists
- Responsive design for various screen sizes

### Files Modified

1. **`packages/mobile-staff/src/components/index.js`**
   - Added export for `ProtectedRoute` and `AccessDeniedPage`

### Files Created

1. **`packages/mobile-staff/src/components/ProtectedRoute.jsx`**
   - Main protected route component with access control logic

2. **`packages/mobile-staff/src/components/ProtectedRoute.css`**
   - Styles for access denied page with mobile-first design

3. **`packages/mobile-staff/src/components/ProtectedRoute.test.jsx`**
   - Comprehensive test suite for protected routes

4. **`packages/mobile-staff/src/pages/MarkListsPage.jsx`**
   - Mark lists page component for teachers

5. **`packages/mobile-staff/src/pages/MarkListsPage.css`**
   - Styles for mark lists page

6. **`packages/mobile-staff/src/App.protected.jsx`**
   - Example App component showing how to integrate protected routes

## How It Works

### Access Control Flow

1. **User Authentication**
   - User logs in with username, password, and branch code
   - Authentication context stores user object with `staffType` property

2. **Route Protection**
   - When user navigates to `/marks`, the `ProtectedRoute` wrapper is triggered
   - `ProtectedRoute` calls `hasFeatureAccess(user.staffType, 'mark-lists')`
   - Function checks if user's role has the feature in `ROLE_FEATURES` mapping

3. **Access Decision**
   - **If access granted:** Render the `MarkListsPage` component
   - **If access denied:** Display `AccessDeniedPage` with appropriate message

### Role-Based Access Matrix

| Feature ID | Teacher | Administrative | Supportive |
|-----------|---------|----------------|------------|
| mark-lists | ✅ | ❌ | ❌ |
| attendance | ✅ | ❌ | ❌ |
| exam-creation | ✅ | ❌ | ❌ |
| fee-management | ❌ | ✅ | ❌ |
| student-registration | ❌ | ✅ | ❌ |
| attendance-view | ❌ | ❌ | ✅ |

## Integration Guide

### Step 1: Update main.jsx

Wrap your App component with BrowserRouter:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

### Step 2: Update App.jsx

Replace your current App.jsx with the protected routes version:

```jsx
import { ProtectedRoute } from './components';
import MarkListsPage from './pages/MarkListsPage';

// In your Routes component:
<Route 
  path="/marks" 
  element={
    <ProtectedRoute user={user} featureId="mark-lists">
      <MarkListsPage />
    </ProtectedRoute>
  } 
/>
```

### Step 3: Protect Other Routes

Apply the same pattern to other role-specific features:

```jsx
// Teacher-only routes
<Route 
  path="/attendance" 
  element={
    <ProtectedRoute user={user} featureId="attendance">
      <AttendancePage />
    </ProtectedRoute>
  } 
/>

// Administrative-only routes
<Route 
  path="/fees" 
  element={
    <ProtectedRoute user={user} featureId="fee-management">
      <FeeManagementPage />
    </ProtectedRoute>
  } 
/>
```

## Testing

### Running Tests

```bash
npm test -- ProtectedRoute.test.jsx
```

### Test Coverage

The test suite covers:
- ✅ Access granted for authorized users
- ✅ Access denied for unauthorized users
- ✅ Invalid user object handling
- ✅ Role-specific access for Teacher, Administrative, and Supportive roles
- ✅ Requirement 23.9 validation (mark lists Teacher-only access)
- ✅ AccessDeniedPage rendering and functionality

## Requirements Satisfied

### Requirement 23.9 (from requirements.md)
> WHEN a teacher logs into Staff_App, THE System SHALL display teacher-specific features (mark lists, class management, exam creation)

**Implementation:**
- ✅ Mark lists feature protected with `ProtectedRoute`
- ✅ Only Teacher role has access to `mark-lists` feature
- ✅ Navigation already filtered by `RoleBasedNavigation` component
- ✅ Route protection prevents direct URL access
- ✅ Access denied page displays for unauthorized attempts

### Task 7.2.3 Requirements
1. ✅ Use `hasFeatureAccess()` function from roleFeatures.js
2. ✅ Hide mark lists navigation item for non-Teacher roles (handled by RoleBasedNavigation)
3. ✅ Protect mark lists route with role-based access control
4. ✅ Display appropriate error/access denied message
5. ✅ Ensure mark lists feature only visible and accessible to Teacher role

## Security Considerations

### Defense in Depth

The implementation provides multiple layers of security:

1. **Navigation Layer:** `RoleBasedNavigation` hides unauthorized features from UI
2. **Route Layer:** `ProtectedRoute` prevents access even if user knows the URL
3. **Backend Layer:** API endpoints should also validate user permissions (not implemented in this task)

### Best Practices

- ✅ Client-side validation for UX
- ✅ Clear error messages without exposing system details
- ✅ Graceful degradation for invalid user states
- ⚠️ Backend validation required for production security

## Future Enhancements

1. **Backend Integration**
   - Add API-level permission checks
   - Implement JWT token validation with role claims

2. **Enhanced UX**
   - Add loading states during permission checks
   - Implement permission caching for performance

3. **Audit Logging**
   - Log unauthorized access attempts
   - Track feature usage by role

4. **Dynamic Permissions**
   - Support custom role definitions
   - Allow admin to modify role permissions

## Troubleshooting

### Issue: Access denied page not showing
**Solution:** Ensure `BrowserRouter` is wrapping your App component in main.jsx

### Issue: All users can access mark lists
**Solution:** Verify user object has correct `staffType` property from authentication

### Issue: Navigation shows mark lists for non-teachers
**Solution:** Check `RoleBasedNavigation` is using the correct user object

## References

- **Design Document:** `.kiro/specs/skoolific-v2-upgrade/design.md`
- **Requirements:** `.kiro/specs/skoolific-v2-upgrade/requirements.md`
- **Role Features Config:** `packages/mobile-staff/src/config/roleFeatures.js`
- **Navigation Component:** `packages/mobile-staff/src/components/RoleBasedNavigation.jsx`
