# Design Document: Skoolific V2 UI/UX Redesign

## Overview

### Purpose

This design document specifies the technical architecture for implementing a complete UI/UX redesign of the Skoolific school management system. The backend functionality (Phases 1-10, 769 tasks) is fully implemented and working. Phase 11 (123 UI/UX tasks) was marked complete but NOT actually implemented. The system currently shows the old V1 design with only minor color changes.

This redesign will transform the entire user interface into a modern, accessible, and performant application while maintaining full compatibility with the existing backend API.

### Scope

**In Scope:**
- Complete redesign of all UI pages and components
- Modern design system with reusable components
- Responsive design (mobile, tablet, desktop)
- Light and dark mode theming
- Accessibility compliance (WCAG AA)
- Multi-language support (English, Amharic, Arabic with RTL)
- Performance optimization
- Animation and transitions
- Browser compatibility

**Out of Scope:**
- Backend API changes (already implemented)
- Database schema changes
- Business logic modifications
- New features beyond UI/UX improvements

### Goals

1. **Modern User Experience**: Transform the interface with contemporary design patterns and smooth interactions
2. **Accessibility**: Ensure WCAG AA compliance for users with disabilities
3. **Performance**: Achieve Lighthouse score >90 with optimized loading and rendering
4. **Consistency**: Establish a comprehensive design system for uniform UI across all modules
5. **Responsiveness**: Provide optimal experience on mobile, tablet, and desktop devices
6. **Internationalization**: Support multiple languages with proper RTL layout for Arabic
7. **Maintainability**: Create well-documented, reusable components for future development

### Technical Stack

- **Framework**: React 18+ with hooks
- **Styling**: CSS Modules for scoped styling
- **Icons**: Lucide React icon library
- **Routing**: React Router v6
- **State Management**: React Context API (existing)
- **API Client**: Axios (existing)
- **Build Tool**: Vite (existing)
- **Testing**: Vitest + React Testing Library + Playwright
- **Internationalization**: i18next (existing)


## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Skoolific V2 UI Layer                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Application Shell                         │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Theme     │  │   Language   │  │    Auth     │  │  │
│  │  │  Context    │  │   Context    │  │  Context    │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Layout Components                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │ Sidebar  │  │  Header  │  │  Page Container  │   │  │
│  │  │          │  │          │  │                  │   │  │
│  │  │ - Nav    │  │ - Search │  │  - Breadcrumbs   │   │  │
│  │  │ - Menu   │  │ - Notify │  │  - Content Area  │   │  │
│  │  │ - Toggle │  │ - Profile│  │  - Footer        │   │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Design System Components                  │  │
│  │                                                         │  │
│  │  Form Components    │  Data Display    │  Feedback    │  │
│  │  ─────────────────  │  ──────────────  │  ──────────  │  │
│  │  • Button           │  • Table         │  • Toast     │  │
│  │  • Input            │  • Card          │  • Modal     │  │
│  │  • Select           │  • Badge         │  • Loading   │  │
│  │  • Checkbox         │  • StatCard      │  • Skeleton  │  │
│  │  • Radio            │  • Calendar      │              │  │
│  │  • Textarea         │                  │              │  │
│  │  • DatePicker       │                  │              │  │
│  │  • FileUpload       │                  │              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Page Modules                              │  │
│  │                                                         │  │
│  │  Dashboard  │  Students  │  Staff  │  Academic         │  │
│  │  Finance    │  HR        │  Communication  │  Settings │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Existing Backend API                        │
│              (Already Implemented - No Changes)              │
└─────────────────────────────────────────────────────────────┘
```

### Design Patterns

#### 1. Component Composition Pattern

All UI components follow a composition pattern where complex components are built from simpler, reusable primitives:

```
Page Component
  └─ PageLayout
      ├─ Sidebar
      │   └─ NavigationMenu
      │       └─ MenuItem (multiple)
      ├─ Header
      │   ├─ Breadcrumbs
      │   ├─ SearchBar
      │   ├─ NotificationCenter
      │   └─ ProfileMenu
      └─ ContentArea
          ├─ PageHeader
          ├─ FilterBar (optional)
          └─ Content (Cards, Tables, Forms)
```

#### 2. Context-Based State Management

Global state is managed through React Context API:

- **ThemeContext**: Manages light/dark mode state and theme switching
- **LanguageContext**: Manages current language and translation functions
- **AuthContext**: Manages authentication state (existing, no changes)

#### 3. CSS Module Pattern

All components use CSS Modules for scoped styling:

```
Component.jsx
Component.module.css
```

Benefits:
- Prevents style conflicts
- Co-locates styles with components
- Enables tree-shaking of unused styles
- Supports theme variables

#### 4. Responsive Design Pattern

Mobile-first approach with breakpoints:

```css
/* Mobile: 320px - 767px (default) */
.component { ... }

/* Tablet: 768px - 1023px */
@media (min-width: 768px) {
  .component { ... }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .component { ... }
}
```


## Components and Interfaces

### Design System Components

#### 1. Button Component

**Purpose**: Reusable button with multiple variants and states

**Props Interface**:
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: (event: MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}
```

**Variants**:
- `primary`: Main action button (blue background)
- `secondary`: Secondary action (gray background)
- `success`: Positive action (green background)
- `warning`: Caution action (orange background)
- `danger`: Destructive action (red background)
- `ghost`: Transparent with border

**States**: default, hover, active, disabled, loading

**File Structure**:
```
src/COMPONENTS/Button/
  ├─ Button.jsx
  ├─ Button.module.css
  └─ Button.test.jsx
```

#### 2. Card Component

**Purpose**: Container for grouping related content

**Props Interface**:
```typescript
interface CardProps {
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  footer?: ReactNode;
  padding?: 'none' | 'small' | 'medium' | 'large';
  hoverable?: boolean;
  bordered?: boolean;
  children: ReactNode;
  className?: string;
}
```

**Features**:
- Optional header with title and action button
- Optional footer
- Configurable padding
- Hover effect (optional)
- Border (optional)
- Light/dark mode support

**File Structure**:
```
src/COMPONENTS/Card/
  ├─ Card.jsx
  ├─ Card.module.css
  └─ Card.test.jsx
```

#### 3. Modal Component

**Purpose**: Overlay dialog for focused interactions

**Props Interface**:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}
```

**Features**:
- Backdrop overlay with blur effect
- Configurable sizes
- Close on overlay click (optional)
- Close on Escape key (optional)
- Smooth open/close animation
- Focus trap for accessibility
- Scroll lock on body

**File Structure**:
```
src/COMPONENTS/Modal/
  ├─ Modal.jsx
  ├─ Modal.module.css
  └─ Modal.test.jsx
```

#### 4. Table Component

**Purpose**: Display tabular data with sorting, filtering, and pagination

**Props Interface**:
```typescript
interface TableProps {
  columns: ColumnDef[];
  data: any[];
  sortable?: boolean;
  filterable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
  className?: string;
}

