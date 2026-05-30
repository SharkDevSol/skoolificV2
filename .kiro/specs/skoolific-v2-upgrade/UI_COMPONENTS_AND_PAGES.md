# UI/UX Design System Part 2: Component Library & Page Designs

## Component Library

### Button Components

#### Primary Button
```jsx
// components/Button/Button.jsx
import React from 'react';
import styles from './Button.module.css';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  icon,
  onClick,
  ...props 
}) => {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${disabled ? styles.disabled : ''} ${loading ? styles.loading : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{children}</span>
    </button>
  );
};
```

```css
/* Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  cursor: pointer;
  border: none;
  outline: none;
  font-family: inherit;
}

/* Sizes */
.sm {
  padding: 6px 12px;
  font-size: 14px;
  height: 32px;
}

.md {
  padding: 10px 20px;
  font-size: 16px;
  height: 40px;
}

.lg {
  padding: 12px 24px;
  font-size: 18px;
  height: 48px;
}

/* Variants */
.primary {
  background-color: var(--color-primary);
  color: white;
}

.primary:hover:not(.disabled) {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.primary:active:not(.disabled) {
  background-color: var(--color-primary-active);
  transform: translateY(0);
}

.secondary {
  background-color: var(--color-secondary);
  color: white;
}

.secondary:hover:not(.disabled) {
  background-color: var(--color-secondary-hover);
}

.outline {
  background-color: transparent;
  border: 2px solid var(--border-primary);
  color: var(--text-primary);
}

.outline:hover:not(.disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background-color: var(--bg-secondary);
}

.ghost {
  background-color: transparent;
  color: var(--text-primary);
}

.ghost:hover:not(.disabled) {
  background-color: var(--bg-secondary);
}

.danger {
  background-color: var(--color-error);
  color: white;
}

.danger:hover:not(.disabled) {
  background-color: #dc2626;
}

/* States */
.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  position: relative;
  color: transparent;
}

.spinner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Input Components

#### Text Input
```jsx
// components/Input/Input.jsx
import React, { forwardRef } from 'react';
import styles from './Input.module.css';

