/**
 * Fixed (single-branch) deployments set VITE_FIXED_BRANCH at build time.
 * When set, the branch code is baked into the build: login screens skip the
 * branch-code field and every API call is sent with this branch automatically.
 */
const FIXED_BRANCH = (import.meta.env.VITE_FIXED_BRANCH || '').trim().toUpperCase();

/** True when this build is locked to a single branch. */
export function isFixedBranch() {
  return !!FIXED_BRANCH;
}

/** The branch this build is locked to ('' when the build is multi-branch). */
export function fixedBranchCode() {
  return FIXED_BRANCH;
}

/**
 * Get the current branch code — sessionStorage ONLY (per-tab isolation).
 * Never falls back to localStorage to prevent cross-tab contamination.
 * Each browser tab keeps its own branch code independently.
 */
export function getBranchCode() {
  if (FIXED_BRANCH) return FIXED_BRANCH;
  let code = sessionStorage.getItem('branchCode')
    || localStorage.getItem('rememberedBranchCode') || '';
  if (code.includes(',')) {
    code = code.split(',')[0].trim();
    sessionStorage.setItem('branchCode', code);
  }
  return code.toUpperCase();
}

/**
 * Set the branch code for this tab only (sessionStorage).
 * If remember=true, also saves to localStorage under a DIFFERENT key
 * (rememberedBranchCode) used ONLY to pre-fill the login form, never for API calls.
 */
export function setBranchCode(code, remember = false) {
  const value = FIXED_BRANCH || (code || '').toUpperCase();
  sessionStorage.setItem('branchCode', value);
  if (remember) {
    localStorage.setItem('rememberedBranchCode', value);
  }
}