interface ColumnDef {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}
```

**Features**:
- Column sorting (ascending/descending)
- Column filtering
- Pagination controls
- Loading skeleton
- Empty state
- Row click handler
- Responsive (horizontal scroll on mobile)
- Sticky header

**File Structure**:
```
src/COMPONENTS/Table/
  ├─ Table.jsx
  ├─ Table.module.css
  ├─ TableHeader.jsx
  ├─ TableBody.jsx
  ├─ TablePagination.jsx
  └─ Table.test.jsx
```

#### 5. Form Components

**5.1 Input Component**

**Props Interface**:
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  maxLength?: number;
  autoComplete?: string;
  className?: string;
}
```

**5.2 Select Component**

**Props Interface**:
```typescript
interface SelectProps {
  label?: string;
  options: Option[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  searchable?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}
```

**5.3 Checkbox Component**

**Props Interface**:
```typescript
interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  error?: string;
  className?: string;
}
```

**5.4 Radio Component**

**Props Interface**:
```typescript
interface RadioProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

**5.5 Textarea Component**

**Props Interface**:
```typescript
interface TextareaProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  autoResize?: boolean;
  className?: string;
}
```

**5.6 DatePicker Component**

**Purpose**: Date selection with Ethiopian calendar support

**Props Interface**:
```typescript
interface DatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  error?: string;
  calendarType?: 'gregorian' | 'ethiopian';
  format?: string;
  placeholder?: string;
  className?: string;
}
```

**Features**:
- Calendar popup with month/year navigation
- Ethiopian calendar support (existing utility)
- Date range restrictions
- Keyboard navigation
- Localized date formatting

**5.7 FileUpload Component**

**Purpose**: File selection with drag-and-drop support

**Props Interface**:
```typescript
interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onChange: (files: File[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  error?: string;
  preview?: boolean;
  className?: string;
}
```

**Features**:
- Click to select files
- Drag and drop support
- File type validation
- File size validation
- Image preview (optional)
- Upload progress indicator
- Multiple file support

**File Structure**:
```
src/COMPONENTS/Input/
  ├─ Input.jsx
  ├─ Input.module.css
  └─ Input.test.jsx

src/COMPONENTS/Select/
  ├─ Select.jsx
  ├─ Select.module.css
  └─ Select.test.jsx

src/COMPONENTS/Checkbox/
  ├─ Checkbox.jsx
  ├─ Checkbox.module.css
  └─ Checkbox.test.jsx

src/COMPONENTS/Radio/
  ├─ Radio.jsx
  ├─ Radio.module.css
  └─ Radio.test.jsx

src/COMPONENTS/Textarea/
  ├─ Textarea.jsx
  ├─ Textarea.module.css
  └─ Textarea.test.jsx

src/COMPONENTS/DatePicker/
  ├─ DatePicker.jsx
  ├─ DatePicker.module.css
  ├─ Calendar.jsx
  ├─ Calendar.module.css
  └─ DatePicker.test.jsx

src/COMPONENTS/FileUpload/
  ├─ FileUpload.jsx
  ├─ FileUpload.module.css
  ├─ FilePreview.jsx
  └─ FileUpload.test.jsx
```

#### 6. Feedback Components

**6.1 Toast Component**

**Purpose**: Temporary notification messages

**Props Interface**:
```typescript
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // milliseconds
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  onClose?: () => void;
}

// Toast Manager Hook
interface UseToast {
  showToast: (options: ToastProps) => void;
  hideToast: (id: string) => void;
}
```

**Features**:
- Auto-dismiss after duration
- Manual dismiss button
- Stacking multiple toasts
- Slide-in animation
- Icon based on type

**6.2 Loading Indicator**

**Props Interface**:
```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  fullScreen?: boolean;
  message?: string;
  className?: string;
}
```

**Features**:
- Spinning animation
- Configurable size and color
- Optional overlay for full-screen loading
- Optional loading message

**6.3 Skeleton Loader**

**Props Interface**:
```typescript
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}
```

**Features**:
- Shimmer animation
- Multiple variants
- Configurable dimensions
- Multiple skeleton elements

**File Structure**:
```
src/COMPONENTS/Toast/
  ├─ Toast.jsx
  ├─ Toast.module.css
  ├─ ToastContainer.jsx
  ├─ useToast.js
  └─ Toast.test.jsx

src/COMPONENTS/LoadingSpinner/
  ├─ LoadingSpinner.jsx
  ├─ LoadingSpinner.module.css
  └─ LoadingSpinner.test.jsx

src/COMPONENTS/Skeleton/
  ├─ Skeleton.jsx
  ├─ Skeleton.module.css
  └─ Skeleton.test.jsx
```

#### 7. Data Display Components

**7.1 Badge Component**

**Props Interface**:
```typescript
interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'small' | 'medium' | 'large';
  dot?: boolean;
  count?: number;
  maxCount?: number;
  children?: ReactNode;
  className?: string;
}
```

**Features**:
- Color variants
- Dot indicator
- Count display with max limit
- Standalone or wrapping content

**7.2 StatCard Component**

**Purpose**: Dashboard metric display

**Props Interface**:
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}
```

**Features**:
- Large value display
- Optional icon
- Trend indicator (percentage change)
- Loading state
- Click handler for drill-down

**File Structure**:
```
src/COMPONENTS/Badge/
  ├─ Badge.jsx
  ├─ Badge.module.css
  └─ Badge.test.jsx

src/COMPONENTS/StatCard/
  ├─ StatCard.jsx
  ├─ StatCard.module.css
  └─ StatCard.test.jsx
```


### Layout Components

#### 1. Sidebar Component

**Purpose**: Main navigation menu

**Props Interface**:
```typescript
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  menuItems: MenuItem[];
  activeItem: string;
  onNavigate: (path: string) => void;
  userRole: 'admin' | 'staff' | 'student' | 'guardian';
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  badge?: number;
  children?: MenuItem[];
  roles?: string[];
}
```

**Features**:
- Collapsible (icon-only or full width)
- Nested menu items (expandable)
- Active item highlighting
- Badge for notifications
- Role-based menu filtering
- Smooth collapse/expand animation
- Mobile: hamburger menu overlay

**Behavior**:
- Desktop (1024px+): Expanded by default, collapsible
- Tablet (768px-1023px): Collapsed by default, expandable
- Mobile (320px-767px): Hidden by default, hamburger menu

**File Structure**:
```
src/COMPONENTS/Sidebar/
  ├─ Sidebar.jsx
  ├─ Sidebar.module.css
  ├─ MenuItem.jsx
  ├─ MenuItem.module.css
  └─ Sidebar.test.jsx
```

#### 2. Header Component

**Purpose**: Top navigation bar with utilities

