/**
 * Test Script for QueryBuilder
 * 
 * Tests the QueryBuilder class to ensure it prevents SQL injection
 * and generates safe parameterized queries.
 * 
 * Run: node backend/utils/test-query-builder.js
 */

const {
  validateIdentifier,
  escapeIdentifier,
  buildSelect,
  buildInsert,
  buildUpdate,
  buildDelete,
  buildCount,
} = require('./QueryBuilder');

console.log('🧪 Testing QueryBuilder\n');

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
// IDENTIFIER VALIDATION TESTS
// ===========================================
console.log('🔒 Identifier Validation Tests');

test('Should accept valid identifier', () => {
  const result = validateIdentifier('GRADE10');
  assert(result === 'GRADE10', 'Valid identifier rejected');
});

test('Should accept identifier with underscores', () => {
  const result = validateIdentifier('student_name');
  assert(result === 'student_name', 'Underscore identifier rejected');
});

test('Should accept identifier with spaces', () => {
  const result = validateIdentifier('GRADE 10');
  assert(result === 'GRADE 10', 'Space identifier rejected');
});

test('Should reject identifier with special characters', () => {
  try {
    validateIdentifier('table; DROP TABLE users--');
    throw new Error('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('Invalid identifier'), 'SQL injection not detected');
  }
});

test('Should reject SQL keywords', () => {
  try {
    validateIdentifier('SELECT');
    throw new Error('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('SQL keyword'), 'SQL keyword not rejected');
  }
});

test('Should reject empty identifier', () => {
  try {
    validateIdentifier('');
    throw new Error('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('non-empty string'), 'Empty identifier not rejected');
  }
});

// ===========================================
// IDENTIFIER ESCAPING TESTS
// ===========================================
console.log('\n🔒 Identifier Escaping Tests');

test('Should escape identifier with quotes', () => {
  const result = escapeIdentifier('GRADE10');
  assert(result === '"GRADE10"', 'Identifier not escaped');
});

test('Should reject identifier with double quotes', () => {
  try {
    escapeIdentifier('test"table');
    throw new Error('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('Invalid identifier'), 'Double quotes not rejected');
  }
});

// ===========================================
// SELECT QUERY TESTS
// ===========================================
console.log('\n📖 SELECT Query Tests');

test('Should build basic SELECT query', () => {
  const query = buildSelect({
    schema: 'classes_schema',
    table: 'GRADE10',
    columns: ['student_name', 'age'],
  });
  
  assert(query.text.includes('SELECT'), 'SELECT not in query');
  assert(query.text.includes('"classes_schema"'), 'Schema not escaped');
  assert(query.text.includes('"GRADE10"'), 'Table not escaped');
  assert(query.text.includes('"student_name"'), 'Column not escaped');
});

test('Should build SELECT with WHERE clause', () => {
  const query = buildSelect({
    table: 'students',
    where: { id: 1, is_active: true },
  });
  
  assert(query.text.includes('WHERE'), 'WHERE not in query');
  assert(query.text.includes('$1'), 'Parameter placeholder not found');
  assert(query.values.includes(1), 'Value not in array');
  assert(query.values.includes(true), 'Boolean value not in array');
});

test('Should build SELECT with ORDER BY', () => {
  const query = buildSelect({
    table: 'students',
    orderBy: 'student_name',
  });
  
  assert(query.text.includes('ORDER BY'), 'ORDER BY not in query');
  assert(query.text.includes('"student_name"'), 'Order column not escaped');
});

test('Should build SELECT with LIMIT and OFFSET', () => {
  const query = buildSelect({
    table: 'students',
    limit: 10,
    offset: 20,
  });
  
  assert(query.text.includes('LIMIT'), 'LIMIT not in query');
  assert(query.text.includes('OFFSET'), 'OFFSET not in query');
  assert(query.values.includes(10), 'Limit value not in array');
  assert(query.values.includes(20), 'Offset value not in array');
});

// ===========================================
// INSERT QUERY TESTS
// ===========================================
console.log('\n➕ INSERT Query Tests');

test('Should build basic INSERT query', () => {
  const query = buildInsert({
    table: 'students',
    data: {
      student_name: 'John Doe',
      age: 15,
      is_active: true,
    },
  });
  
  assert(query.text.includes('INSERT INTO'), 'INSERT INTO not in query');
  assert(query.text.includes('VALUES'), 'VALUES not in query');
  assert(query.text.includes('$1'), 'Parameter placeholder not found');
  assert(query.values.includes('John Doe'), 'Name not in values');
  assert(query.values.includes(15), 'Age not in values');
});

test('Should build INSERT with RETURNING', () => {
  const query = buildInsert({
    table: 'students',
    data: { student_name: 'Jane Doe' },
    returning: 'id',
  });
  
  assert(query.text.includes('RETURNING'), 'RETURNING not in query');
  assert(query.text.includes('"id"'), 'Return column not escaped');
});

// ===========================================
// UPDATE QUERY TESTS
// ===========================================
console.log('\n✏️  UPDATE Query Tests');

test('Should build basic UPDATE query', () => {
  const query = buildUpdate({
    table: 'students',
    data: { student_name: 'John Smith', age: 16 },
    where: { id: 1 },
  });
  
  assert(query.text.includes('UPDATE'), 'UPDATE not in query');
  assert(query.text.includes('SET'), 'SET not in query');
  assert(query.text.includes('WHERE'), 'WHERE not in query');
  assert(query.text.includes('$1'), 'Parameter placeholder not found');
  assert(query.values.includes('John Smith'), 'Name not in values');
  assert(query.values.includes(1), 'ID not in values');
});

test('Should require WHERE clause for UPDATE', () => {
  try {
    buildUpdate({
      table: 'students',
      data: { student_name: 'John Smith' },
      where: {},
    });
    throw new Error('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('WHERE clause is required'), 'WHERE requirement not enforced');
  }
});

// ===========================================
// DELETE QUERY TESTS
// ===========================================
console.log('\n🗑️  DELETE Query Tests');

test('Should build basic DELETE query', () => {
  const query = buildDelete({
    table: 'students',
    where: { id: 1 },
  });
  
  assert(query.text.includes('DELETE FROM'), 'DELETE FROM not in query');
  assert(query.text.includes('WHERE'), 'WHERE not in query');
  assert(query.text.includes('$1'), 'Parameter placeholder not found');
  assert(query.values.includes(1), 'ID not in values');
});

test('Should require WHERE clause for DELETE', () => {
  try {
    buildDelete({
      table: 'students',
      where: {},
    });
    throw new Error('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('WHERE clause is required'), 'WHERE requirement not enforced');
  }
});

// ===========================================
// COUNT QUERY TESTS
// ===========================================
console.log('\n🔢 COUNT Query Tests');

test('Should build basic COUNT query', () => {
  const query = buildCount({
    table: 'students',
  });
  
  assert(query.text.includes('SELECT COUNT(*)'), 'COUNT not in query');
  assert(query.text.includes('as count'), 'Count alias not in query');
});

test('Should build COUNT with WHERE clause', () => {
  const query = buildCount({
    table: 'students',
    where: { is_active: true },
  });
  
  assert(query.text.includes('WHERE'), 'WHERE not in query');
  assert(query.text.includes('$1'), 'Parameter placeholder not found');
  assert(query.values.includes(true), 'Value not in array');
});

// ===========================================
// SQL INJECTION PREVENTION TESTS
// ===========================================
console.log('\n🛡️  SQL Injection Prevention Tests');

test('Should prevent SQL injection in table name', () => {
  try {
    buildSelect({
      table: 'users; DROP TABLE students--',
    });
    throw new Error('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('Invalid identifier'), 'SQL injection not prevented');
  }
});

test('Should prevent SQL injection in column name', () => {
  try {
    buildSelect({
      table: 'students',
      columns: ['name; DROP TABLE users--'],
    });
    throw new Error('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('Invalid identifier'), 'SQL injection not prevented');
  }
});

test('Should use parameterized values for WHERE clause', () => {
  const query = buildSelect({
    table: 'students',
    where: { name: "'; DROP TABLE users--" },
  });
  
  // The malicious value should be in the values array, not in the query text
  assert(query.text.includes('$1'), 'Not using parameterized query');
  assert(query.values.includes("'; DROP TABLE users--"), 'Value not parameterized');
  assert(!query.text.includes('DROP TABLE'), 'SQL injection in query text');
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
  console.log('\n🎉 All tests passed! QueryBuilder is working correctly.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}
