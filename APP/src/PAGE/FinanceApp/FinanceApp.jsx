import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FinanceLogin from './FinanceLogin';
import FinanceSidebar from './FinanceSidebar';
import styles from './FinanceApp.module.css';

// Lazy load all pages
const MonthlyPayments = lazy(() => import('../Finance/MonthlyPaymentsNew'));
const FinanceReports = lazy(() => import('../Finance/FinanceReports'));
const CreateRegisterStudent = lazy(() => import('../CreateRegister/CreateRegisterStudent/CreateRegisterStudent'));
const ListStudent = lazy(() => import('../List/ListStudent/ListStudent'));
const FinanceSettings = lazy(() => import('./FinanceSettings'));
const GuardianList = lazy(() => import('./GuardianList'));

const PageLoader = () => {
  const { t } = useTranslation();
  return <div className={styles.loader}>{t('financeApp.shell.app.loading')}</div>;
};

const FinanceApp = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem('financeToken');
      const userData = localStorage.getItem('financeUser');
      if (token && userData) {
        return JSON.parse(userData);
      }
    } catch {}
    return null;
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('financeDarkMode') === 'true');
  const [checked, setChecked] = useState(false);
  const location = useLocation();

  // Mobile drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('finance-dark');
    } else {
      document.documentElement.classList.remove('finance-dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('financeToken');
    const userData = localStorage.getItem('financeUser');

    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        // Restore auth + branch for underlying components
        localStorage.setItem('authToken', token);
        if (parsed.branchCode) {
          localStorage.setItem(`branch_${parsed.branchCode}_authToken`, token);
          sessionStorage.setItem(`branch_${parsed.branchCode}_authToken`, token);
          sessionStorage.setItem('branchCode', parsed.branchCode);
          localStorage.setItem('branchCode', parsed.branchCode);
        }
        localStorage.setItem('isLoggedIn', 'true');
      } catch {}
    }
    setChecked(true);
  }, []);

  const isLoginPage = location.pathname.replace(/\/+$/, '') === '/app/finance/login';

  if (!checked) return null;

  if (!user && !isLoginPage) {
    return <Navigate to="/app/finance/login" replace />;
  }

  if (user && isLoginPage) {
    return <Navigate to="/app/finance/" replace />;
  }

  return (
    <div className={styles.appContainer}>
      {/* Mobile drawer overlay */}
      {sidebarOpen && <div className={styles.mobileOverlay} onClick={() => setSidebarOpen(false)} />}

      {/* Mobile hamburger */}
      {user && (
        <button
          type="button"
          className={styles.mobileHamburger}
          onClick={() => setSidebarOpen(v => !v)}
          aria-label="Menu"
        >
          ☰
        </button>
      )}

      {user && <FinanceSidebar user={user} darkMode={darkMode} mobileOpen={sidebarOpen} onNavClose={() => setSidebarOpen(false)} onToggleDark={() => { setDarkMode(d => { const next = !d; localStorage.setItem('financeDarkMode', next); return next; }); }} onLogout={() => setUser(null)} />}
      <div className={styles.mainContent}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Login */}
            <Route path="login" element={<FinanceLogin onLogin={setUser} />} />

            {/* Finance */}
            <Route index element={<Navigate to="/app/finance/monthly-payments" replace />} />
            <Route path="monthly-payments" element={<MonthlyPayments />} />
            <Route path="reports" element={<FinanceReports />} />
            <Route path="create-register-student" element={<CreateRegisterStudent />} />
            <Route path="list-student" element={<ListStudent />} />
            <Route path="guardian-list" element={<GuardianList />} />
            <Route path="settings" element={<FinanceSettings user={user} onUserUpdate={setUser} onLogout={() => setUser(null)} />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/app/finance/monthly-payments" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};

export default FinanceApp;
