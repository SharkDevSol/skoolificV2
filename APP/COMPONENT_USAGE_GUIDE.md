# Component Usage Guide

Quick reference for using the Skoolific V2 UI components.

## Button Component

```jsx
import Button from '../components/Button/Button';
import { Save, Edit } from 'lucide-react';

// Basic usage
<Button>Click Me</Button>

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// With icon
<Button icon={<Save size={18} />}>Save</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>

// Full example
<Button 
  variant="primary" 
  size="lg"
  icon={<Edit size={18} />}
  onClick={handleClick}
  loading={isSubmitting}
>
  Edit Profile
</Button>
```

## Input Component

```jsx
import Input from '../components/Input/Input';
import { User, Mail, Lock } from 'lucide-react';

// Basic usage
<Input 
  label="Username"
  placeholder="Enter username"
/>

// With icon
<Input 
  label="Email"
  icon={<Mail size={20} />}
  placeholder="Enter email"
/>

// With validation
<Input 
  label="Password"
  type="password"
  icon={<Lock size={20} />}
  error={errors.password}
  required
/>

// With helper text
<Input 
  label="Email"
  helperText="We'll never share your email"
/>

// Full example
<Input
  label="Username"
  icon={<User size={20} />}
  value={formData.username}
  onChange={(e) => setFormData({...formData, username: e.target.value})}
  error={errors.username}
  helperText="Must be at least 3 characters"
  required
/>
```

## Card Component

```jsx
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';

// Basic usage
<Card>
  <p>Card content</p>
</Card>

// With title
<Card title="User Profile">
  <p>Profile information</p>
</Card>

// With title and subtitle
<Card 
  title="Dashboard" 
  subtitle="Overview of your account"
>
  <p>Dashboard content</p>
</Card>

// With actions
<Card 
  title="Settings"
  actions={
    <Button size="sm" variant="outline">Edit</Button>
  }
>
  <p>Settings content</p>
</Card>

// Variants
<Card variant="default">Default Card</Card>
<Card variant="outlined">Outlined Card</Card>
<Card variant="elevated">Elevated Card</Card>

// Padding options
<Card padding="none">No padding</Card>
<Card padding="sm">Small padding</Card>
<Card padding="md">Medium padding</Card>
<Card padding="lg">Large padding</Card>

// Hoverable
<Card hoverable onClick={handleClick}>
  <p>Click me!</p>
</Card>
```

## Modal Component

```jsx
import { useState } from 'react';
import Modal from '../components/Modal/Modal';
import Button from '../components/Button/Button';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
        size="md"
      >
        <p>Are you sure you want to proceed?</p>
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </Modal>
    </>
  );
}

// Sizes
<Modal size="sm">Small Modal</Modal>
<Modal size="md">Medium Modal</Modal>
<Modal size="lg">Large Modal</Modal>
<Modal size="xl">Extra Large Modal</Modal>
<Modal size="full">Full Screen Modal</Modal>

// Options
<Modal 
  showCloseButton={false}  // Hide close button
  closeOnOverlayClick={false}  // Prevent closing on overlay click
>
  Content
</Modal>
```

## Table Component

```jsx
import Table from '../components/Table/Table';

// Define columns
const columns = [
  { 
    header: 'ID', 
    accessor: 'id',
    width: '80px'
  },
  { 
    header: 'Name', 
    accessor: 'name'
  },
  { 
    header: 'Email', 
    accessor: 'email'
  },
  { 
    header: 'Status', 
    accessor: 'status',
    render: (row) => (
      <span className={row.status === 'active' ? 'badge-success' : 'badge-error'}>
        {row.status}
      </span>
    )
  }
];

// Data
const data = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' }
];

// Basic usage
<Table 
  columns={columns}
  data={data}
/>

// With row click
<Table 
  columns={columns}
  data={data}
  onRowClick={(row) => console.log('Clicked:', row)}
/>

// Loading state
<Table 
  columns={columns}
  data={[]}
  loading={true}
/>

// Empty state
<Table 
  columns={columns}
  data={[]}
  emptyMessage="No students found"
/>

// With options
<Table 
  columns={columns}
  data={data}
  striped={true}
  bordered={true}
/>
```

