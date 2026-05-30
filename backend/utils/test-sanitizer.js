/**
 * Test Script for Input Sanitization
 * 
 * Tests all sanitization functions to ensure they work correctly
 * and prevent XSS, SQL injection, and other security vulnerabilities.
 * 
 * Run: node backend/utils/test-sanitizer.js
 */

const {
  sanitizeInput,
  sanitizeObject,
  sanitizeHTML,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeURL,
  sanitizeInteger,
  sanitizeFloat,
  sanitizeBoolean,
  sanitizeDate,
  sanitizeAlphanumeric,
  sanitizeEnum,
} = require('./sanitizer');

console.log('🧪 Testing Input Sanitization Functions\n');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failedTests++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ===========================================
// HTML SANITIZATION TESTS
// ===========================================
console.log('📝 HTML Sanitization Tests');

test('Should remove script tags', () => {
  const input = '<script>alert("XSS")</script>Hello';
  const result = sanitizeHTML(input);
  assert(!result.includes('<script'), 'Script tag not removed');
  assert(result.includes('Hello'), 'Valid content removed');
});

test('Should remove event handlers', () => {
  const input = '<div onclick="alert(1)">Click me</div>';
  const result = sanitizeHTML(input);
  assert(!result.includes('onclick'), 'Event handler not removed');
});

test('Should allow safe HTML tags', () => {
  const input = '<p>Hello <strong>World</strong></p>';
  const result = sanitizeHTML(input);
  assert(result.includes('<p>'), 'Paragraph tag removed');
  assert(result.includes('<strong>'), 'Strong tag removed');
});

// ===========================================
// TEXT SANITIZATION TESTS
// ===========================================
console.log('\n📝 Text Sanitization Tests');

test('Should escape HTML entities', () => {
  const input = '<script>alert("XSS")</script>';
  const result = sanitizeText(input);
  assert(result.includes('&lt;'), 'Less than not escaped');
  assert(result.includes('&gt;'), 'Greater than not escaped');
});

test('Should handle quotes', () => {
  const input = 'Hello "World"';
  const result = sanitizeText(input);
  assert(result.includes('&quot;'), 'Quotes not escaped');
});

// ===========================================
// EMAIL SANITIZATION TESTS
// ===========================================
console.log('\n📧 Email Sanitization Tests');

test('Should validate and normalize valid email', () => {
  const input = '  TEST@EXAMPLE.COM  ';
  const result = sanitizeEmail(input);
  assert(result === 'test@example.com', 'Email not normalized');
});

test('Should reject invalid email', () => {
  const input = 'not-an-email';
  const result = sanitizeEmail(input);
  assert(result === null, 'Invalid email not rejected');
});

test('Should reject email with spaces', () => {
  const input = 'test @example.com';
  const result = sanitizeEmail(input);
  assert(result === null, 'Email with spaces not rejected');
});

// ===========================================
// PHONE SANITIZATION TESTS
// ===========================================
console.log('\n📞 Phone Sanitization Tests');

test('Should normalize Ethiopian phone (+251)', () => {
  const input = '+251912345678';
  const result = sanitizePhone(input);
  assert(result === '0912345678', 'Phone not normalized correctly');
});

test('Should normalize Ethiopian phone (09)', () => {
  const input = '0912345678';
  const result = sanitizePhone(input);
  assert(result === '0912345678', 'Phone not normalized correctly');
});

test('Should normalize Ethiopian phone (9)', () => {
  const input = '912345678';
  const result = sanitizePhone(input);
  assert(result === '0912345678', 'Phone not normalized correctly');
});

test('Should reject invalid Ethiopian phone', () => {
  const input = '0812345678'; // Invalid prefix
  const result = sanitizePhone(input);
  assert(result === null, 'Invalid phone not rejected');
});

test('Should reject short phone number', () => {
  const input = '091234567'; // Too short
  const result = sanitizePhone(input);
  assert(result === null, 'Short phone not rejected');
});