**Props Interface**:
```typescript
interface HeaderProps {
  breadcrumbs: Breadcrumb[];
  onSearch?: (query: string) => void;
  notifications: Notification[];
  onNotificationClick?: (id: string) => void;
  user: UserInfo;
  onLogout: () => void;
  onProfileClick: () => void;
  className?: string;
}

interface Breadcrumb {
  label: string;
  path?: string;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface UserInfo {
  name: string;
  role: string;
  avatar?: string;
}
```

**Features**:
- Breadcrumb navigation
- Global search (opens modal)
- Notification center (dropdown)
- Profile menu (dropdown)
- Theme toggle
- Language selector
- Unread notification badge

**File Structure**:
```
src/COMPONENTS/Header/
  ├─ Header.jsx
  ├─ Header.module.css
  ├─ Breadcrumbs.jsx
  ├─ Breadcrumbs.module.css
  ├─ SearchBar.jsx
  ├─ SearchBar.module.css
  ├─ NotificationCenter.jsx
  ├─ NotificationCenter.module.css
  ├─ ProfileMenu.jsx
  ├─ ProfileMenu.module.css
  └─ Header.test.jsx
```

#### 3. PageLayout Component

**Purpose**: Consistent page structure wrapper

**Props Interface**:
```typescript
interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  loading?: boolean;
  error?: string;
  className?: string;
}
```

**Structure**:
```
<PageLayout>
  <Sidebar />
  <div className="main-content">
    <Header />
    <div className="page-container">
      <PageHeader />
      <div className="content-area">
        {children}
      </div>
      <Footer />
    </div>
  </div>
</PageLayout>
```

**Features**:
- Consistent spacing and layout
- Optional page header with title and actions
- Loading state (full-page skeleton)
- Error state (error message display)
- Responsive grid system

**File Structure**:
```
src/COMPONENTS/Layout/
  ├─ PageLayout.jsx
  ├─ PageLayout.module.css
  ├─ PageHeader.jsx
  ├─ PageHeader.module.css
  ├─ Footer.jsx
  ├─ Footer.module.css
  └─ PageLayout.test.jsx
```

### Utility Components

#### 1. ThemeToggle Component

**Purpose**: Switch between light and dark modes

**Props Interface**:
```typescript
interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
}
```

**Features**:
- Sun/moon icon toggle
- Smooth transition animation
- Persists preference to localStorage

**File Structure**:
```
src/COMPONENTS/ThemeToggle/
  ├─ ThemeToggle.jsx
  ├─ ThemeToggle.module.css
  └─ ThemeToggle.test.jsx
```

#### 2. LanguageSelector Component

**Purpose**: Switch between English, Amharic, and Arabic

**Props Interface**:
```typescript
interface LanguageSelectorProps {
  variant?: 'dropdown' | 'buttons';
  showFlags?: boolean;
  className?: string;
}
```

**Features**:
- Dropdown or button group variant
- Optional flag icons
- Persists preference to localStorage
- Triggers RTL layout for Arabic

**File Structure**:
```
src/COMPONENTS/LanguageSelector/
  ├─ LanguageSelector.jsx
  ├─ LanguageSelector.module.css
  └─ LanguageSelector.test.jsx
```


## Data Models

### Theme Configuration

```typescript
interface ThemeConfig {
  mode: 'light' | 'dark';
  colors: {
    // Primary colors
    primary: string;
    primaryHover: string;
    primaryActive: string;
    
    // Semantic colors
    success: string;
    warning: string;
    danger: string;
    info: string;
    
    // Neutral colors
    background: string;
    surface: string;
    border: string;
    text: string;
    textSecondary: string;
    textDisabled: string;
    
    // Shadows
    shadowSm: string;
    shadowMd: string;
    shadowLg: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}
```

### Language Configuration

```typescript
interface LanguageConfig {
  code: 'en' | 'am' | 'ar';
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  flag: string;
  translations: Record<string, string>;
}

// Translation key structure
interface Translations {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    loading: string;
    error: string;
    success: string;
    // ... more common keys
  };
  navigation: {
    dashboard: string;
    students: string;
    staff: string;
    academic: string;
    finance: string;
    hr: string;
    communication: string;
    settings: string;
    // ... more navigation keys
  };
  // Module-specific translations
  students: { ... };
  staff: { ... };
  academic: { ... };
  finance: { ... };
  hr: { ... };
  communication: { ... };
  settings: { ... };
}
```

### Component State Models

```typescript
// Table state
interface TableState {
  data: any[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  filters: Record<string, any>;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  loading: boolean;
  error: string | null;
}

// Form state
interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Modal state
interface ModalState {
  isOpen: boolean;
  title: string;
  content: ReactNode;
  size: 'small' | 'medium' | 'large' | 'fullscreen';
  onConfirm?: () => void;
  onCancel?: () => void;
}

// Toast state
interface ToastState {
  toasts: Toast[];
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
  timestamp: number;
}
```

### Page-Specific Data Models

```typescript
// Dashboard
interface DashboardData {
  stats: {
    totalStudents: number;
    totalStaff: number;
    attendanceRate: number;
    feeCollectionRate: number;
  };
  charts: {
    attendanceTrend: ChartData;
    enrollmentTrend: ChartData;
    financialOverview: ChartData;
  };
  recentActivity: Activity[];
  upcomingEvents: Event[];
}

// Student List
interface StudentListData {
  students: Student[];
  filters: {
    class: string;
    status: string;
    searchTerm: string;
  };
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
  };
}

// Staff List
interface StaffListData {
  staff: StaffMember[];
  filters: {
    staffType: string;
    department: string;
    searchTerm: string;
  };
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
  };
}
```


## Error Handling

### Error Boundaries

Implement React Error Boundaries at multiple levels:

1. **Root Error Boundary**: Catches errors in the entire application
2. **Page Error Boundary**: Catches errors within individual pages
3. **Component Error Boundary**: Catches errors within complex components

```typescript
interface ErrorBoundaryProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  children: ReactNode;
}

// Usage
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

### Error Display Patterns

#### 1. Inline Errors (Form Validation)

Display errors directly below form fields:

```jsx
<Input
  label="Email"
  value={email}
  onChange={setEmail}
  error={errors.email} // "Please enter a valid email"
/>
```

#### 2. Toast Notifications (API Errors)

Display temporary error messages for API failures:

```javascript
try {
  await api.saveStudent(data);
  showToast({ type: 'success', message: 'Student saved successfully' });
} catch (error) {
  showToast({ type: 'error', message: error.message || 'Failed to save student' });
}
```

#### 3. Error Pages (Critical Failures)

Display full-page error states for critical failures:

- **404 Not Found**: Page doesn't exist
- **403 Forbidden**: Insufficient permissions
- **500 Server Error**: Backend failure
- **Network Error**: No internet connection

```jsx
<ErrorPage
  code="404"
  title="Page Not Found"
  message="The page you're looking for doesn't exist."
  action={<Button onClick={() => navigate('/')}>Go to Dashboard</Button>}
/>
```

#### 4. Empty States (No Data)

Display helpful messages when no data is available:

```jsx
<EmptyState
  icon={<UsersIcon />}
  title="No students found"
  message="Get started by adding your first student."
  action={<Button onClick={openAddModal}>Add Student</Button>}