## ThemeToggle Component

```jsx
import ThemeToggle from '../components/ThemeToggle/ThemeToggle';

// Simple usage - just add it anywhere
<ThemeToggle />

// Common placement: in header
<div className="header">
  <h1>My App</h1>
  <div className="header-actions">
    <ThemeToggle />
  </div>
</div>
```

## LanguageSelector Component

```jsx
import LanguageSelector from '../components/LanguageSelector/LanguageSelector';

// Simple usage - just add it anywhere
<LanguageSelector />

// Common placement: in header with theme toggle
<div className="header-actions">
  <LanguageSelector />
  <ThemeToggle />
</div>
```

## LoadingSpinner Component

```jsx
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';

// Basic usage
<LoadingSpinner />

// Sizes
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />

// Colors
<LoadingSpinner color="primary" />
<LoadingSpinner color="secondary" />
<LoadingSpinner color="white" />

// With text
<LoadingSpinner text="Loading data..." />

// Full screen overlay
<LoadingSpinner 
  fullScreen 
  text="Please wait..." 
/>

// In a button
<Button loading>
  Loading...
</Button>
```

## Skeleton Component

```jsx
import Skeleton from '../components/Skeleton/Skeleton';

// Text skeleton (default)
<Skeleton variant="text" />

// Multiple lines
<Skeleton variant="text" count={3} />

// Circular (for avatars)
<Skeleton variant="circular" width="60px" height="60px" />

// Rectangular (for images/cards)
<Skeleton variant="rectangular" height="200px" />

// Custom width
<Skeleton variant="text" width="200px" />

// Without animation
<Skeleton animation={false} />

// Loading state pattern
{loading ? (
  <Skeleton variant="text" count={3} />
) : (
  <div>
    <p>Actual content</p>
  </div>
)}
```

## Toast Component

```jsx
import { useState } from 'react';
import Toast from '../components/Toast/Toast';
import Button from '../components/Button/Button';

function MyComponent() {
  const [showToast, setShowToast] = useState(false);

  return (
    <>
      <Button onClick={() => setShowToast(true)}>
        Show Notification
      </Button>

      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message="Operation completed successfully!"
        type="success"
        duration={5000}
        position="top-right"
      />
    </>
  );
}

// Toast types
<Toast type="success" message="Success!" />
<Toast type="error" message="Error occurred" />
<Toast type="warning" message="Warning!" />
<Toast type="info" message="Information" />

// Positions
<Toast position="top-right" />
<Toast position="top-left" />
<Toast position="bottom-right" />
<Toast position="bottom-left" />
<Toast position="top-center" />
<Toast position="bottom-center" />

// No auto-close
<Toast duration={0} />

// Without close button
<Toast showCloseButton={false} />
```

## Badge Component

```jsx
import Badge from '../components/Badge/Badge';
import { CheckCircle } from 'lucide-react';

// Basic usage
<Badge>New</Badge>

// Variants
<Badge variant="primary">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="info">Info</Badge>

// Outlined
<Badge variant="primary" outline>Outlined</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>

// With icon
<Badge variant="success" icon={<CheckCircle size={14} />}>
  Verified
</Badge>

// Removable
<Badge 
  variant="primary" 
  onRemove={() => console.log('Removed')}
>
  Tag
</Badge>

// Dot indicator
<Badge variant="success" dot />

// Common use cases
<div>
  <span>Status: </span>
  <Badge variant="success">Active</Badge>
</div>

<div>
  <span>Notifications </span>
  <Badge variant="error">5</Badge>
</div>
```

## Using Theme Context

```jsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

## Using Language Context

```jsx
import { useLanguage } from '../contexts/LanguageContext';