export const Input = forwardRef(({ 
  label,
  error,
  helperText,
  icon,
  required,
  ...props 
}, ref) => {
  return (
    <div className={styles.inputGroup}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <div className={`${styles.inputWrapper} ${error ? styles.error : ''}`}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          ref={ref}
          className={styles.input}
          {...props}
        />
      </div>
      
      {(error || helperText) && (
        <span className={`${styles.helperText} ${error ? styles.errorText : ''}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
});
```

```css
/* Input.module.css */
.inputGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.required {
  color: var(--color-error);
  margin-left: 4px;
}

.inputWrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input {
  width: 100%;
  padding: 10px 16px;
  font-size: 16px;
  border: 2px solid var(--border-primary);
  border-radius: var(--radius-md);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: all var(--transition-base);
}

.input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.input::placeholder {
  color: var(--text-tertiary);
}

.inputWrapper.error .input {
  border-color: var(--color-error);
}

.inputWrapper.error .input:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.icon {
  position: absolute;
  left: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
}

.inputWrapper .input:has(~ .icon) {
  padding-left: 40px;
}

.helperText {
  font-size: 12px;
  color: var(--text-secondary);
}

.errorText {
  color: var(--color-error);
}
```

### Card Component

```jsx
// components/Card/Card.jsx
import React from 'react';
import styles from './Card.module.css';

export const Card = ({ 
  children, 
  title, 
  subtitle,
  actions,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  ...props 
}) => {
  return (
    <div 
      className={`${styles.card} ${styles[variant]} ${styles[`padding-${padding}`]} ${hoverable ? styles.hoverable : ''}`}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className={styles.header}>
          <div className={styles.headerContent}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};
```

```css
/* Card.module.css */
.card {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.hoverable:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

/* Padding variants */
.padding-none {
  padding: 0;
}

.padding-sm {
  padding: 12px;
}

.padding-md {
  padding: 20px;
}

.padding-lg {
  padding: 32px;
}

/* Variants */
.default {
  /* Default styling */
}

.outlined {
  border: 2px solid var(--border-primary);
  box-shadow: none;
}

.elevated {
  box-shadow: var(--shadow-lg);
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-primary);
}

.headerContent {
  flex: 1;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

.actions {
  display: flex;
  gap: 8px;
}

.content {
  color: var(--text-primary);
}
```

### Modal Component

```jsx
// components/Modal/Modal.jsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return createPortal(
    <div className={styles.overlay} onClick={closeOnOverlayClick ? onClose : undefined}>
      <div 
        className={`${styles.modal} ${styles[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {showCloseButton && (
            <button className={styles.closeButton} onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>
        
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
```

```css
/* Modal.module.css */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background-color: var(--bg-elevated);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Sizes */
.sm {
  width: 400px;
}

.md {
  width: 600px;
}

.lg {
  width: 800px;
}

.xl {
  width: 1000px;
}

.full {
  width: 95vw;
  height: 95vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--border-primary);
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.closeButton {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 8px;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.closeButton:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}
```

### Table Component

```jsx
// components/Table/Table.jsx
import React from 'react';
import styles from './Table.module.css';

export const Table = ({ 
  columns, 
  data, 
  onRowClick,
  loading = false,
  emptyMessage = 'No data available'
}) => {
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((column, index) => (
              <th 
                key={index}
                className={styles.th}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex}
              className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column, colIndex) => (
                <td key={colIndex} className={styles.td}>
                  {column.render ? column.render(row) : row[column.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

```css
/* Table.module.css */
.tableWrapper {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-primary);
}

.table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--bg-elevated);
}

.thead {
  background-color: var(--bg-secondary);
  border-bottom: 2px solid var(--border-primary);
}

.th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tbody {
  /* Body styles */
}

.tr {
  border-bottom: 1px solid var(--border-primary);
  transition: background-color var(--transition-fast);
}

.tr:hover {
  background-color: var(--bg-secondary);
}

.tr.clickable {
  cursor: pointer;
}

.td {
  padding: 16px;
  font-size: 14px;
  color: var(--text-primary);
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Page Designs

### 1. Login Page

#### Design Specifications
- **Layout**: Centered card on full-screen background
- **Background**: Gradient with subtle pattern
- **Card**: Elevated with shadow, max-width 450px
- **Branding**: Logo at top, school name below
- **Form**: Clean, spacious inputs with icons
- **Actions**: Primary button, secondary links
- **Features**: Branch code input, remember me, language selector

#### Implementation
```jsx
// pages/Login/Login.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, User, Lock } from 'lucide-react';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { LanguageSelector } from '../../components/LanguageSelector';
import { ThemeToggle } from '../../components/ThemeToggle';
import styles from './Login.module.css';

export const Login = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    branchCode: '',
    username: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Login logic
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <LanguageSelector />
        <ThemeToggle />
      </div>
      
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.branding}>
            <img src="/logo.png" alt="Logo" className={styles.logo} />
            <h1 className={styles.title}>{t('app.name')}</h1>
            <p className={styles.subtitle}>{t('auth.adminLogin')}</p>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label={t('auth.branchCode')}
              icon={<Building2 size={20} />}
              value={formData.branchCode}
              onChange={(e) => setFormData({...formData, branchCode: e.target.value})}
              required
            />
            
            <Input
              label={t('auth.username')}
              icon={<User size={20} />}
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
            
            <Input
              type="password"
              label={t('auth.password')}
              icon={<Lock size={20} />}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
            
            <div className={styles.options}>
              <label className={styles.checkbox}>
                <input 
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({...formData, rememberMe: e.target.checked})}
                />
                <span>{t('auth.rememberMe')}</span>
              </label>
              
              <a href="#" className={styles.link}>
                {t('auth.forgotPassword')}
              </a>
            </div>
            
            <Button 
              type="submit" 
              variant="primary" 
              size="lg"
              loading={loading}
              className={styles.submitButton}
            >
              {t('auth.login')}
            </Button>
          </form>
        </div>
      </div>
      
      <div className={styles.footer}>
        <p>© 2025 Skoolific. {t('common.allRightsReserved')}</p>
      </div>
    </div>
  );
};
```

```css
/* Login.module.css */
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  position: relative;
  overflow: hidden;
}

.container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/pattern.svg');
  opacity: 0.1;
}

.header {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  gap: 12px;
  z-index: 10;
}

.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.card {
  width: 100%;
  max-width: 450px;
  background-color: var(--bg-elevated);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-2xl);
  padding: 48px;
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.branding {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
}

.link {
  font-size: 14px;
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-base);
}

.link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.submitButton {
  width: 100%;
  margin-top: 8px;
}

.footer {
  text-align: center;
  padding: 24px;
  color: white;
  font-size: 14px;
  position: relative;
  z-index: 1;
}
```

### 2. Dashboard Page

#### Design Specifications
- **Layout**: Sidebar + Main content area
- **Sidebar**: Fixed, collapsible, with navigation menu
- **Header**: Breadcrumbs, search, notifications, profile
- **Content**: Grid of stat cards, charts, recent activity
- **Cards**: Elevated, with icons and trend indicators
- **Charts**: Responsive, with tooltips and legends

#### Implementation
```jsx
// pages/Dashboard/Dashboard.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, GraduationCap, DollarSign, TrendingUp } from 'lucide-react';
import { Card } from '../../components/Card/Card';
import { StatCard } from '../../components/StatCard/StatCard';
import styles from './Dashboard.module.css';

export const Dashboard = () => {
  const { t } = useTranslation();
  
  const stats = [
    {
      title: t('dashboard.totalStudents'),
      value: '1,234',
      change: '+12%',
      trend: 'up',
      icon: <Users size={24} />,
      color: 'primary'
    },
    {
      title: t('dashboard.totalStaff'),
      value: '89',
      change: '+3%',
      trend: 'up',
      icon: <GraduationCap size={24} />,
      color: 'secondary'
    },
    {
      title: t('dashboard.revenue'),
      value: '$45,678',
      change: '+8%',
      trend: 'up',
      icon: <DollarSign size={24} />,
      color: 'success'
    },
    {
      title: t('dashboard.attendance'),
      value: '94.5%',
      change: '-2%',
      trend: 'down',
      icon: <TrendingUp size={24} />,
      color: 'warning'
    }
  ];
  
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('dashboard.title')}</h1>
          <p className={styles.subtitle}>{t('dashboard.welcome', { name: 'Admin' })}</p>
        </div>
      </div>
      
      <div className={styles.statsGrid}>
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
      
      <div className={styles.contentGrid}>
        <Card 
          title={t('dashboard.recentActivity')}
          className={styles.activityCard}
        >
          {/* Activity list */}
        </Card>
        
        <Card 
          title={t('dashboard.upcomingEvents')}
          className={styles.eventsCard}
        >
          {/* Events list */}
        </Card>
      </div>
    </div>
  );
};
```

```css
/* Dashboard.module.css */
.dashboard {
  padding: 24px;
}

.header {
  margin-bottom: 32px;
}

.title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.contentGrid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .contentGrid {
    grid-template-columns: 1fr;
  }
}
```

---

This document continues with more page designs, responsive layouts, and accessibility guidelines. Would you like me to continue with more pages?