/>
```

### Error Recovery Strategies

1. **Retry Logic**: Automatically retry failed API requests (3 attempts with exponential backoff)
2. **Offline Support**: Queue actions when offline, sync when online (existing functionality)
3. **Graceful Degradation**: Show cached data when API fails
4. **User Feedback**: Always inform users about errors and recovery options

### Validation Error Handling

#### Client-Side Validation

Validate form inputs before submission:

```javascript
const validateForm = (values) => {
  const errors = {};
  
  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
    errors.email = 'Invalid email address';
  }
  
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  
  return errors;
};
```

#### Server-Side Validation

Display backend validation errors:

```javascript
try {
  await api.saveStudent(data);
} catch (error) {
  if (error.response?.status === 422) {
    // Validation errors from backend
    const backendErrors = error.response.data.errors;
    setErrors(backendErrors);
  } else {
    showToast({ type: 'error', message: 'Failed to save student' });
  }
}
```

### Accessibility Error Handling

1. **ARIA Live Regions**: Announce errors to screen readers
2. **Focus Management**: Move focus to first error field
3. **Error Summary**: Display list of all errors at top of form
4. **Visual Indicators**: Use color + icon (not color alone)

```jsx
<div role="alert" aria-live="polite">
  {error && <span className="error-message">{error}</span>}
</div>
```


## Testing Strategy

### Overview

This UI/UX redesign project requires comprehensive testing to ensure visual consistency, accessibility, and functionality across all components and pages. Since this is primarily a UI implementation project, **property-based testing is NOT applicable**. Instead, we will use:

1. **Unit Tests**: Component behavior and logic
2. **Integration Tests**: Component interactions and data flow
3. **Visual Regression Tests**: UI consistency across themes and languages
4. **Accessibility Tests**: WCAG AA compliance
5. **E2E Tests**: Critical user workflows
6. **Manual Testing**: Cross-browser and responsive design validation

### Unit Testing

**Tool**: Vitest + React Testing Library

**Scope**: Test individual components in isolation

**Coverage Goals**:
- Component rendering
- Props handling
- User interactions (clicks, inputs, keyboard navigation)
- State changes
- Conditional rendering
- Error states

**Example Test Structure**:

```javascript
// Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant class', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByText('Primary');
    expect(button).toHaveClass('primary');
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('shows loading spinner when loading prop is true', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

**Test Coverage Requirements**:
- Minimum 80% code coverage for all components
- 100% coverage for critical components (Button, Input, Modal, Table)

### Integration Testing

**Tool**: Vitest + React Testing Library

**Scope**: Test component interactions and data flow

**Example Test Structure**:

```javascript
// StudentList.integration.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StudentList from './StudentList';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { LanguageProvider } from '../../contexts/LanguageContext';

describe('Student List Integration', () => {
  it('filters students when search term is entered', async () => {
    const mockStudents = [
      { id: 1, name: 'John Doe', class: '10A' },
      { id: 2, name: 'Jane Smith', class: '10B' },
    ];
    
    render(
      <ThemeProvider>
        <LanguageProvider>
          <StudentList students={mockStudents} />
        </LanguageProvider>
      </ThemeProvider>
    );
    
    const searchInput = screen.getByPlaceholderText('Search students...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('opens modal when add button is clicked', () => {
    render(<StudentList students={[]} />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add New Student')).toBeInTheDocument();
  });
});
```

### Visual Regression Testing

**Tool**: Playwright + Percy or Chromatic

**Scope**: Capture screenshots and detect visual changes

**Test Cases**:
1. All components in light mode
2. All components in dark mode
3. All components in English, Amharic, and Arabic
4. All pages at mobile, tablet, and desktop breakpoints
5. Interactive states (hover, focus, active, disabled)

**Example Test Structure**:

```javascript
// visual-regression.spec.js
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('Button variants in light mode', async ({ page }) => {
    await page.goto('/component-showcase?component=button&theme=light');
    await expect(page).toHaveScreenshot('button-variants-light.png');
  });

  test('Button variants in dark mode', async ({ page }) => {
    await page.goto('/component-showcase?component=button&theme=dark');
    await expect(page).toHaveScreenshot('button-variants-dark.png');
  });

  test('Dashboard in Arabic (RTL)', async ({ page }) => {
    await page.goto('/dashboard?lang=ar');
    await expect(page).toHaveScreenshot('dashboard-arabic-rtl.png');
  });

  test('Student List on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/students');
    await expect(page).toHaveScreenshot('student-list-mobile.png');
  });
});
```

### Accessibility Testing

**Tools**: 
- axe-core (automated testing)
- NVDA/JAWS (manual screen reader testing)
- Keyboard navigation testing

**Test Cases**:
1. Color contrast ratios (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
2. Keyboard navigation (Tab, Enter, Escape, Arrow keys)
3. Focus indicators (visible and 3:1 contrast)
4. ARIA labels and roles
5. Form labels and error associations
6. Screen reader announcements

**Example Test Structure**:

```javascript
// accessibility.test.jsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Button from './Button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct ARIA label when icon-only', () => {
    const { getByRole } = render(
      <Button ariaLabel="Close" icon={<CloseIcon />} />
    );
    expect(getByRole('button')).toHaveAttribute('aria-label', 'Close');
  });
});
```

**Manual Accessibility Testing Checklist**:
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical
- [ ] Focus indicators are visible
- [ ] Screen reader announces all content correctly
- [ ] Form errors are announced
- [ ] Modal focus is trapped
- [ ] Skip links work correctly
- [ ] Color contrast meets WCAG AA
- [ ] Text can be resized to 200% without loss of functionality

### End-to-End Testing

**Tool**: Playwright

**Scope**: Test critical user workflows

**Test Cases**:
1. Login flow (all user types)
2. Student registration workflow
3. Mark entry workflow
4. Fee payment workflow
5. Report generation workflow
6. Theme switching
7. Language switching
8. Mobile navigation

**Example Test Structure**:

```javascript
// login.e2e.spec.js
import { test, expect } from '@playwright/test';

test.describe('Admin Login Flow', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login/admin');
    
    await page.fill('[name="branchCode"]', 'TEST001');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'password123');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login/admin');
    
    await page.fill('[name="branchCode"]', 'TEST001');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });
});
```

### Performance Testing

**Tool**: Lighthouse CI

**Metrics**:
- Performance score > 90
- First Contentful Paint (FCP) < 1.8s
- Time to Interactive (TTI) < 3.8s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
- Total Blocking Time (TBT) < 300ms

**Test Strategy**:
1. Run Lighthouse audits on all major pages
2. Test with throttled network (3G)
3. Test with throttled CPU (4x slowdown)
4. Monitor bundle sizes
5. Analyze code splitting effectiveness

### Cross-Browser Testing

**Browsers**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Test Strategy**:
1. Automated tests run on all browsers via Playwright
2. Manual testing for visual consistency
3. RTL layout verification in all browsers
4. Dark mode verification in all browsers

### Responsive Design Testing

**Breakpoints**:
- Mobile: 320px, 375px, 414px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1440px, 1920px

**Test Strategy**:
1. Automated viewport testing via Playwright
2. Manual testing on real devices
3. Touch target size verification (44x44px minimum)
4. Horizontal scroll detection (should not occur)

### Test Execution Plan

**Phase 1: Component Development**
- Write unit tests alongside component development
- Achieve 80% code coverage before moving to next component
- Run tests on every commit (CI/CD)

**Phase 2: Page Integration**
- Write integration tests for page-level interactions
- Run visual regression tests
- Run accessibility tests

**Phase 3: E2E Testing**
- Write E2E tests for critical workflows
- Run cross-browser tests
- Run responsive design tests

**Phase 4: Performance Testing**
- Run Lighthouse audits
- Optimize based on results
- Re-test to verify improvements

**Phase 5: Manual Testing**
- Cross-browser manual testing
- Screen reader testing
- Real device testing
- User acceptance testing

### Continuous Integration

**CI Pipeline**:
1. Lint code (ESLint)
2. Run unit tests (Vitest)
3. Run integration tests (Vitest)
4. Run E2E tests (Playwright)
5. Run accessibility tests (axe-core)
6. Run Lighthouse audits
7. Generate coverage report
8. Block merge if tests fail or coverage drops


## Theme System Implementation

### CSS Variables Architecture

The theme system uses CSS custom properties (variables) for dynamic theming:

```css
/* theme.css */
:root {
  /* Color Palette - Light Mode */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-active: #1d4ed8;
  
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #06b6d4;
  
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-border: #e5e7eb;
  
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-text-disabled: #9ca3af;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-amharic: 'Noto Sans Ethiopic', sans-serif;
  
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  
  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
  
  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
  
  /* Z-index */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}

/* Dark Mode */
[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-primary-hover: #3b82f6;
  --color-primary-active: #2563eb;
  
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-danger: #f87171;
  --color-info: #22d3ee;
  
  --color-background: #111827;
  --color-surface: #1f2937;
  --color-border: #374151;
  
  --color-text: #f9fafb;
  --color-text-secondary: #d1d5db;
  --color-text-disabled: #9ca3af;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}

/* RTL Support */
[dir="rtl"] {
  --text-align: right;
  --flex-direction: row-reverse;
}

[dir="ltr"] {
  --text-align: left;
  --flex-direction: row;
}
```

### Theme Context Implementation

```javascript
// contexts/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### Language Context Implementation

```javascript
// contexts/LanguageContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n/config';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'en';
  });

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('language', language);
  }, [language]);

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
```

## Responsive Design Implementation

### Breakpoint System

```javascript
// utils/breakpoints.js
export const breakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
};

