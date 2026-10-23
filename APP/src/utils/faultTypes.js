/**
 * Fault type labels.
 *
 * The fault types are stored in the database as plain English names
 * ("Late Arrival", "Other", ...) so the value has to be readable in every
 * language without changing what is stored.
 *
 * - The label is looked up in the "faultTypes" section of the active locale.
 *   When a language has no translation the plain English name is used, so the
 *   UI never shows a raw key like "faultTypes.Other".
 * - Branches listed in OROMO_BRANCHES always show the Afaan Oromoo names,
 *   regardless of the language the browser is set to.
 */
import en from '../i18n/locales/en.json';
import am from '../i18n/locales/am.json';
import ar from '../i18n/locales/ar.json';
import so from '../i18n/locales/so.json';
import om from '../i18n/locales/om.json';
import { getBranchCode } from './branchCode';

const LOCALES = { en, am, ar, so, om };

// Branches that show the Afaan Oromoo fault types.
const OROMO_BRANCHES = ['BILAL'];

export const NOT_SPECIFIED = 'Not specified';

// Some screens use a short type name. Map it to the full name that the
// translation files use, so those are translated as well.
const ALIASES = {
  'Late': 'Late Arrival',
  'Fight': 'Fighting',
  'Absence': 'Absence Without Notice',
  'Skipped Class': 'Skipping Class',
  'Disrespect': 'Disrespect to Teacher',
};

/** Language used for the fault type labels on this branch. */
export function faultTypeLanguage(language, branchCode) {
  const branch = String(branchCode || getBranchCode() || '').toUpperCase();
  if (OROMO_BRANCHES.includes(branch)) return 'om';
  return language || 'en';
}

/**
 * Display label for a stored fault type.
 * Never returns a translation key - falls back to the English name.
 * An empty type (nothing was picked) shows the "Not specified" label.
 */
export function faultTypeLabel(key, language, branchCode) {
  const name = ALIASES[key] || key || NOT_SPECIFIED;
  const lang = faultTypeLanguage(language, branchCode);
  const section = LOCALES[lang] && LOCALES[lang].faultTypes;
  if (section && section[name]) return section[name];
  return (LOCALES.en.faultTypes && LOCALES.en.faultTypes[name]) || name;
}

export default faultTypeLabel;
