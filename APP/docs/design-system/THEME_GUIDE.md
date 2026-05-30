# Theme Customization Guide

## Architecture

- **ThemeContext** (`src/contexts/ThemeContext.jsx`) — `light` / `dark` on `<html>`, persisted in `localStorage` key `theme`.
- **CSS variables** — `src/styles/theme.css` (primary tokens), `src/styles/global.css` (extended palette).
- **Animations** — `src/styles/animations.css` (150–300ms transitions, `prefers-reduced-motion`).

## Switching theme in code

```jsx
import { useTheme } from '../contexts/ThemeContext';

const { theme, toggleTheme, setTheme, isDark } = useTheme();
```

## Customizing colors

Override variables on `:root` / `.dark` in `theme.css` or branch branding in Settings:

```css
:root {
  --color-primary: #8b5cf6;
  --bg-primary: #ffffff;
  --text-primary: #111827;
}

.dark {
  --color-primary: #a78bfa;
  --bg-primary: #111827;
  --text-primary: #f9fafb;
}
```

Use semantic tokens (`--color-success`, `--text-secondary`) in CSS Modules instead of hard-coded hex values.

## Performance

Theme switches are measured via `recordThemeSwitchMs()` — target **&lt; 100ms** (Task 17.4). Check in devtools:

```js
window.__SKOOLIFIC_PERF__.lastThemeSwitchMs
```

## RTL

Arabic sets `dir="rtl"` on `<html>` via LanguageContext. Layout mirrors in `global.css` RTL section.