export const mediaQueries = {
  mobile: `@media (max-width: ${breakpoints.tablet - 1}px)`,
  tablet: `@media (min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.desktop}px)`,
  tabletAndUp: `@media (min-width: ${breakpoints.tablet}px)`,
  desktopAndUp: `@media (min-width: ${breakpoints.desktop}px)`,
};

// Custom hook for responsive behavior
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

// Usage
const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet - 1}px)`);
const isTablet = useMediaQuery(`(min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px)`);
const isDesktop = useMediaQuery(`(min-width: ${breakpoints.desktop}px)`);
```

### Responsive Component Example

```css
/* Component.module.css */
.container {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* Mobile: 320px - 767px (default) */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
}

/* Tablet: 768px - 1023px */
@media (min-width: 768px) {
  .container {
    padding: var(--spacing-lg);
  }
  
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-lg);
  }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-xl);
  }
  
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-xl);
  }
}
```

## Accessibility Implementation

### Focus Management

```css
/* Global focus styles */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Skip to main content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary);
  color: white;
  padding: var(--spacing-sm) var(--spacing-md);
  text-decoration: none;
  z-index: var(--z-tooltip);
}

.skip-link:focus {
  top: 0;
}
```

### ARIA Implementation

```jsx
// Example: Accessible Modal
const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      modalRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 id="modal-title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className={styles.closeButton}
          >
            <XIcon />
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};
```

### Keyboard Navigation

```javascript
// Example: Keyboard-accessible dropdown
const Dropdown = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
    }
  };

  return (
    <div className={styles.dropdown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={styles.trigger}
      >
        {value || 'Select option'}
      </button>
      {isOpen && (
        <ul role="listbox" className={styles.menu}>
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={focusedIndex === index ? styles.focused : ''}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```


## Performance Optimization

### Code Splitting Strategy

```javascript
// App.jsx - Route-based code splitting
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './COMPONENTS/LoadingSpinner/LoadingSpinner';

// Lazy load page components
const Dashboard = lazy(() => import('./PAGE/Dashboard/Dashboard'));
const StudentList = lazy(() => import('./PAGE/List/StudentList'));
const StaffList = lazy(() => import('./PAGE/List/StaffList'));
const Academic = lazy(() => import('./PAGE/Academic/Academic'));
const Finance = lazy(() => import('./PAGE/Finance/Finance'));
const HR = lazy(() => import('./PAGE/HR/HR'));
const Communication = lazy(() => import('./PAGE/Communication/Communication'));
const Settings = lazy(() => import('./PAGE/Setting/Setting'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/staff" element={<StaffList />} />
          <Route path="/academic/*" element={<Academic />} />
          <Route path="/finance/*" element={<Finance />} />
          <Route path="/hr/*" element={<HR />} />
          <Route path="/communication/*" element={<Communication />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### Component Lazy Loading

```javascript
// Lazy load heavy components
const ChartComponent = lazy(() => import('./ChartComponent'));
const DataTable = lazy(() => import('./DataTable'));

// Usage with fallback
<Suspense fallback={<Skeleton variant="rectangular" height={300} />}>
  <ChartComponent data={chartData} />
</Suspense>
```

### Image Optimization

```javascript
// Image component with lazy loading and WebP support
const OptimizedImage = ({ src, alt, width, height, className }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <div ref={imgRef} className={className}>
      {isLoading && <Skeleton variant="rectangular" width={width} height={height} />}
      {imageSrc && (
        <picture>
          <source srcSet={`${imageSrc}.webp`} type="image/webp" />
          <img
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            onLoad={() => setIsLoading(false)}
          />
        </picture>
      )}
    </div>
  );
};
```

### Font Optimization

```css
/* Font loading strategy */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
}

