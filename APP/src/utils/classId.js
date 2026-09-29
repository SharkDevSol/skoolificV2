export function classIdLabel(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) return String(value);
  let remaining = num;
  let label = '';
  while (remaining > 0) {
    const index = (remaining - 1) % 26;
    label = String.fromCharCode(65 + index) + label;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return label;
}

export default classIdLabel;
