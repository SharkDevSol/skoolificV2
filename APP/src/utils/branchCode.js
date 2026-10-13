/**
 * Fixed (single-branch) deployments set VITE_FIXED_BRANCH at build time,
 * OR are automatically detected from the hostname (e.g. bilal.skoolific.com -> BILAL).
 * When active, the branch code is automatically locked: login screens skip the
 * branch-code field and every API call is sent with this branch automatically.
 */
const FIXED_BRANCH = (import.meta.env.VITE_FIXED_BRANCH || '').trim().toUpperCase();

function detectDomainBranch() {
  if (typeof window === 'undefined' || !window.location || !window.location.hostname) return '';
  const host = window.location.hostname.toLowerCase();
  if (host.includes('bilal')) return 'BILAL';
  if (host.includes('darululum') || host.includes('darul-ulum')) return 'DARULULUM';
  if (host.includes('almarkaz')) return 'ALMARKAZ';
  if (host.includes('al-qalam') || host.includes('alqalam')) return 'ALQALAM';
  return '';
}

/** True when this build or domain is locked to a single branch. */
export function isFixedBranch() {
  return !!(FIXED_BRANCH || detectDomainBranch());
}

/** The branch this build or domain is locked to ('' when the build is multi-branch). */
export function fixedBranchCode() {
  return FIXED_BRANCH || detectDomainBranch();
}

/**
 * Get the current branch code — sessionStorage ONLY (per-tab isolation).
 * Never falls back to localStorage to prevent cross-tab contamination.
 * Each browser tab keeps its own branch code independently.
 */
export function getBranchCode() {
  const fixed = FIXED_BRANCH || detectDomainBranch();
  if (fixed) return fixed;
  let code = sessionStorage.getItem('branchCode')
    || localStorage.getItem('branchCode')
    || localStorage.getItem('rememberedBranchCode') || '';
  if (!code) {
    try {
      const u = JSON.parse(localStorage.getItem('adminUser') || '{}');
      if (u && u.branchCode) code = u.branchCode;
    } catch (_) {}
  }
  if (code.includes(',')) {
    code = code.split(',')[0].trim();
    sessionStorage.setItem('branchCode', code);
  }
  return (code || '').toUpperCase();
}

/**
 * Set the branch code for this tab only (sessionStorage).
 * If remember=true, also saves to localStorage under a DIFFERENT key
 * (rememberedBranchCode) used ONLY to pre-fill the login form, never for API calls.
 */
export function setBranchCode(code, remember = false) {
  const fixed = FIXED_BRANCH || detectDomainBranch();
  const value = fixed || (code || '').toUpperCase();
  sessionStorage.setItem('branchCode', value);
  if (remember) {
    localStorage.setItem('rememberedBranchCode', value);
  }
}