@font-face {
  font-family: 'Noto Sans Ethiopic';
  src: url('/fonts/noto-sans-ethiopic-subset.woff2') format('woff2');
  font-weight: 400 700;
  font-display: swap;
  font-style: normal;
  unicode-range: U+1200-137F, U+1380-139F, U+2D80-2DDF;
}
```

### CSS Optimization

```javascript
// vite.config.js - CSS optimization
export default {
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },
  build: {
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['lucide-react'],
        },
      },
    },
  },
};
```

### Memoization Strategy

```javascript
// Memoize expensive computations
const StudentList = ({ students, filters }) => {
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (filters.class && student.class !== filters.class) return false;
      if (filters.status && student.status !== filters.status) return false;
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return student.name.toLowerCase().includes(term) ||
               student.id.toLowerCase().includes(term);
      }
      return true;
    });
  }, [students, filters]);

  return <Table data={filteredStudents} />;
};

// Memoize components that don't need frequent re-renders
const StatCard = memo(({ title, value, icon, trend }) => {
  return (
    <div className={styles.statCard}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.content}>
        <h3>{title}</h3>
        <p className={styles.value}>{value}</p>
        {trend && <span className={styles.trend}>{trend}</span>}
      </div>
    </div>
  );
});
```

### Virtual Scrolling for Large Lists

```javascript
// Use react-window for large lists
import { FixedSizeList } from 'react-window';

