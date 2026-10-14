// Available page paths derived from the app navigation (Home.jsx) + known sub-pages.
// Used to filter admin permissions so hidden/deleted pages never appear.
const AVAILABLE_PAGES = [
  '/', '/admin-sub-accounts', '/ai/books', '/ai/books/upload', '/ai/dashboard',
  '/ai/generate/exam', '/ai/generate/homework', '/ai/generate/lesson-note',
  '/ai/generate/lesson-plan', '/ai/generate/quiz', '/ai/generate/scramble-exam',
  '/ai/generate/worksheet', '/ai-test-generator', '/ai-test-player', '/ai-tests',
  '/assets', '/assets/assignments', '/assets/depreciation', '/assets/disposal',
  '/assets/maintenance', '/assets/registry', '/assets/reports', '/backup',
  '/class-teacher-assignment', '/communication', '/create-mark-list',
  '/create-register-staff', '/create-register-student', '/device-status',
  '/evaluation', '/evaluation-book', '/evaluation-book/assignments', '/faults',
  '/finance', '/finance/fee-management', '/finance/fee-types',
  '/finance/inventory-integration', '/finance/monthly-payments',
  '/finance/monthly-payment-settings', '/finance/reports', '/finance/student-exemption',
  '/finance/invoices', '/finance/payments',
  '/hr', '/hr/attendance', '/hr/attendance-deduction-settings', '/hr/attendance-time-settings',
  '/hr/budgets', '/hr/expense-approval', '/hr/expenses', '/hr/leave', '/hr/payroll',
  '/hr/reports', '/hr/salary', '/hr/organization', '/hr/shift-time-settings', '/hr/training',
  '/inventory', '/inventory/items', '/inventory/movements', '/inventory/purchase-orders',
  '/inventory/reports', '/inventory/suppliers',
  '/kg/assignments', '/kg/evaluation', '/kg/evaluation-book',
  '/list-guardian', '/list-staff', '/list-student', '/mark-list-view',
  '/post', '/report-card', '/reports/registrations', '/schedule', '/settings',
  '/sms', '/sms-counter', '/student-attendance-system', '/student-attendance-time-settings',
  '/tasks',
  // Valid sub-pages not in the main nav
  '/Student-Form-Builder', '/Staff-Form-Builder', '/mark-list-management',
];

// Normalize a path for comparison (case-insensitive, slash/underscore tolerant)
const normalizePath = (p) =>
  String(p || '').toLowerCase().replace(/_/g, '-').replace(/\/+$/, '');

const AVAILABLE_PAGES_SET = new Set(AVAILABLE_PAGES.map(normalizePath));

export const isPageAvailable = (path) => {
  const norm = normalizePath(path);
  if (AVAILABLE_PAGES_SET.has(norm)) return true;
  // Allow known aliases
  const aliases = {
    'ai-test-generator': 'ai-test-generator',
    'dashboard': '/',
    'mark-list-management': 'mark-list-view',
  };
  const aliased = aliases[norm];
  return aliased ? AVAILABLE_PAGES_SET.has(normalizePath(aliased)) : false;
};

export default AVAILABLE_PAGES;
