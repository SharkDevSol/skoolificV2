# Staff App Configuration

This directory contains configuration files for the Skoolific Staff mobile application.

## Files

### `roleFeatures.js`

Defines role-based feature access control for the Staff app. This configuration maps each staff role type to the features they can access.

#### Staff Role Types

1. **Teacher** - Teaching staff who handle academic activities
   - Mark Lists
   - Attendance
   - Exam Creation
   - Class Management
   - Schedule View
   - Student Reports
   - Evaluation Book
   - Communication

2. **Administrative** - Administrative staff who handle student registration, fees, etc.
   - Student Registration
   - Fee Management
   - Reports
   - Communication
   - Student List
   - Payment Tracking

3. **Supportive** - Support staff with limited access
   - Attendance View (read-only)
   - Schedule View (read-only)
   - Communication
   - Student List (read-only)

#### Usage Examples

##### Basic Feature Access Check

```javascript
import { hasFeatureAccess } from '@/config/roleFeatures';

// Check if a teacher can access mark lists
const canAccessMarks = hasFeatureAccess('Teacher', 'mark-lists');
// Returns: true

// Check if supportive staff can create exams
const canCreateExams = hasFeatureAccess('Supportive', 'exam-creation');
// Returns: false
```

##### Get All Features for a Role

```javascript
import { getRoleFeatures } from '@/config/roleFeatures';

const teacherFeatures = getRoleFeatures('Teacher');
// Returns: ['mark-lists', 'attendance', 'exam-creation', ...]
```

##### Get Features with Metadata

```javascript
import { getRoleFeaturesWithMetadata } from '@/config/roleFeatures';

const features = getRoleFeaturesWithMetadata('Teacher');
// Returns: [
//   {
//     id: 'mark-lists',
//     title: 'Mark Lists',
//     description: 'Enter and manage student marks',
//     icon: '📚',
//     route: '/marks'
//   },
//   ...
// ]
```

##### Conditional Rendering Based on Role

```javascript
import { hasFeatureAccess } from '@/config/roleFeatures';

function StaffDashboard({ user }) {
  return (
    <div>
      {hasFeatureAccess(user.staffType, 'mark-lists') && (
        <MarkListsCard />
      )}
      
      {hasFeatureAccess(user.staffType, 'fee-management') && (
        <FeeManagementCard />
      )}
      
      {hasFeatureAccess(user.staffType, 'communication') && (
        <CommunicationCard />
      )}
    </div>
  );
}
```

##### Role-Based Navigation

```javascript
import { getRoleFeaturesWithMetadata } from '@/config/roleFeatures';
import { useAuth } from '@/context/AuthContext';

function Navigation() {
  const { user } = useAuth();
  const features = getRoleFeaturesWithMetadata(user.staffType);
  
  return (
    <nav>
      {features.map(feature => (
        <NavLink 
          key={feature.id}
          to={feature.route}
          icon={feature.icon}
        >
          {feature.title}
        </NavLink>
      ))}
    </nav>
  );
}
```

##### Validate Staff Type

```javascript
import { isValidStaffType } from '@/config/roleFeatures';

function validateUser(user) {
  if (!isValidStaffType(user.staffType)) {
    throw new Error(`Invalid staff type: ${user.staffType}`);
  }
  // Continue with valid user
}
```

##### Get All Available Roles

```javascript
import { getAvailableRoles } from '@/config/roleFeatures';

const roles = getAvailableRoles();
// Returns: ['Teacher', 'Administrative', 'Supportive']

// Use in a dropdown
function RoleSelector() {
  const roles = getAvailableRoles();
  
  return (
    <select>
      {roles.map(role => (
        <option key={role} value={role}>
          {role}
        </option>
      ))}
    </select>
  );
}
```

##### Protected Route Component

```javascript
import { hasFeatureAccess } from '@/config/roleFeatures';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedFeature({ featureId, children }) {
  const { user } = useAuth();
  
  if (!hasFeatureAccess(user.staffType, featureId)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
}

// Usage
<ProtectedFeature featureId="exam-creation">
  <ExamCreationPage />
</ProtectedFeature>
```

