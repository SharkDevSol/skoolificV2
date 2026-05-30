# Skoolific V2 Design System Documentation

Task **20.1** — component library reference for the UI redesign.

## Contents

| Document | Description |
|----------|-------------|
| [COMPONENTS.md](./COMPONENTS.md) | All reusable components, props, and examples |
| [THEME_GUIDE.md](./THEME_GUIDE.md) | Light/dark theme, CSS variables, customization |
| [TRANSLATION_GUIDE.md](./TRANSLATION_GUIDE.md) | i18n workflow (en / am / ar, RTL) |
| [STYLE_GUIDE.md](./STYLE_GUIDE.md) | Typography, spacing, colors, accessibility |

## Quick start

```jsx
import Button from '../COMPONENTS/Button/Button';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

function Example() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="primary" onClick={toggleTheme}>
      {t('common.save')}
    </Button>
  );
}
```

## Live showcase

Run the app and open **`/showcase`** to interact with all design-system components in light and dark mode.

## Source locations

- Components: `APP/src/COMPONENTS/`
- Theme tokens: `APP/src/styles/theme.css`, `APP/src/styles/global.css`
- Animations: `APP/src/styles/animations.css`
- Fonts: `APP/src/styles/fonts.css`

Per-component README files live next to each component (e.g. `Button/README.md`).