function MyComponent() {
  const { language, changeLanguage } = useLanguage();

  return (
    <div>
      <p>Current language: {language}</p>
      <button onClick={() => changeLanguage('am')}>አማርኛ</button>
      <button onClick={() => changeLanguage('ar')}>العربية</button>
      <button onClick={() => changeLanguage('en')}>English</button>
    </div>
  );
}
```

## Using Translations

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('auth.loginPrompt')}</p>
      <Button>{t('common.submit')}</Button>
    </div>
  );
}
```

## Adding New Translation Keys

Edit the translation files in `src/i18n/locales/`:

```json
// en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature"
  }
}

// am.json
{
  "myFeature": {
    "title": "የእኔ ባህሪ",
    "description": "ይህ የእኔ ባህሪ ነው"
  }
}

// ar.json
{
  "myFeature": {
    "title": "ميزتي",
    "description": "هذه ميزتي"
  }
}
```

Then use in component:
```jsx
const { t } = useTranslation();
<h1>{t('myFeature.title')}</h1>
```

## Using Design Tokens in CSS

```css
/* Use CSS variables from theme.css */
.myComponent {
  /* Colors */
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  
  /* Spacing */
  padding: var(--spacing-md);
  margin: var(--spacing-lg);
  gap: var(--spacing-sm);
  
  /* Border Radius */
  border-radius: var(--radius-md);
  
  /* Shadows */
  box-shadow: var(--shadow-md);
  
  /* Transitions */
  transition: all var(--transition-base);
  
  /* Typography */
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
}

.myComponent:hover {
  background-color: var(--bg-secondary);
  box-shadow: var(--shadow-lg);
}
```

## Common Patterns

### Form with Validation
```jsx
import { useState } from 'react';
import Input from '../components/Input/Input';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';

function MyForm() {
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Submit logic
    setLoading(false);
  };

  return (
    <Card title="User Registration">
      <form onSubmit={handleSubmit}>
        <Input
          label="Username"
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          error={errors.username}
          required
        />
        
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          error={errors.email}
          required
        />
        
        <Button type="submit" loading={loading}>
          Register
        </Button>
      </form>
    </Card>
  );
}
```

### Confirmation Dialog
```jsx
import { useState } from 'react';
import Modal from '../components/Modal/Modal';
import Button from '../components/Button/Button';

function DeleteButton({ onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    onDelete();
    setShowConfirm(false);
  };

  return (
    <>
      <Button variant="danger" onClick={() => setShowConfirm(true)}>
        Delete
      </Button>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <p>Are you sure you want to delete this item?</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <Button variant="outline" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
```

### Data Table with Actions
```jsx
import Table from '../components/Table/Table';
import Button from '../components/Button/Button';
import { Edit, Trash2 } from 'lucide-react';

function UserTable({ users }) {
  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { 
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="sm" variant="outline" icon={<Edit size={16} />}>
            Edit
          </Button>
          <Button size="sm" variant="danger" icon={<Trash2 size={16} />}>
            Delete
          </Button>
        </div>
      )
    }
  ];

  return <Table columns={columns} data={users} />;
}
```

## Best Practices

1. **Always use design tokens** instead of hardcoded values
2. **Use translation keys** for all user-facing text
3. **Test in both light and dark modes**
4. **Test with all three languages** (especially RTL for Arabic)
5. **Use semantic HTML** (buttons for actions, proper form elements)
6. **Add proper ARIA labels** for accessibility
7. **Handle loading and error states** in forms
8. **Use consistent spacing** from design tokens
9. **Keep components simple** and composable
10. **Follow the existing patterns** in the codebase

## Need Help?

- Check the Component Showcase: `http://localhost:5053/showcase`
- Read the design system docs: `.kiro/specs/skoolific-v2-upgrade/UI_UX_DESIGN_SYSTEM.md`
- See component specs: `.kiro/specs/skoolific-v2-upgrade/UI_COMPONENTS_AND_PAGES.md`
