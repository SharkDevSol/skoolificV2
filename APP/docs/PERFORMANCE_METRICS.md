# Performance Metrics — V2 UI (Task 17.4)

## Targets

| Metric | Target | How to measure |
|--------|--------|----------------|
| Lighthouse Performance | **> 90** | Chrome DevTools → Lighthouse (production build) |
| First Contentful Paint (FCP) | **< 1.8s** | Lighthouse / Web Vitals |
| Time to Interactive (TTI) | **< 3.8s** | Lighthouse |
| Theme switch | **< 100ms** | `window.__SKOOLIFIC_PERF__.lastThemeSwitchMs` after toggle |

Constants: `src/utils/performance.js` → `PERFORMANCE_TARGETS`.

## Build & preview

```bash
cd APP
npm run build
npm run preview
```

Open preview URL in Chrome Incognito (extensions off), run Lighthouse on `/login` and `/app/dashboard`.

## Implemented optimizations

| Task | Implementation |
|------|----------------|
| 17.1 | `React.lazy()` + `Suspense` for 80+ routes in `App.jsx` |
| 17.2 | `fonts.css` — `font-display: swap`, Inter + Noto Sans Ethiopic |
| 17.3 | `LazyImage` — `loading="lazy"`, optional WebP `<picture>` |
| 17.4 | Theme timing via `ThemeContext`, `recordThemeSwitchMs()` |
| Build | Vite `manualChunks` for react and axios |

## Dev snapshot

After toggling theme in the browser console:

```js
// Returns last theme switch ms and navigation timing
import('./src/utils/performance.js').then(m => console.log(m.getPerformanceSnapshot()));
```

Or: `window.__SKOOLIFIC_PERF__`

## Notes

- Large route chunks (e.g. reports with xlsx/jspdf) load on demand only when visited.
- Run Lighthouse on **production** build, not `npm run dev`.
- Network throttling (Slow 4G) optional for mobile validation.
