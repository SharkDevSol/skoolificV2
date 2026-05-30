# Translation Workflow Guide

## Stack

- **i18next** + **react-i18next** (`src/i18n/config.js`)
- Locale files: `src/i18n/locales/en.json`, `am.json`, `ar.json`

## Adding strings

1. Add the key under the appropriate namespace in `en.json`.
2. Mirror the key in `am.json` and `ar.json`.
3. Use in components:

```jsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
return <h1>{t('students.listTitle')}</h1>;
```

## Language switching

```jsx
import LanguageSelector from '../COMPONENTS/LanguageSelector/LanguageSelector';
// or
import { useLanguage } from '../contexts/LanguageContext';
```

Preference is stored in `localStorage` (`language`).

## RTL (Arabic)

When language is `ar`, the app sets `document.documentElement.dir = 'rtl'`. Test Sidebar, tables, and forms in RTL before shipping UI changes.

## Naming conventions

- `common.*` — buttons, labels shared everywhere
- `navigation.*` — menu items
- Module keys: `students`, `staff`, `academic`, `finance`, `hr`, `communication`, `settings`

Keep keys stable; change copy in JSON only, not key paths, to avoid breaking translations.