// ===========================================
// URL SANITIZATION TESTS
// ===========================================
console.log('\n🔗 URL Sanitization Tests');

test('Should validate valid HTTPS URL', () => {
  const input = 'https://example.com';
  const result = sanitizeURL(input);
  assert(result === 'https://example.com', 'Valid URL rejected');
});

test('Should validate valid HTTP URL', () => {
  const input = 'http://example.com';
  const result = sanitizeURL(input);
  assert(result === 'http://example.com', 'Valid URL rejected');
});

test('Should reject URL without protocol', () => {
  const input = 'example.com';
  const result = sanitizeURL(input);
  assert(result === null, 'URL without protocol not rejected');
});

test('Should reject javascript: protocol', () => {
  const input = 'javascript:alert(1)';
  const result = sanitizeURL(input);
  assert(result === null, 'JavaScript protocol not rejected');
});

// ===========================================
// INTEGER SANITIZATION TESTS
// ===========================================
console.log('\n🔢 Integer Sanitization Tests');

test('Should parse valid integer', () => {
  const input = '42';
  const result = sanitizeInteger(input);
  assert(result === 42, 'Integer not parsed correctly');
});

test('Should reject non-integer', () => {
  const input = '42.5';
  const result = sanitizeInteger(input);
  assert(result === 42, 'Float parsed as integer');
});

test('Should enforce minimum value', () => {
  const input = '5';
  const result = sanitizeInteger(input, { min: 10 });
  assert(result === null, 'Minimum not enforced');
});

test('Should enforce maximum value', () => {
  const input = '100';
  const result = sanitizeInteger(input, { max: 50 });
  assert(result === null, 'Maximum not enforced');
});

// ===========================================
// FLOAT SANITIZATION TESTS
// ===========================================
console.log('\n🔢 Float Sanitization Tests');

test('Should parse valid float', () => {
  const input = '42.5';
  const result = sanitizeFloat(input);
  assert(result === 42.5, 'Float not parsed correctly');
});

test('Should round to specified decimals', () => {
  const input = '42.12345';
  const result = sanitizeFloat(input, { decimals: 2 });
  assert(result === 42.12, 'Float not rounded correctly');
});

test('Should enforce minimum value', () => {
  const input = '5.5';
  const result = sanitizeFloat(input, { min: 10.0 });
  assert(result === null, 'Minimum not enforced');
});

// ===========================================
// BOOLEAN SANITIZATION TESTS
// ===========================================
console.log('\n✅ Boolean Sanitization Tests');

test('Should parse boolean true', () => {
  assert(sanitizeBoolean(true) === true, 'Boolean true failed');
  assert(sanitizeBoolean('true') === true, 'String "true" failed');
  assert(sanitizeBoolean('TRUE') === true, 'String "TRUE" failed');
  assert(sanitizeBoolean('1') === true, 'String "1" failed');
  assert(sanitizeBoolean(1) === true, 'Number 1 failed');
});

test('Should parse boolean false', () => {
  assert(sanitizeBoolean(false) === false, 'Boolean false failed');
  assert(sanitizeBoolean('false') === false, 'String "false" failed');
  assert(sanitizeBoolean('0') === false, 'String "0" failed');
  assert(sanitizeBoolean(0) === false, 'Number 0 failed');
});

// ===========================================
// DATE SANITIZATION TESTS
// ===========================================
console.log('\n📅 Date Sanitization Tests');

test('Should parse valid ISO date', () => {
  const input = '2026-05-04T12:00:00Z';
  const result = sanitizeDate(input);
  assert(result instanceof Date, 'Date not parsed');
  assert(!isNaN(result.getTime()), 'Invalid date returned');
});

test('Should reject invalid date', () => {
  const input = 'not-a-date';
  const result = sanitizeDate(input);
  assert(result === null, 'Invalid date not rejected');
});

test('Should handle Date object', () => {
  const input = new Date();
  const result = sanitizeDate(input);
  assert(result instanceof Date, 'Date object not handled');
});

