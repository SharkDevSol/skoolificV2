# Browser Compatibility — V2 UI Redesign (Task 19.1)

## Target browsers

| Browser | Version | Engine |
|---------|---------|--------|
| Google Chrome | Latest | Chromium |
| Mozilla Firefox | Latest | Gecko |
| Microsoft Edge | Latest | Chromium |
| Apple Safari | Latest | WebKit |

## Automated E2E (Playwright)

From `APP/`:

```bash
npm run test:e2e -- --project=chromium --project=firefox --project=webkit
```

Configured in `playwright.config.js` (see `e2e/CROSS_BROWSER_TESTING_REPORT.md`).

## Manual checklist — all browsers

### Core UI

- [ ] Admin login (`/login`) — form, errors, loading state
- [ ] Dashboard — stat cards, layout, theme toggle
- [ ] Student list — table scroll, filters, pagination
- [ ] Settings — tabs, forms, file upload

### Theme

- [ ] Light mode — readable contrast on cards and tables
- [ ] Dark mode — no invisible text or borders
- [ ] Theme persists after reload

### Internationalization

- [ ] English — LTR layout
- [ ] Amharic — Ethiopic font renders correctly
- [ ] Arabic — RTL: Sidebar alignment, form labels, table direction

### Responsive

- [ ] Mobile (375px) — hamburger sidebar, touch targets
- [ ] Tablet (768px)
- [ ] Desktop (1280px+)

### Animations

- [ ] Modal open/close smooth
- [ ] Toast slide-in
- [ ] With OS “Reduce motion” enabled — animations minimized

## Known considerations

- **Safari**: `backdrop-filter` on modals; test blur on older iOS if supported.
- **Firefox**: CSS grid/flex layouts in dashboard — verify chart placeholders.
- **Edge**: Same as Chrome (Chromium).

## Sign-off

Record browser versions and date when checklist is completed:

| Tester | Date | Chrome | Firefox | Safari | Edge |
|--------|------|--------|---------|--------|------|
| | | | | | |
