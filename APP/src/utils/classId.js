export function classIdLabel(value) {
  if (value === null || value === undefined || value === '') return '';
  const raw = String(value).trim();
  if (raw === '') return '';
  const num = Number(raw);
  if (!Number.isInteger(num) || num < 1) return raw;
  return String(num);
}

export default classIdLabel;
