# UI/UX Quick Start Guide

## Getting Started with the New Design System

This guide helps developers quickly implement the new UI/UX design system in Skoolific V2.

## 🎨 Design System Overview

The new design system includes:
- ✅ **Modern, Professional Design** - Clean and contemporary
- ✅ **Dark Mode** - Automatic and manual theme switching
- ✅ **Multi-Language** - English, Amharic, Arabic (changes apply to ALL pages)
- ✅ **Responsive** - Mobile, tablet, desktop optimized
- ✅ **Accessible** - WCAG 2.1 AA compliant

## 📦 Installation

### 1. Install Dependencies

```bash
npm install i18next react-i18next i18next-browser-languagedetector
npm install lucide-react  # For icons
```

### 2. Set Up Theme System

Create the theme context:

```javascript
// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### 3. Set Up i18n

Create i18n configuration:

```javascript
// src/i18n/config.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import am from './locales/am.json';
import ar from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
      ar: { translation: ar }
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
```

### 4. Add CSS Variables

Create theme CSS file:

```css
/* src/styles/theme.css */
:root {
  /* Light Mode */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border-primary: #e5e7eb;
  --color-primary: #8b5cf6;
  --color-secondary: #14b8a6;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.dark {
  /* Dark Mode */
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --border-primary: #374151;
  --color-primary: #a78bfa;
  --color-secondary: #2dd4bf;
}

* {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}
```

### 5. Wrap Your App

```javascript
// src/main.jsx or src/App.jsx
import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import './i18n/config';
import './styles/theme.css';

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

## 🎯 Quick Examples

### Example 1: Using Theme

```javascript
import { useTheme } from './contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? <Moon /> : <Sun />}
    </button>
  );
}
```

### Example 2: Using Translations

```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.welcome', { name: 'Admin' })}</p>
    </div>
  );
}
```

### Example 3: Language Selector

```javascript
import { useTranslation } from 'react-i18next';

function LanguageSelector() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  };
  
  return (
    <select onChange={(e) => changeLanguage(e.target.value)} value={i18n.language}>
      <option value="en">English</option>
      <option value="am">አማርኛ</option>
      <option value="ar">العربية</option>
    </select>
  );
}
```

### Example 4: Styled Component

```javascript
// MyComponent.jsx
import styles from './MyComponent.module.css';

function MyComponent() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Hello World</h1>
    </div>
  );
}
```

```css
/* MyComponent.module.css */
.container {
  background-color: var(--bg-primary);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.title {
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 600;
}
```

## 📚 Component Usage

### Button Component

```javascript
import { Button } from './components/Button';

<Button variant="primary" size="md">
  Click Me
</Button>

<Button variant="secondary" size="lg" loading>
  Loading...
</Button>

<Button variant="outline" disabled>
  Disabled
</Button>
```

### Input Component

```javascript
import { Input } from './components/Input';
import { User } from 'lucide-react';

<Input 
  label="Username"
  icon={<User size={20} />}
  placeholder="Enter username"
  required
/>

<Input 
  type="password"
  label="Password"
  error="Password is required"
/>
```

### Card Component

```javascript
import { Card } from './components/Card';

<Card 
  title="My Card"
  subtitle="Card description"
  actions={<Button>Action</Button>}
>
  Card content goes here
</Card>
```

### Modal Component

```javascript
import { Modal } from './components/Modal';
import { useState } from 'react';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      
      <Modal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="My Modal"
        size="md"
      >
        Modal content
      </Modal>
    </>
  );
}
```

### Table Component

```javascript
import { Table } from './components/Table';

const columns = [
  { header: 'Name', accessor: 'name' },
  { header: 'Email', accessor: 'email' },
  { 
    header: 'Actions', 
    render: (row) => <Button>Edit</Button>
  }
];

const data = [
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' }
];

<Table 
  columns={columns}
  data={data}
  onRowClick={(row) => console.log(row)}
/>
```

## 🎨 Color Usage

```css
/* Use semantic color variables */
.success { color: var(--color-success); }
.warning { color: var(--color-warning); }
.error { color: var(--color-error); }
.info { color: var(--color-info); }

/* Use brand colors */
.primary { color: var(--color-primary); }
.secondary { color: var(--color-secondary); }
```

## 📱 Responsive Design

```css
/* Mobile First */
.container {
  padding: 16px;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 24px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 32px;
  }
}
```

## ♿ Accessibility

```javascript
// Always add labels
<Input label="Email" id="email" />

// Add ARIA labels for icons
<button aria-label="Close modal">
  <X size={20} />
</button>

// Use semantic HTML
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

// Ensure keyboard navigation
<button onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
  Click Me
</button>
```

## 🌍 Translation Files

Create translation files for each language:

```json
// src/i18n/locales/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back, {{name}}"
  }
}
```

```json
// src/i18n/locales/am.json
{
  "common": {
    "save": "አስቀምጥ",
    "cancel": "ሰርዝ",
    "delete": "ሰርዝ"
  },
  "dashboard": {
    "title": "ዳሽቦርድ",
    "welcome": "እንኳን ደህና መጡ, {{name}}"
  }
}
```

## 🚀 Next Steps

1. Review the full design documentation:
   - [UI_UX_DESIGN_SYSTEM.md](./UI_UX_DESIGN_SYSTEM.md)
   - [UI_COMPONENTS_AND_PAGES.md](./UI_COMPONENTS_AND_PAGES.md)
   - [UI_DESIGN_SUMMARY.md](./UI_DESIGN_SUMMARY.md)

2. Set up the theme and i18n systems
3. Create reusable components
4. Implement page designs
5. Test across devices and browsers
6. Conduct accessibility audit

## 📖 Resources

- **React**: https://react.dev
- **i18next**: https://www.i18next.com
- **Lucide Icons**: https://lucide.dev
- **CSS Modules**: https://github.com/css-modules/css-modules
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/

## 💡 Tips

1. **Always use CSS variables** for colors, spacing, and other design tokens
2. **Use the `t()` function** for all user-facing text
3. **Test in both light and dark modes** before committing
4. **Check RTL layout** when adding new components
5. **Follow the component patterns** established in the design system
6. **Write accessible HTML** with proper ARIA labels
7. **Test keyboard navigation** for all interactive elements

---

**Need Help?** Refer to the detailed design documents or ask the team!