##### Custom Hook for Feature Access

```javascript
import { hasFeatureAccess, getRoleFeatures } from '@/config/roleFeatures';
import { useAuth } from '@/context/AuthContext';

function useFeatureAccess() {
  const { user } = useAuth();
  
  return {
    hasAccess: (featureId) => hasFeatureAccess(user.staffType, featureId),
    features: getRoleFeatures(user.staffType),
    staffType: user.staffType
  };
}

// Usage in component
function MyComponent() {
  const { hasAccess } = useFeatureAccess();
  
  return (
    <div>
      {hasAccess('mark-lists') && <MarkListsButton />}
      {hasAccess('attendance') && <AttendanceButton />}
    </div>
  );
}
```

## Adding New Features

To add a new feature to the role-based access control:

1. **Add the feature ID to the appropriate role(s) in `ROLE_FEATURES`:**

```javascript
export const ROLE_FEATURES = {
  Teacher: [
    'mark-lists',
    'attendance',
    'new-feature-id',  // Add here
    // ...
  ],
  // ...
};
```

2. **Add feature metadata to `FEATURE_METADATA`:**

```javascript
export const FEATURE_METADATA = {
  // ...
  'new-feature-id': {
    title: 'New Feature',
    description: 'Description of the new feature',
    icon: '🆕',
    route: '/new-feature'
  }
};
```

3. **Use the feature in your components:**

```javascript
import { hasFeatureAccess } from '@/config/roleFeatures';

function MyComponent({ user }) {
  return (
    <>
      {hasFeatureAccess(user.staffType, 'new-feature-id') && (
        <NewFeatureComponent />
      )}
    </>
  );
}
```

## Modifying Role Access

To change which roles have access to a feature:

1. Add or remove the feature ID from the role's array in `ROLE_FEATURES`
2. No code changes needed - the access control is automatically updated

Example: Give Administrative staff access to exam creation:

```javascript
export const ROLE_FEATURES = {
  // ...
  Administrative: [
    'student-registration',
    'fee-management',
    'exam-creation',  // Add this line
    'reports',
    'communication',
    'student-list',
    'payment-tracking'
  ],
  // ...
};
```

## Best Practices

1. **Always use feature IDs from the configuration** - Don't hardcode feature checks
2. **Use descriptive feature IDs** - Use kebab-case (e.g., 'mark-lists', 'fee-management')
3. **Keep metadata up to date** - Ensure all features have corresponding metadata
4. **Document new features** - Update this README when adding new features
5. **Test role access** - Verify that each role can only access their designated features
6. **Use helper functions** - Prefer `hasFeatureAccess()` over direct array checks

## Integration with Authentication

The role features configuration should be used in conjunction with the authentication context:

```javascript
// In AuthContext.jsx
import { isValidStaffType } from '@/config/roleFeatures';

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const userData = response.data;
    
    // Validate staff type
    if (!isValidStaffType(userData.staffType)) {
      throw new Error('Invalid staff type');
    }
    
    setUser(userData);
  };
  
  return (
    <AuthContext.Provider value={{ user, login }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## Related Files

- `packages/mobile-staff/src/App.jsx` - Main app component that will use role-based navigation
- `packages/mobile-staff/src/services/` - API services that may need role-based filtering
- `.kiro/specs/skoolific-v2-upgrade/design.md` - Design document with role specifications
- `.kiro/specs/skoolific-v2-upgrade/requirements.md` - Requirements document (Requirement 23)

## Spec Reference

This configuration implements:
- **Task 7.2.1**: Define ROLE_FEATURES mapping (Teacher, Administrative, Supportive)
- **Requirement 23.8-23.11**: Staff_App role-based UI requirements
- **Design Section**: Staff_App Role-Based UI architecture

---

**Last Updated:** 2024-01-XX  
**Version:** 1.0.0  
**Spec:** Skoolific V2 Upgrade - Phase 7.2
