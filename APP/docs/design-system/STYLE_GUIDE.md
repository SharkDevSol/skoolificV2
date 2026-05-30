# UI/UX Style Guide

## Principles

1. **Consistency** — Use design-system components, not one-off styles.
2. **Accessibility** — WCAG AA contrast, visible focus, semantic HTML, ARIA where needed.
3. **Responsive** — Mobile-first; touch targets ≥ 44×44px; tables scroll horizontally on small screens.
4. **Performance** — Route-level code splitting; lazy images; minimal animation when `prefers-reduced-motion`.

## Typography

| Token | Size | Use |
|-------|------|-----|
| `--font-size-xs` | 12px | Captions, badges |
| `--font-size-sm` | 14px | Secondary text |
| `--font-size-base` | 16px | Body |
| `--font-size-lg` | 18px | Subheadings |
| `--font-size-2xl` | 24px | Page titles |

- **Latin**: Inter (`--font-sans`)
- **Amharic**: Noto Sans Ethiopic (`--font-amharic`)

## Spacing

Use `--spacing-xs` through `--spacing-4xl` (4px–96px). Prefer `--spacing-md` / `--spacing-lg` for card padding and section gaps.

## Color semantics

| Token | Usage |
|-------|--------|
| `--color-primary` | Primary actions, links |
| `--color-success` | Confirmations, positive status |
| `--color-warning` | Caution |
| `--color-error` / `--color-danger` | Errors, destructive actions |
| `--text-secondary` | Supporting text |

## Buttons

- One primary action per section.
- Destructive actions use `variant="danger"` with confirmation modal.

## Motion

- Duration: **150–300ms**
- Easing: `ease-out` for enter, `ease-in-out` for theme/sidebar
- Respect `prefers-reduced-motion` (see `animations.css`)

## Page layout

Wrap admin pages in `PageLayout` with `title`, optional `breadcrumbs`, and `actions` slot for toolbar buttons.