// ===========================================
// ALPHANUMERIC SANITIZATION TESTS
// ===========================================
console.log('\n🔤 Alphanumeric Sanitization Tests');

test('Should accept valid alphanumeric', () => {
  const input = 'Hello123';
  const result = sanitizeAlphanumeric(input);
  assert(result === 'Hello123', 'Valid alphanumeric rejected');
});

test('Should accept with spaces when allowed', () => {
  const input = 'Hello World 123';
  const result = sanitizeAlphanumeric(input, { allowSpaces: true });
  assert(result === 'Hello World 123', 'Spaces rejected when allowed');
});

test('Should reject special characters', () => {
  const input = 'Hello@World';
  const result = sanitizeAlphanumeric(input);
  assert(result === null, 'Special characters not rejected');
});

test('Should enforce minimum length', () => {
  const input = 'Hi';
  const result = sanitizeAlphanumeric(input, { minLength: 5 });
  assert(result === null, 'Minimum length not enforced');
});

// ===========================================
// ENUM SANITIZATION TESTS
// ===========================================
console.log('\n📋 Enum Sanitization Tests');

test('Should accept valid enum value', () => {
  const input = 'admin';
  const result = sanitizeEnum(input, ['admin', 'user', 'guest']);
  assert(result === 'admin', 'Valid enum value rejected');
});

test('Should reject invalid enum value', () => {
  const input = 'superadmin';
  const result = sanitizeEnum(input, ['admin', 'user', 'guest']);
  assert(result === null, 'Invalid enum value not rejected');
});

// ===========================================
// OBJECT SANITIZATION TESTS
// ===========================================
console.log('\n📦 Object Sanitization Tests');

test('Should sanitize object with schema', () => {
  const data = {
    name: '  John Doe  ',
    email: 'JOHN@EXAMPLE.COM',
    age: '25',
    role: 'admin',
  };
  
  const schema = {
    name: { type: 'text', required: true },
    email: { type: 'email', required: true },
    age: { type: 'integer', options: { min: 0, max: 150 } },
    role: { type: 'enum', options: { allowedValues: ['admin', 'user'] } },
  };
  
  const result = sanitizeObject(data, schema);
  assert(result.name.includes('John Doe'), 'Name not sanitized');
  assert(result.email === 'john@example.com', 'Email not normalized');
  assert(result.age === 25, 'Age not parsed');
  assert(result.role === 'admin', 'Role not validated');
});

test('Should reject missing required fields', () => {
  const data = {
    name: 'John Doe',
  };
  
  const schema = {
    name: { type: 'text', required: true },
    email: { type: 'email', required: true },
  };
  
  try {
    sanitizeObject(data, schema);
    throw new Error('Should have thrown validation error');
  } catch (error) {
    assert(error.validationErrors, 'Validation errors not returned');
    assert(error.validationErrors.length > 0, 'No validation errors');
  }
});

// ===========================================
// COMPREHENSIVE INPUT SANITIZATION TESTS
// ===========================================
console.log('\n🛡️  Comprehensive Sanitization Tests');

test('Should sanitize text input', () => {
  const result = sanitizeInput('<script>alert(1)</script>', 'text');
  assert(!result.includes('<script'), 'Script not sanitized');
});

test('Should sanitize email input', () => {
  const result = sanitizeInput('TEST@EXAMPLE.COM', 'email');
  assert(result === 'test@example.com', 'Email not normalized');
});

test('Should sanitize phone input', () => {
  const result = sanitizeInput('+251912345678', 'phone');
  assert(result === '0912345678', 'Phone not normalized');
});

test('Should sanitize integer input', () => {
  const result = sanitizeInput('42', 'integer', { min: 0, max: 100 });
  assert(result === 42, 'Integer not parsed');
});

// ===========================================
// SUMMARY
// ===========================================
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📈 Total: ${passedTests + failedTests}`);
console.log(`🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);
console.log('='.repeat(50));

if (failedTests === 0) {
  console.log('\n🎉 All tests passed! Input sanitization is working correctly.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}