const VirtualizedStudentList = ({ students }) => {
  const Row = ({ index, style }) => (
    <div style={style} className={styles.row}>
      <span>{students[index].name}</span>
      <span>{students[index].class}</span>
      <span>{students[index].status}</span>
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={students.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### Debouncing and Throttling

```javascript
// Custom hooks for performance
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = now;
    }
  }, [callback, delay]);
};

// Usage
const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      performSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
};
```

## Animation and Transitions

### CSS Transitions

```css
/* Smooth transitions for interactive elements */
.button {
  background-color: var(--color-primary);
  transition: background-color var(--transition-fast),
              transform var(--transition-fast),
              box-shadow var(--transition-fast);
}

.button:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

/* Modal animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modalBackdrop {
  animation: fadeIn var(--transition-base);
}

.modalContent {
  animation: slideUp var(--transition-base);
}

/* Toast animations */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.toast {
  animation: slideInRight var(--transition-base);
}

.toast.exiting {
  animation: slideOutRight var(--transition-base);
}

/* Sidebar collapse animation */
.sidebar {
  width: 250px;
  transition: width var(--transition-base);
}

.sidebar.collapsed {
  width: 60px;
}

/* Skeleton loading animation */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface) 0%,
    var(--color-border) 50%,
    var(--color-surface) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### React Transition Group

```javascript
// Animated list transitions
import { TransitionGroup, CSSTransition } from 'react-transition-group';

const AnimatedList = ({ items }) => {
  return (
    <TransitionGroup>
      {items.map(item => (
        <CSSTransition
          key={item.id}
          timeout={300}
          classNames="list-item"
        >
          <div className={styles.listItem}>
            {item.content}
          </div>
        </CSSTransition>
      ))}
    </TransitionGroup>
  );
};

// CSS for transitions
.list-item-enter {
  opacity: 0;
  transform: translateY(-10px);
}

.list-item-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms, transform 300ms;
}

.list-item-exit {
  opacity: 1;
  transform: translateY(0);
}

.list-item-exit-active {
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 300ms, transform 300ms;
}
```

## Internationalization (i18n)

### Translation File Structure

```
src/i18n/
  ├─ config.js
  └─ locales/
      ├─ en/
      │   ├─ common.json
      │   ├─ navigation.json
      │   ├─ students.json
      │   ├─ staff.json
      │   ├─ academic.json
      │   ├─ finance.json
      │   ├─ hr.json
      │   ├─ communication.json
      │   └─ settings.json
      ├─ am/
      │   └─ (same structure)
      └─ ar/
          └─ (same structure)
```

### i18n Configuration

```javascript
// i18n/config.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from './locales/en/common.json';
import enNavigation from './locales/en/navigation.json';
import amCommon from './locales/am/common.json';
import amNavigation from './locales/am/navigation.json';
import arCommon from './locales/ar/common.json';
import arNavigation from './locales/ar/navigation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        navigation: enNavigation,
        // ... other namespaces
      },
      am: {
        common: amCommon,
        navigation: amNavigation,
        // ... other namespaces
      },
      ar: {
        common: arCommon,
        navigation: arNavigation,
        // ... other namespaces
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

### Translation Usage

```javascript
// Using translations in components
import { useTranslation } from 'react-i18next';

const StudentList = () => {
  const { t } = useTranslation(['students', 'common']);

  return (
    <div>
      <h1>{t('students:title')}</h1>
      <Button>{t('common:add')}</Button>
      <p>{t('students:totalCount', { count: 150 })}</p>
    </div>
  );
};
```

### RTL Layout Implementation

```css
/* RTL-specific styles */
[dir="rtl"] .sidebar {
  right: 0;
  left: auto;
}

[dir="rtl"] .header {
  flex-direction: row-reverse;
}

[dir="rtl"] .breadcrumbs {
  direction: rtl;
}

[dir="rtl"] .table {
  direction: rtl;
}

/* Logical properties for automatic RTL support */
.element {
  margin-inline-start: var(--spacing-md);
  margin-inline-end: var(--spacing-lg);
  padding-inline: var(--spacing-md);
  border-inline-start: 1px solid var(--color-border);
}
```


## Page-Specific Designs

### Login Pages

**Design Approach**: Modern, centered card layout with branding

**Structure**:
```
┌─────────────────────────────────────────┐
│                                         │
│          [School Logo]                  │
│                                         │
│     ┌─────────────────────────┐        │
│     │                         │        │
│     │   Login to Skoolific    │        │
│     │                         │        │
│     │   [Branch Code Input]   │        │
│     │   [Username Input]      │        │
│     │   [Password Input]      │        │
│     │                         │        │
│     │   [Login Button]        │        │
│     │                         │        │
│     │   [Language Selector]   │        │
│     │   [Theme Toggle]        │        │
│     │                         │        │
│     └─────────────────────────┘        │
│                                         │
└─────────────────────────────────────────┘
```

**Features**:
- Centered card with shadow
- School logo at top
- Clear input labels
- Loading state on button
- Error messages below inputs
- Language selector (EN/AM/AR)
- Theme toggle (light/dark)
- Responsive on all devices

**Files**:
- `src/COMPONENTS/AdminLogin.jsx` (update existing)
- `src/COMPONENTS/StaffLogin.jsx` (update existing)
- `src/COMPONENTS/StudentLogin.jsx` (update existing)
- `src/COMPONENTS/GuardianLogin.jsx` (update existing)

### Dashboard

**Design Approach**: Card-based layout with stats, charts, and activity

**Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Header (Breadcrumbs, Search, Notifications, Profile) │
├─────────┼─────────────────────────────────────────────────────┤
│         │                                                     │
│  Nav    │  Dashboard                                          │
│  Menu   │                                                     │
│         │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│         │  │ 1,234│ │  456 │ │ 95%  │ │ 87%  │             │
│         │  │Students│Staff │Attend│ Fees │             │
│         │  └──────┘ └──────┘ └──────┘ └──────┘             │
│         │                                                     │
│         │  ┌─────────────────┐ ┌─────────────────┐          │
│         │  │ Attendance      │ │ Enrollment      │          │
│         │  │ Trend Chart     │ │ Trend Chart     │          │
│         │  │                 │ │                 │          │
│         │  └─────────────────┘ └─────────────────┘          │
│         │                                                     │
│         │  ┌─────────────────┐ ┌─────────────────┐          │
│         │  │ Recent Activity │ │ Upcoming Events │          │
│         │  │ - Student added │ │ - Math Exam     │          │
│         │  │ - Fee paid      │ │ - Parent Meet   │          │
│         │  │ - Mark entered  │ │ - Holiday       │          │
│         │  └─────────────────┘ └─────────────────┘          │
│         │                                                     │
└─────────┴─────────────────────────────────────────────────────┘
```

**Features**:
- 4 stat cards in responsive grid
- 2 chart cards (attendance, enrollment)
- Recent activity list
- Upcoming events list
- Responsive: 1 column (mobile), 2 columns (tablet), 4 columns (desktop) for stats

**Files**:
- `src/PAGE/Dashboard/Dashboard.jsx` (update existing)
- `src/PAGE/Dashboard/Dashboard.module.css` (update existing)

### Student List Page

**Design Approach**: Table with filters and pagination

**Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Header                                              │
├─────────┼─────────────────────────────────────────────────────┤
│         │                                                     │
│  Nav    │  Students                                           │
│  Menu   │                                                     │
│         │  ┌─────────────────────────────────────────────┐   │
│         │  │ [Search] [Class Filter] [Status Filter] [+] │   │
│         │  └─────────────────────────────────────────────┘   │
│         │                                                     │
│         │  ┌─────────────────────────────────────────────┐   │
│         │  │ Name       │ Class │ Status  │ Actions     │   │
│         │  ├────────────┼───────┼─────────┼─────────────┤   │
│         │  │ John Doe   │ 10A   │ Active  │ [View][Edit]│   │
│         │  │ Jane Smith │ 10B   │ Active  │ [View][Edit]│   │
│         │  │ ...        │ ...   │ ...     │ ...         │   │
│         │  └─────────────────────────────────────────────┘   │
│         │                                                     │
│         │  [< Previous] [1] [2] [3] [Next >]                 │
│         │                                                     │
└─────────┴─────────────────────────────────────────────────────┘
```

**Features**:
- Search bar with real-time filtering
- Class and status dropdown filters
- Add button opens modal
- Sortable table columns
- Pagination controls
- Row actions (view, edit, delete)
- Responsive: horizontal scroll on mobile

**Files**:
- `src/PAGE/List/StudentList.jsx` (update existing)
- `src/PAGE/List/StudentList.module.css` (update existing)

### Student Profile Page

**Design Approach**: Card-based sections for different info types

**Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Header                                              │
├─────────┼─────────────────────────────────────────────────────┤
│         │                                                     │
│  Nav    │  Student Profile                                    │
│  Menu   │                                                     │
│         │  ┌─────────────────┐ ┌─────────────────┐          │
│         │  │ Personal Info   │ │ Academic Info   │          │
│         │  │ - Name          │ │ - Class         │          │
│         │  │ - DOB           │ │ - Section       │          │
│         │  │ - Gender        │ │ - Roll Number   │          │
│         │  │ - Photo         │ │ - Admission Date│          │
│         │  └─────────────────┘ └─────────────────┘          │
│         │                                                     │
│         │  ┌─────────────────┐ ┌─────────────────┐          │
│         │  │ Attendance      │ │ Fee Status      │          │
│         │  │ - Present: 95%  │ │ - Paid: $500    │          │
│         │  │ - Absent: 5%    │ │ - Pending: $100 │          │
│         │  │ - Late: 2%      │ │ - Total: $600   │          │
│         │  └─────────────────┘ └─────────────────┘          │
│         │                                                     │
└─────────┴─────────────────────────────────────────────────────┘
```

**Features**:
- Card-based layout for info sections
- Edit button for each section
- Photo upload
- Responsive grid (1 column mobile, 2 columns tablet/desktop)

**Files**:
- `src/COMPONENTS/StudentProfile.jsx` (update existing)
- `src/COMPONENTS/StudentProfile.module.css` (update existing)

### Settings Page

**Design Approach**: Tabbed interface for different settings categories

**Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Header                                              │
├─────────┼─────────────────────────────────────────────────────┤
│         │                                                     │
│  Nav    │  Settings                                           │
│  Menu   │                                                     │
│         │  [School Info] [Branding] [Language] [Password]    │
│         │  [Sub-Accounts] [Permissions]                      │
│         │  ─────────────────────────────────────────────     │
│         │                                                     │
│         │  School Info Tab:                                   │
│         │  ┌─────────────────────────────────────────────┐   │
│         │  │ School Name:    [________________]          │   │
│         │  │ Address:        [________________]          │   │
│         │  │ Phone:          [________________]          │   │
│         │  │ Email:          [________________]          │   │
│         │  │                                             │   │
│         │  │ [Save Changes]                              │   │
│         │  └─────────────────────────────────────────────┘   │
│         │                                                     │
└─────────┴─────────────────────────────────────────────────────┘
```

**Features**:
- Horizontal tab navigation
- Each tab shows different settings form
- Save button per tab
- Success/error toast notifications
- Responsive tabs (dropdown on mobile)

**Files**:
- `src/PAGE/Setting/Setting.jsx` (update existing)
- `src/PAGE/Setting/Setting.module.css` (update existing)

## Migration Strategy

### Phase 1: Design System Foundation (Week 1-2)

**Goal**: Build reusable component library

**Tasks**:
1. Set up theme system (CSS variables, ThemeContext)
2. Create base components (Button, Input, Card, Modal)
3. Create form components (Select, Checkbox, Radio, Textarea)
4. Create feedback components (Toast, Loading, Skeleton)
5. Create data display components (Table, Badge, StatCard)
6. Write unit tests for all components
7. Create component showcase page

**Deliverables**:
- Complete design system component library
- Component documentation
- Unit tests with 80%+ coverage
- Component showcase page

### Phase 2: Layout Components (Week 3)

**Goal**: Build consistent page structure

**Tasks**:
1. Create Sidebar component with navigation
2. Create Header component with utilities
3. Create PageLayout wrapper component
4. Create Footer component
5. Implement responsive behavior
6. Write integration tests

**Deliverables**:
- Complete layout system
- Responsive navigation
- Integration tests

### Phase 3: Login Pages Redesign (Week 4)

**Goal**: Modernize all login pages

**Tasks**:
1. Update AdminLogin component
2. Update StaffLogin component
3. Update StudentLogin component
4. Update GuardianLogin component
5. Implement theme toggle
6. Implement language selector
7. Write E2E tests for login flows

**Deliverables**:
- Modern login pages for all user types
- Theme and language support
- E2E tests

### Phase 4: Dashboard Redesign (Week 5)

**Goal**: Create modern dashboard

**Tasks**:
1. Update Dashboard component
2. Implement stat cards
3. Integrate charts (reuse existing chart library)
4. Create recent activity section
5. Create upcoming events section
6. Implement responsive layout
7. Write integration tests

**Deliverables**:
- Modern dashboard with stats and charts
- Responsive layout
- Integration tests

### Phase 5: Student Module Redesign (Week 6-7)

**Goal**: Modernize student management pages

**Tasks**:
1. Update StudentList page
2. Update StudentProfile page
3. Update StudentRegistration page
4. Update StudentAttendance page
5. Implement filters and search
6. Implement pagination
7. Write integration and E2E tests

**Deliverables**:
- Modern student management pages
- Improved usability
- Integration and E2E tests

### Phase 6: Staff Module Redesign (Week 8)

**Goal**: Modernize staff management pages

**Tasks**:
1. Update StaffList page
2. Update StaffProfile page
3. Update StaffRegistration page
4. Implement filters and search
5. Implement pagination
6. Write integration tests

**Deliverables**:
- Modern staff management pages
- Integration tests

### Phase 7: Academic Module Redesign (Week 9-10)

**Goal**: Modernize academic pages

**Tasks**:
1. Update MarkLists page
2. Update ExamCreation page
3. Update AITestGenerator page
4. Update ReportCards page
5. Update Schedule page
6. Write integration tests

**Deliverables**:
- Modern academic module pages
- Integration tests

### Phase 8: Finance Module Redesign (Week 11)

**Goal**: Modernize finance pages

**Tasks**:
1. Update FeeManagement page
2. Update Invoices page
3. Update Payments page
4. Update FinancialReports page
5. Write integration tests

**Deliverables**:
- Modern finance module pages
- Integration tests

### Phase 9: HR Module Redesign (Week 12)

**Goal**: Modernize HR pages

**Tasks**:
1. Update SalaryManagement page
2. Update TeacherAttendance page
3. Update LeaveManagement page
4. Update TimeAndShiftSettings page
5. Write integration tests

**Deliverables**:
- Modern HR module pages
- Integration tests

### Phase 10: Communication Module Redesign (Week 13)

**Goal**: Modernize communication pages

**Tasks**:
1. Update Posts page
2. Update Messages page
3. Update Notifications page
4. Write integration tests

**Deliverables**:
- Modern communication module pages
- Integration tests

### Phase 11: Settings Page Redesign (Week 14)

**Goal**: Modernize settings page

**Tasks**:
1. Update Settings page with tabbed interface
2. Implement all settings tabs
3. Write integration tests

**Deliverables**:
- Modern settings page
- Integration tests

### Phase 12: Polish and Optimization (Week 15-16)

**Goal**: Final polish and performance optimization

**Tasks**:
1. Run visual regression tests
2. Run accessibility audits
3. Run Lighthouse audits
4. Optimize performance (code splitting, lazy loading, image optimization)
5. Cross-browser testing
6. Responsive design testing
7. User acceptance testing
8. Bug fixes and refinements

**Deliverables**:
- Lighthouse score >90
- WCAG AA compliance
- Cross-browser compatibility
- Responsive design on all devices
- Production-ready UI

## Documentation Requirements

### Component Documentation

Each component must include:

1. **JSDoc Comments**:
```javascript
/**
 * Button component with multiple variants and states
 * 
 * @param {Object} props - Component props
 * @param {'primary'|'secondary'|'success'|'warning'|'danger'|'ghost'} props.variant - Button variant
 * @param {'small'|'medium'|'large'} props.size - Button size
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {boolean} props.loading - Whether button is in loading state
 * @param {Function} props.onClick - Click handler
 * @param {ReactNode} props.children - Button content
 * 
 * @example
 * <Button variant="primary" size="medium" onClick={handleClick}>
 *   Click me
 * </Button>
 */
```

2. **README.md** in component folder:
```markdown
# Button Component

## Usage

\`\`\`jsx
import Button from './COMPONENTS/Button/Button';

<Button variant="primary" onClick={handleClick}>
  Click me
</Button>
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | string | 'primary' | Button variant |
| size | string | 'medium' | Button size |
| disabled | boolean | false | Whether button is disabled |
| loading | boolean | false | Whether button is in loading state |
| onClick | function | - | Click handler |

## Examples

### Primary Button
\`\`\`jsx
<Button variant="primary">Primary</Button>
\`\`\`

### Loading State
\`\`\`jsx
<Button loading>Loading...</Button>
\`\`\`
```

### Style Guide Documentation

Create `STYLE_GUIDE.md`:
```markdown
# Skoolific V2 UI/UX Style Guide

## Colors

### Light Mode
- Primary: #3b82f6
- Success: #10b981
- Warning: #f59e0b
- Danger: #ef4444

### Dark Mode
- Primary: #60a5fa
- Success: #34d399
- Warning: #fbbf24
- Danger: #f87171

## Typography

- Font Family: Inter
- Base Size: 16px
- Scale: 0.75rem, 0.875rem, 1rem, 1.125rem, 1.25rem, 1.5rem, 1.875rem

## Spacing

- xs: 0.25rem (4px)
- sm: 0.5rem (8px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)
- 2xl: 3rem (48px)

## Breakpoints

- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+
```

### Translation Workflow Guide

Create `TRANSLATION_GUIDE.md`:
```markdown
# Translation Workflow Guide

## Adding a New Language

1. Create language folder: `src/i18n/locales/{lang_code}/`
2. Copy all JSON files from `en/` folder
3. Translate all strings
4. Update `src/i18n/config.js` to include new language
5. Add language option to LanguageSelector component

## Translation File Structure

Each module has its own translation file:
- common.json: Common UI strings
- navigation.json: Navigation menu items
- students.json: Student module strings
- staff.json: Staff module strings
- etc.

## Translation Keys

Use descriptive, hierarchical keys:
\`\`\`json
{
  "students": {
    "list": {
      "title": "Student List",
      "addButton": "Add Student",
      "searchPlaceholder": "Search students..."
    }
  }
}
\`\`\`
```

## Conclusion

This design document provides a comprehensive blueprint for implementing the Skoolific V2 UI/UX redesign. The design emphasizes:

1. **Modern User Experience**: Contemporary design patterns with smooth animations and intuitive interactions
2. **Accessibility**: WCAG AA compliance ensuring the system is usable by everyone
3. **Performance**: Optimized loading and rendering for fast, responsive experience
4. **Consistency**: Comprehensive design system ensuring uniform UI across all modules
5. **Responsiveness**: Optimal experience on mobile, tablet, and desktop devices
6. **Internationalization**: Full support for English, Amharic, and Arabic with RTL layout
7. **Maintainability**: Well-documented, reusable components for future development

The implementation will follow a phased approach over 16 weeks, starting with the design system foundation and progressively updating all modules. Each phase includes comprehensive testing to ensure quality and reliability.

