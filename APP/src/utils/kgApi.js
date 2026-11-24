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
    localStorage.getItem('token') ||
    '';
  return {
    ...(branch ? { 'x-branch-code': branch } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export const isKGClass = (name) => /^KG/i.test(String(name || ''));

export async function fetchKGConfig() {
  const res = await axios.get(`${KG_API}/kg/config`, { headers: kgHeaders() });
  return {
    term_count: parseInt(res.data?.term_count, 10) || 2,
    classes: Array.isArray(res.data?.classes) ? res.data.classes : [],
  };
}

export async function fetchKGClasses() {
  const res = await axios.get(`${KG_API}/kg/classes`, { headers: kgHeaders() });
  return {
    term_count: parseInt(res.data?.term_count, 10) || 2,
    classes: Array.isArray(res.data?.classes) ? res.data.classes : [],
  };
}

export async function saveKGConfig(termCount) {
  const res = await axios.put(
    `${KG_API}/kg/config`,
    { termCount },
    { headers: kgHeaders({ 'Content-Type': 'application/json' }) }
  );
  return res.data;
}
