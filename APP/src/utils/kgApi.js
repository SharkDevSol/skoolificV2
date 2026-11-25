import axios from 'axios';
import { getBranchCode } from './branchCode';

export const KG_API = (typeof window !== 'undefined' && window.location.origin
  ? window.location.origin + '/api'
  : (import.meta.env.VITE_API_URL || '/api'));

export function kgHeaders(extra = {}) {
  const branch = (getBranchCode() || '').toUpperCase();
  const token =
    (branch ? localStorage.getItem(`branch_${branch}_authToken`) : null) ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    '';
  return {
    ...(branch ? { 'x-branch-code': branch } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export const isKGClass = (name) => /^KG/i.test(String(name || ''));

export const DEFAULT_GRADE_BANDS = [
  { grade: 'A', min: 95, max: 100 },
  { grade: 'B', min: 85, max: 94 },
  { grade: 'C', min: 0, max: 84 },
];

export const rankDisplayLabel = (mode) => (
  mode === 'rank' ? 'Rank' : mode === 'both' ? 'Rank (Grade)' : 'Grade'
);

// Letter grade for a mark/average using configurable KG bands.
export function gradeForMark(mark, bands = DEFAULT_GRADE_BANDS) {
  const value = Number(mark);
  if (!Number.isFinite(value)) return '-';
  const list = Array.isArray(bands) && bands.length ? bands : DEFAULT_GRADE_BANDS;
  const sorted = [...list].sort((a, b) => Number(b.min) - Number(a.min));
  for (const band of sorted) {
    const min = Number(band.min);
    const max = Number(band.max);
    if (value >= min && value <= max) return band.grade;
  }
  return '-';
}

export async function fetchKGConfig() {
  const res = await axios.get(`${KG_API}/kg/config`, { headers: kgHeaders() });
  const data = res.data || {};
  const bands = Array.isArray(data.grade_bands) && data.grade_bands.length
    ? data.grade_bands
    : DEFAULT_GRADE_BANDS;
  return {
    term_count: parseInt(data.term_count, 10) || 2,
    classes: Array.isArray(data.classes) ? data.classes : [],
    check_in_start_time: data.check_in_start_time || '07:00',
    check_in_end_time: data.check_in_end_time || '08:30',
    late_threshold_time: data.late_threshold_time || '08:00',
    absent_marking_time: data.absent_marking_time || '09:00',
    grade_bands: bands,
    rank_display: ['grade', 'rank', 'both'].includes(data.rank_display) ? data.rank_display : 'grade',
  };
}

export async function fetchKGClasses() {
  const res = await axios.get(`${KG_API}/kg/classes`, { headers: kgHeaders() });
  return {
    term_count: parseInt(res.data?.term_count, 10) || 2,
    classes: Array.isArray(res.data?.classes) ? res.data.classes : [],
  };
}

export async function saveKGConfig(config) {
  const body = typeof config === 'number' ? { termCount: config } : { ...config };
  const res = await axios.put(
    `${KG_API}/kg/config`,
    body,
    { headers: kgHeaders({ 'Content-Type': 'application/json' }) }
  );
  return res.data;
}
