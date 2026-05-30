const axios = require('axios');

/**
 * Test AI06 Machine HTTP API
 * Try common ZKTeco API endpoints
 */

const MACHINE_IP = '10.22.134.43';
const BASE_URL = `http://${MACHINE_IP}`;

// Common ZKTeco API endpoints
const endpoints = [
  // Attendance data endpoints
  { path: '/csl/check', method: 'GET', desc: 'Get attendance records' },
  { path: '/csl/user', method: 'GET', desc: 'Get user list' },
  { path: '/csl/att', method: 'GET', desc: 'Get attendance logs' },
  { path: '/att/getrecord', method: 'GET', desc: 'Get attendance records' },
  { path: '/api/attendance', method: 'GET', desc: 'Attendance API' },
  { path: '/api/users', method: 'GET', desc: 'Users API' },
  
  // Device info endpoints
  { path: '/csl/devinfo', method: 'GET', desc: 'Device information' },
  { path: '/api/device/info', method: 'GET', desc: 'Device info' },
  { path: '/device/info', method: 'GET', desc: 'Device information' },
  
  // Common paths
  { path: '/api', method: 'GET', desc: 'API root' },
  { path: '/cgi-bin/api', method: 'GET', desc: 'CGI API' },
  { path: '/zkapi', method: 'GET', desc: 'ZK API' },
];

async function testEndpoint(endpoint) {
  try {
    const url = `${BASE_URL}${endpoint.path}`;
    const response = await axios({
      method: endpoint.method,
      url: url,
      timeout: 5000,
      validateStatus: () => true, // Accept any status code
    });

    return {
      endpoint: endpoint.path,
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      contentType: response.headers['content-type'],
      dataPreview: JSON.stringify(response.data).substring(0, 200),
    };
  } catch (error) {
    return {
      endpoint: endpoint.path,
      status: 'ERROR',
      success: false,
      error: error.message,
    };
  }
}

async function testAllEndpoints() {
  console.log('🔍 Testing AI06 Machine HTTP API\n');
  console.log('='.repeat(70));
  console.log(`Machine IP: ${MACHINE_IP}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('='.repeat(70));

  console.log('\n📡 Testing common API endpoints...\n');

  const results = [];

  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint.path}... `);
    const result = await testEndpoint(endpoint);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${result.status}`);
    } else if (result.status === 401 || result.status === 403) {
      console.log(`🔐 ${result.status} (Auth required)`);
    } else if (result.status === 404) {
      console.log(`❌ ${result.status} (Not found)`);
    } else {
      console.log(`⚠️  ${result.status || result.error}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTS SUMMARY:');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success);
  const authRequired = results.filter(r => r.status === 401 || r.status === 403);
  const notFound = results.filter(r => r.status === 404);

  console.log(`\n✅ Successful: ${successful.length}`);
  if (successful.length > 0) {
    successful.forEach(r => {
      console.log(`   - ${r.endpoint} (${r.status})`);
      console.log(`     Content-Type: ${r.contentType}`);
      console.log(`     Data: ${r.dataPreview}...`);
    });
  }

  console.log(`\n🔐 Auth Required: ${authRequired.length}`);
  if (authRequired.length > 0) {
    authRequired.forEach(r => {
      console.log(`   - ${r.endpoint} (${r.status})`);
    });
  }

  console.log(`\n❌ Not Found: ${notFound.length}`);

  console.log('\n' + '='.repeat(70));

  if (successful.length > 0) {
    console.log('\n🎉 SUCCESS! Found working API endpoints!');
    console.log('\n📌 NEXT STEPS:');
    console.log('1. Review the successful endpoints above');
    console.log('2. Check the data format returned');
    console.log('3. We can build a direct HTTP API sync service');
  } else if (authRequired.length > 0) {
    console.log('\n🔐 API endpoints found but require authentication');
    console.log('\n📌 NEXT STEPS:');
    console.log('1. Find API credentials in machine settings');
    console.log('2. Or check machine manual for API authentication');
    console.log('3. Try with admin username/password');
  } else {
    console.log('\n⚠️  No standard API endpoints found');
    console.log('\n📌 ALTERNATIVES:');
    console.log('1. Check machine web interface for API documentation');
    console.log('2. Use AAS 6.0 database sync (already working!)');
    console.log('3. Use CSV import method');
  }

  console.log('\n' + '='.repeat(70));
}

// Run tests
testAllEndpoints()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
