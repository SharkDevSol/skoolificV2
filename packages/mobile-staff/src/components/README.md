# Components

This directory contains reusable UI components for the Skoolific Staff mobile application.

## RoleBasedNavigation

A mobile-optimized bottom navigation component that dynamically displays navigation items based on the logged-in user's staff role type.

### Features

- **Role-Based Access Control**: Automatically filters navigation items based on user's staff type (Teacher, Administrative, Supportive)
- **Mobile-Optimized**: Bottom navigation bar following modern mobile UI patterns
- **Touch-Friendly**: Minimum 48x48px touch targets for accessibility
- **Active Route Highlighting**: Visual indicator for current page
- **Icon-Based Navigation**: Clear visual icons with labels
- **Responsive Design**: Adapts to different screen sizes
- **Dark Mode Support**: Automatic dark mode styling
- **Accessibility**: ARIA labels, keyboard navigation, high contrast support
- **Safe Area Support**: iOS safe area insets for notched devices

### Usage

#### Basic Usage

```jsx
import { useAuth } from '../context/AuthContext';
import { RoleBasedNavigation } from '../components';

function App() {
  const { user } = useAuth();
  
  return (
    <div>
      <MainContent />
      <RoleBasedNavigation user={user} />
    </div>
  );
}
```

#### With Custom Options

```jsx
<RoleBasedNavigation 
  user={user}
  showHome={true}
  showProfile={true}
  onNavigate={(route, itemId) => {
    console.log('Navigating to:', route);
  }}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `Object` | Required | User object with `staffType` and `username` |
| `user.staffType` | `string` | Required | Staff role: 'Teacher', 'Administrative', or 'Supportive' |
| `showHome` | `boolean` | `true` | Whether to show home navigation item |
| `showProfile` | `boolean` | `true` | Whether to show profile navigation item |
| `onNavigate` | `Function` | `undefined` | Callback when navigation occurs: `(route, itemId) => void` |

### Role-Based Features

The component uses the `ROLE_FEATURES` mapping from `config/roleFeatures.js` to determine which features are accessible to each role:

#### Teacher Role
- Mark Lists
- Attendance
- Exam Creation
- Class Management
- Schedule View
- Student Reports
- Evaluation Book
- Communication

#### Administrative Role
- Student Registration
- Fee Management
- Reports
- Communication
- Student List
- Payment Tracking

#### Supportive Role
- Attendance View (read-only)
- Schedule View (read-only)
- Communication
- Student List (read-only)

### Integration with AuthContext

The component requires a user object from the authentication context. Set up the AuthProvider in your app:

```jsx
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <AuthProvider apiBaseUrl="https://api.skoolific.com">
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
```

### Styling

The component uses CSS modules for styling. The default styles include:

- Fixed bottom positioning
- Flexbox layout for equal spacing
- Smooth transitions and animations
- Responsive breakpoints for different screen sizes
- Dark mode support via `prefers-color-scheme`
- High contrast mode support
- Reduced motion support for accessibility

To customize styles, you can:

1. Override CSS variables in your global styles
2. Create a custom CSS file and import it after the component
3. Use inline styles via the `style` prop (not recommended)

### Accessibility

The component follows WCAG 2.1 Level AA guidelines:

- **Keyboard Navigation**: All items are keyboard accessible
- **Screen Readers**: Proper ARIA labels and roles
- **Touch Targets**: Minimum 48x48px touch targets
- **Color Contrast**: Meets WCAG contrast requirements
- **Focus Indicators**: Clear focus states for keyboard users
- **Reduced Motion**: Respects `prefers-reduced-motion` setting

### Mobile Considerations

#### iOS Safe Area

The component automatically handles iOS safe area insets for devices with notches:

```css
padding-bottom: env(safe-area-inset-bottom);
```

#### Android Navigation Bar

The component accounts for Android's navigation bar by using fixed positioning with proper z-index.

#### Performance

- Uses CSS transforms for animations (GPU-accelerated)
- Minimal re-renders with React.memo (if needed)
- Lazy loading of route components recommended

### Examples

See `RoleBasedNavigation.example.jsx` for comprehensive usage examples including:

1. Basic usage with AuthContext
2. Complete app structure with routing
3. Custom navigation callbacks
4. Customized navigation options
5. Role-specific layouts
6. Loading states
7. Responsive layouts
8. Offline mode integration

### Testing

To test the component with different roles:

```jsx
// Mock user objects for testing
const teacherUser = {
  username: 'john.teacher',
  staffType: 'Teacher',
  branchCode: 'ib3'
};

const adminUser = {
  username: 'jane.admin',
  staffType: 'Administrative',
  branchCode: 'ib3'
};

const supportUser = {
  username: 'bob.support',
  staffType: 'Supportive',
  branchCode: 'ib3'
};

// Render with different users
<RoleBasedNavigation user={teacherUser} />
<RoleBasedNavigation user={adminUser} />
<RoleBasedNavigation user={supportUser} />
```

### Troubleshooting

#### Navigation items not showing

- Verify the user object has a valid `staffType` property
- Check that `ROLE_FEATURES` mapping includes the staff type
- Ensure feature metadata exists in `FEATURE_METADATA`

#### Navigation not working

- Verify React Router is properly set up
- Check that routes are defined for all navigation items
- Ensure the component is inside a `<BrowserRouter>` or `<Router>`

#### Styling issues

- Check that the CSS file is imported
- Verify no conflicting global styles
- Inspect element to see computed styles

### Future Enhancements

Potential improvements for future versions:

- [ ] Badge support for notifications
- [ ] Drawer navigation for more than 5 items
- [ ] Haptic feedback on navigation
- [ ] Animation customization options
- [ ] Gesture support (swipe to navigate)
- [ ] Voice navigation support
- [ ] Multi-language support for labels

### Related Files

- `config/roleFeatures.js` - Role-based feature access configuration
- `context/AuthContext.jsx` - Authentication state management
- `services/AuthService.js` - Secure credential storage
- `RoleBasedNavigation.css` - Component styles
- `RoleBasedNavigation.example.jsx` - Usage examples

### License

Part of the Skoolific V2 project. Internal use only.
