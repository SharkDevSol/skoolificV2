# UI/UX Design System: Skoolific V2

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Design System Foundation](#design-system-foundation)
3. [Color System & Dark Mode](#color-system--dark-mode)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Component Library](#component-library)
7. [Multi-Language Support (i18n)](#multi-language-support-i18n)
8. [Page Designs](#page-designs)
9. [Responsive Design](#responsive-design)
10. [Accessibility](#accessibility)

---

## Design Philosophy

### Core Principles

1. **Simple & Professional**: Clean interfaces that focus on functionality without unnecessary complexity
2. **Modern & Amazing**: Contemporary design patterns that delight users while maintaining usability
3. **Consistent**: Unified design language across all pages and platforms
4. **Accessible**: WCAG 2.1 AA compliant for all users
5. **Responsive**: Seamless experience across desktop, tablet, and mobile devices
6. **Cultural Appropriateness**: Design that respects Ethiopian context and user preferences

### Design Goals

- **Reduce Cognitive Load**: Minimize the mental effort required to use the system
- **Increase Efficiency**: Enable users to complete tasks quickly and accurately
- **Enhance Satisfaction**: Create delightful experiences that users enjoy
- **Support Learning**: Make the system easy to learn for new users
- **Enable Productivity**: Empower experienced users to work efficiently

---

## Design System Foundation

### Design Tokens

Design tokens are the atomic values that define the visual design system. They ensure consistency across all components and pages.

```javascript
// design-tokens.js
export const designTokens = {
  // Spacing Scale (8px base)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px'
  },
  
  // Border Radius
  radius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px'
  },
  
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },
  
  // Typography Scale
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px'
  },
  
  // Font Weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2
  },
  
  // Z-Index Scale
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070
  },
  
  // Transitions
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)'
  }
};
```

---

## Color System & Dark Mode

### Color Palette

The color system is designed to work seamlessly in both light and dark modes, with carefully selected colors that maintain accessibility standards.

#### Primary Colors
```javascript
const colors = {
  // Brand Primary (Purple/Blue)
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',  // Main brand color
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95'
  },
  
  // Secondary (Teal/Green)
  secondary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',  // Main secondary color
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a'
  },
  
  // Accent (Orange/Amber)
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // Main accent color
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },
  
  // Semantic Colors
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    700: '#15803d'
  },
  
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    700: '#b45309'
  },
  
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    700: '#b91c1c'
  },
  
  info: {
    50: '#eff6ff',
    500: '#3b82f6',
    700: '#1d4ed8'
  },
  
  // Neutral Colors (Grayscale)
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};
```

### Dark Mode Implementation

#### Theme Context
```javascript
// contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });
  
  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    
    // Save to localStorage
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

#### CSS Variables for Theming
```css
/* styles/theme.css */

/* Light Mode (Default) */
:root {
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --bg-elevated: #ffffff;
  
  /* Text Colors */
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --text-inverse: #ffffff;
  
  /* Border Colors */
  --border-primary: #e5e7eb;
  --border-secondary: #d1d5db;
  --border-focus: #8b5cf6;
  
  /* Brand Colors */
  --color-primary: #8b5cf6;
  --color-primary-hover: #7c3aed;
  --color-primary-active: #6d28d9;
  
  --color-secondary: #14b8a6;
  --color-secondary-hover: #0d9488;
  --color-secondary-active: #0f766e;
  
  /* Semantic Colors */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Dark Mode */
.dark {
  /* Background Colors */
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --bg-elevated: #1f2937;
  
  /* Text Colors */
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-tertiary: #9ca3af;
  --text-inverse: #111827;
  
  /* Border Colors */
  --border-primary: #374151;
  --border-secondary: #4b5563;
  --border-focus: #a78bfa;
  
  /* Brand Colors (slightly adjusted for dark mode) */
  --color-primary: #a78bfa;
  --color-primary-hover: #c4b5fd;
  --color-primary-active: #ddd6fe;
  
  --color-secondary: #2dd4bf;
  --color-secondary-hover: #5eead4;
  --color-secondary-active: #99f6e4;
  
  /* Semantic Colors (adjusted for dark mode) */
  --color-success: #4ade80;
  --color-warning: #fbbf24;
  --color-error: #f87171;
  --color-info: #60a5fa;
  
  /* Shadows (darker for dark mode) */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
}

/* Smooth transitions for theme changes */
* {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}
```

#### Theme Toggle Component
```javascript
// components/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="icon" />
      ) : (
        <Sun className="icon" />
      )}
    </button>
  );
};
```

```css
/* ThemeToggle.module.css */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.theme-toggle:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--border-secondary);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.icon {
  width: 20px;
  height: 20px;
  color: var(--text-primary);
}
```

---

## Typography

### Font Stack

```css
/* Primary Font (Sans-serif) */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Helvetica Neue', Arial, sans-serif;

/* Monospace Font (for code) */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;

/* Amharic Font Support */
--font-amharic: 'Noto Sans Ethiopic', 'Nyala', 'Ethiopia Jiret', sans-serif;
```

### Typography Scale

```css
/* Heading Styles */
.h1 {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.h2 {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.h3 {
  font-size: 30px;
  font-weight: 600;
  line-height: 1.3;
}

.h4 {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
}

.h5 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.5;
}

.h6 {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.5;
}

/* Body Text */
.body-large {
  font-size: 18px;
  font-weight: 400;
  line-height: 1.75;
}

.body {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}

.body-small {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
}

/* Caption & Labels */
.caption {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
}

.label {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.01em;
}

/* Utility Classes */
.text-bold {
  font-weight: 700;
}

.text-semibold {
  font-weight: 600;
}

.text-medium {
  font-weight: 500;
}

.text-uppercase {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

## Spacing & Layout

### Spacing System

The spacing system uses an 8px base unit for consistency and visual rhythm.

```javascript
// Spacing scale
const spacing = {
  0: '0px',
  1: '4px',    // 0.5 * base
  2: '8px',    // 1 * base
  3: '12px',   // 1.5 * base
  4: '16px',   // 2 * base
  5: '20px',   // 2.5 * base
  6: '24px',   // 3 * base
  8: '32px',   // 4 * base
  10: '40px',  // 5 * base
  12: '48px',  // 6 * base
  16: '64px',  // 8 * base
  20: '80px',  // 10 * base
  24: '96px'   // 12 * base
};
```

### Layout Grid

```css
/* Container */
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.container-fluid {
  width: 100%;
  padding: 0 24px;
}

/* Grid System */
.grid {
  display: grid;
  gap: 24px;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
.grid-cols-6 { grid-template-columns: repeat(6, 1fr); }
.grid-cols-12 { grid-template-columns: repeat(12, 1fr); }

/* Flexbox Utilities */
.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.justify-between {
  justify-content: space-between;
}

.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.gap-6 { gap: 24px; }
.gap-8 { gap: 32px; }
```

---

## Multi-Language Support (i18n)

### Implementation Strategy

```javascript
// i18n/config.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslations from './locales/en.json';
import amTranslations from './locales/am.json';
import arTranslations from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      am: { translation: amTranslations },
      ar: { translation: arTranslations }
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
```

### Language Context

```javascript
// contexts/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);
  
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLanguage(lng);
    localStorage.setItem('language', lng);
    
    // Update document direction for RTL languages
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  };
  
  useEffect(() => {
    // Set initial direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);
  
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

### Language Selector Component

```javascript
// components/LanguageSelector.jsx
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSelector = () => {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
  ];
  
  return (
    <div className="language-selector">
      <button className="language-button">
        <Globe className="icon" />
        <span>{languages.find(l => l.code === language)?.nativeName}</span>
      </button>
      
      <div className="language-dropdown">
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`language-option ${language === lang.code ? 'active' : ''}`}
          >
            <span className="language-name">{lang.nativeName}</span>
            <span className="language-code">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
```

### Translation File Structure

```json
// locales/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "import": "Import",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "submit": "Submit"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "username": "Username",
    "password": "Password",
    "branchCode": "Branch Code",
    "rememberMe": "Remember me",
    "forgotPassword": "Forgot password?",
    "loginSuccess": "Login successful",
    "loginFailed": "Login failed. Please check your credentials."
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back, {{name}}",
    "overview": "Overview",
    "statistics": "Statistics",
    "recentActivity": "Recent Activity"
  },
  "students": {
    "title": "Students",
    "addStudent": "Add Student",
    "editStudent": "Edit Student",
    "deleteStudent": "Delete Student",
    "studentList": "Student List",
    "studentDetails": "Student Details",
    "firstName": "First Name",
    "lastName": "Last Name",
    "dateOfBirth": "Date of Birth",
    "gender": "Gender",
    "class": "Class",
    "section": "Section",
    "rollNumber": "Roll Number"
  }
  // ... more translations
}
```

```json
// locales/am.json
{
  "common": {
    "save": "አስቀምጥ",
    "cancel": "ሰርዝ",
    "delete": "ሰርዝ",
    "edit": "አርትዕ",
    "add": "አክል",
    "search": "ፈልግ",
    "filter": "አጣራ",
    "export": "ወደ ውጭ ላክ",
    "import": "ከውጭ አስገባ",
    "loading": "በመጫን ላይ...",
    "error": "ስህተት",
    "success": "ተሳክቷል",
    "confirm": "አረጋግጥ",
    "back": "ተመለስ",
    "next": "ቀጣይ",
    "previous": "ቀዳሚ",
    "submit": "አስገባ"
  },
  "auth": {
    "login": "ግባ",
    "logout": "ውጣ",
    "username": "የተጠቃሚ ስም",
    "password": "የይለፍ ቃል",
    "branchCode": "የቅርንጫፍ ኮድ",
    "rememberMe": "አስታውሰኝ",
    "forgotPassword": "የይለፍ ቃል ረሳኽ?",
    "loginSuccess": "በተሳካ ሁኔታ ገብተዋል",
    "loginFailed": "መግባት አልተሳካም። እባክዎ መረጃዎን ያረጋግጡ።"
  }
  // ... more translations
}
```

### Usage in Components

```javascript
// Example component using translations
import React from 'react';
import { useTranslation } from 'react-i18next';

export const StudentList = () => {
  const { t } = useTranslation();
  
  return (
    <div className="student-list">
      <h1>{t('students.title')}</h1>
      <button className="btn-primary">
        {t('students.addStudent')}
      </button>
      
      <table>
        <thead>
          <tr>
            <th>{t('students.firstName')}</th>
            <th>{t('students.lastName')}</th>
            <th>{t('students.class')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        {/* ... table body */}
      </table>
    </div>
  );
};
```

---

This is Part 1 of the UI/UX Design System document. The document continues with Component Library, Page Designs, and more detailed specifications.