/**
 * Test script for phone number validation
 */

const {
  validatePhone,
  validateEthiopianPhone,
  formatPhoneForDisplay,
  isEthiopianPhone,
  normalizePhone
} = require('./phoneValidator');

console.log('\n=== Testing Phone Number Validation ===\n');

// Test cases
const testCases = [
  // Ethiopian formats
  { phone: '+251912345678', expected: true, description: 'International format' },
  { phone: '0912345678', expected: true, description: 'Local format with 0' },
  { phone: '912345678', expected: true, description: 'Local format without 0' },
  { phone: '09 12 34 56 78', expected: true, description: 'With spaces' },
  { phone: '+251-91-234-5678', expected: true, description: 'With dashes' },
  { phone: '0712345678', expected: true, description: 'Ethio Telecom (07)' },
  
  // Invalid formats
  { phone: '12345', expected: false, description: 'Too short' },
  { phone: '0812345678', expected: false, description: 'Invalid prefix (08)' },
  { phone: '+1234567890', expected: true, description: 'International (non-Ethiopian)' },
  { phone: '', expected: false, description: 'Empty string' },
  { phone: null, expected: false, description: 'Null value' }
];

console.log('1. Testing validatePhone():\n');
testCases.forEach((test, index) => {
  const result = validatePhone(test.phone);
  const status = result.valid === test.expected ? '✓' : '✗';
  console.log(`${status} Test ${index + 1}: ${test.description}`);
  console.log(`   Input: "${test.phone}"`);
  console.log(`   Valid: ${result.valid}`);
  if (result.valid) {
    console.log(`   Formatted: ${result.formatted}`);
  } else {
    console.log(`   Error: ${result.error}`);
  }
  console.log('');
});

console.log('\n2. Testing formatPhoneForDisplay():\n');
const displayTests = [
  '+251912345678',
  '0912345678',
  '+1234567890'
];

displayTests.forEach(phone => {
  console.log(`Input: ${phone}`);
  console.log(`Display: ${formatPhoneForDisplay(phone)}`);
  console.log('');
});

console.log('\n3. Testing isEthiopianPhone():\n');
const ethiopianTests = [
  { phone: '+251912345678', expected: true },
  { phone: '0912345678', expected: true },
  { phone: '+1234567890', expected: false }
];

ethiopianTests.forEach(test => {
  const result = isEthiopianPhone(test.phone);
  const status = result === test.expected ? '✓' : '✗';
  console.log(`${status} ${test.phone}: ${result ? 'Ethiopian' : 'Not Ethiopian'}`);
});

console.log('\n4. Testing normalizePhone():\n');
const normalizeTests = [
  '0912345678',
  '912345678',
  '+251912345678',
  '+1234567890'
];

normalizeTests.forEach(phone => {
  console.log(`Input: ${phone}`);
  console.log(`Normalized: ${normalizePhone(phone)}`);
  console.log('');
});

console.log('✅ Phone validation tests complete!\n');
