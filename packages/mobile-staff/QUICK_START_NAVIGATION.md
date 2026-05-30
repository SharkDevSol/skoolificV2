# Quick Start Guide: Role-Based Navigation

This guide will help you integrate the RoleBasedNavigation component into the Skoolific Staff mobile app.

## Prerequisites

- ✅ Task 7.2.1 completed (ROLE_FEATURES mapping created)
- ✅ React Router DOM installed (`react-router-dom@^7.9.4`)
- ✅ Capacitor configured

## Step-by-Step Integration

### Step 1: Update main.jsx

Replace the contents of `src/main.jsx` with `src/main.updated.jsx`:

```bash
# Backup original
cp src/main.jsx src/main.jsx.backup

# Use updated version
cp src/main.updated.jsx src/main.jsx
```

Or manually add BrowserRouter:

```jsx
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

### Step 2: Update App.jsx

Replace the contents of `src/App.jsx` with `src/App.updated.jsx`:

```bash
# Backup original
cp src/App.jsx src/App.jsx.backup

# Use updated version
cp src/App.updated.jsx src/App.jsx
```

This updated App.jsx includes:
- AuthProvider integration
- RoleBasedNavigation component
- All route definitions
- Placeholder page components

### Step 3: Configure API Base URL

Create or update `.env` file in the `packages/mobile-staff` directory:

```env
VITE_API_BASE_URL=http://localhost:3000
```

For production:

```env
VITE_API_BASE_URL=https://api.skoolific.com
```

### Step 4: Test the Integration

```bash
# Start development server
npm run dev

# Open in browser
# Navigate to http://localhost:5173
```

### Step 5: Test with Different Roles

The updated App.jsx includes a login screen. Test with different user roles:

#### Teacher User
```json
{
  "username": "john.teacher",
  "staffType": "Teacher",
  "branchCode": "ib3"
}
```

Expected navigation items:
- Home
- Mark Lists
- Attendance
- Exams
- Profile

#### Administrative User
```json
{
  "username": "jane.admin",
  "staffType": "Administrative",
  "branchCode": "ib3"
}
```

Expected navigation items:
- Home
- Registration
- Fees
- Profile

#### Supportive User
```json
{
  "username": "bob.support",
  "staffType": "Supportive",
  "branchCode": "ib3"
}
```

Expected navigation items:
- Home
- Attendance
- Students
- Profile

## Customization

### Hide Home or Profile

```jsx
<RoleBasedNavigation 
  user={user}
  showHome={false}
  showProfile={false}
/>
```

### Add Navigation Callback

```jsx
<RoleBasedNavigation 
  user={user}
  onNavigate={(route, itemId) => {
    console.log(`Navigating to ${route}`);
    // Track analytics
    // Show loading indicator
  }}
/>
```

### Custom Styling

Create a custom CSS file:

```css
/* custom-navigation.css */
.role-based-navigation {
  background: linear-gradient(to right, #667eea, #764ba2);
}

.nav-item.active {
  color: #ffd700;
}
```

Import after the component:

```jsx
import RoleBasedNavigation from './components/RoleBasedNavigation';
import './custom-navigation.css';
```

## Building for Mobile

### Android Build

```bash
# Build web assets
npm run build

# Sync with Capacitor
npm run cap:sync

# Open in Android Studio
npm run cap:open:android
```

### iOS Build (if configured)

```bash
# Build web assets
npm run build

# Sync with Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## Troubleshooting

### Navigation not showing

**Problem**: Navigation component doesn't render

**Solution**:
1. Check that user object has `staffType` property
2. Verify BrowserRouter is wrapping the App
3. Check console for errors

### Routes not working

**Problem**: Clicking navigation items doesn't navigate

**Solution**:
1. Verify all routes are defined in App.jsx
2. Check that route paths match feature metadata routes
3. Ensure BrowserRouter is properly configured

### Styling issues

**Problem**: Navigation looks broken or unstyled

**Solution**:
1. Verify CSS file is imported: `import './RoleBasedNavigation.css'`
2. Check for conflicting global styles
3. Inspect element to see computed styles

### Active route not highlighting

**Problem**: Current page not highlighted in navigation

**Solution**:
1. Verify route paths match exactly
2. Check that `useLocation` is working
3. Ensure routes are defined correctly

## Next Steps

After integrating the navigation:

1. **Implement Page Components**: Replace placeholder components with actual implementations
2. **Add Protected Routes**: Implement route guards based on role access
3. **Connect to Backend API**: Update AuthContext with real API endpoints
4. **Add Loading States**: Implement loading indicators for route transitions
5. **Implement Offline Support**: Add offline mode handling
6. **Add Analytics**: Track navigation events
7. **Test on Real Devices**: Test on actual Android/iOS devices

## Testing Checklist

- [ ] Navigation renders for Teacher role
- [ ] Navigation renders for Administrative role
- [ ] Navigation renders for Supportive role
- [ ] Active route is highlighted correctly
- [ ] Navigation items navigate to correct routes
- [ ] Home and Profile items show/hide correctly
- [ ] Navigation callback works (if used)
- [ ] Styling looks correct on mobile
- [ ] Dark mode works correctly
- [ ] Accessibility features work (keyboard navigation, screen readers)

## Resources

- [Component Documentation](./src/components/README.md)
- [Usage Examples](./src/components/RoleBasedNavigation.example.jsx)
- [Implementation Details](./ROLE_BASED_NAVIGATION_IMPLEMENTATION.md)
- [Role Features Config](./src/config/roleFeatures.js)
- [React Router Docs](https://reactrouter.com/)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the component documentation
3. Check the usage examples
4. Inspect browser console for errors
5. Verify all dependencies are installed

## Summary

You've successfully integrated the RoleBasedNavigation component! The navigation will now:

✅ Display features based on user's staff role
✅ Highlight the current active route
✅ Navigate between pages using React Router
✅ Work on mobile devices with touch-friendly UI
✅ Support dark mode and accessibility features

Next, implement the actual page components and connect to your backend API.
