import { BrowserRouter } from "react-router-dom";
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/global.css'
import './styles/theme.css'
import './styles/fonts.css'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { LanguageSelectionProvider } from './context/LanguageSelectionContext.jsx'
import axios from 'axios'
import './config/axios.config'   // Register global interceptors (auth token + branch code)
import { getBranchCode } from './utils/branchCode'

// Patch global fetch to add auth + branch headers (for pages using raw fetch())
const origFetch = window.fetch;
window.fetch = function(input, init) {
  init = init || {};
  init.headers = init.headers || {};
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token) init.headers['Authorization'] = 'Bearer ' + token;
  const branchCode = getBranchCode();
  if (branchCode) init.headers['X-Branch-Code'] = branchCode;
  return origFetch.call(window, input, init);
};

// Configure axios defaults with auto-detected baseURL
axios.defaults.baseURL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
})();
console.log('🌐 Axios configured with baseURL:', axios.defaults.baseURL);

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
  // New service worker installed (new deploy) → reload once so phones never
  // keep running yesterday's code after an update.
  let swReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swReloaded) return;
    swReloaded = true;
    window.location.reload();
  });
}

// White-screen guard: if a lazy chunk fails to load (stale cache / dropped
// connection on mobile), reload once instead of showing a blank page.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  const key = 'chunkReloadAt';
  const last = parseInt(sessionStorage.getItem(key) || '0', 10);
  if (Date.now() - last > 15000) {
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
  }
});

// Last-resort guard: if React never mounted (module threw on load), show a
// real message instead of a white page.
window.addEventListener('error', () => {
  setTimeout(() => {
    const root = document.getElementById('root');
    if (root && root.children.length === 0 && !root.dataset.fallbackShown) {
      root.dataset.fallbackShown = '1';
      root.innerHTML =
        '<div style="max-width:420px;margin:60px auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px;font-family:system-ui,sans-serif;text-align:center">' +
        '<h2 style="margin:0 0 8px;font-size:18px">The page could not start</h2>' +
        '<p style="color:#6b7280;font-size:14px;margin:0 0 16px">Something on this device blocked the exam app. Reload to try again.</p>' +
        '<button onclick="location.reload()" style="padding:10px 22px;border:0;border-radius:10px;background:#667eea;color:#fff;font-size:15px;cursor:pointer">Reload</button>' +
        '</div>';
    }
  }, 1200);
});

// Fix: passive event listener warning from third-party libraries (antd, framer-motion)
const originalAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener, options) {
  if (type === 'touchstart' || type === 'touchmove' || type === 'wheel' || type === 'mousewheel') {
    if (options === undefined || options === false) {
      options = { passive: true };
    } else if (typeof options === 'object' && options.passive === undefined) {
      options = { ...options, passive: true };
    }
  }
  return originalAddEventListener.call(this, type, listener, options);
};

// Global alert() patch — replaces browser alerts with in-app toast notifications
const TOAST_DURATION = 4000;
const globalToastContainer = document.createElement('div');
globalToastContainer.id = 'global-toast-container';
globalToastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:400px';
document.body.appendChild(globalToastContainer);

window.alert = function(msg) {
  const toast = document.createElement('div');
  const isSuccess = msg.includes('✅') || msg.includes('successfully');
  const isError = msg.includes('❌') || msg.includes('Failed') || msg.includes('failed');
  const bgColor = isSuccess ? '#22c55e' : isError ? '#ef4444' : '#3b82f6';
  toast.style.cssText = `padding:12px 20px;border-radius:10px;background:${bgColor};color:white;font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:slideIn 0.3s ease;cursor:pointer;word-break:break-word;max-width:400px`;
  toast.textContent = msg.replace(/[✅❌]/g, '').trim();
  toast.onclick = () => toast.remove();
  globalToastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), TOAST_DURATION);
};

// Inject slide animation
const style = document.createElement('style');
style.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
document.head.appendChild(style);

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppProvider>
      <LanguageSelectionProvider>
        <App />
      </LanguageSelectionProvider>
    </AppProvider>
  </BrowserRouter>,
)
