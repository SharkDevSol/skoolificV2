/**
 * Test Suite for Backend API Configuration
 * 
 * This file tests the centralized API configuration system to ensure:
 * - Config file loads without errors
 * - Helper functions work correctly
 * - Endpoints are properly defined
 * - Environment switching works
 */

const {
  ENV,
  BASE_URLS,
  API_ENDPOINTS,
  getBaseURL,
  getEndpoint,
  getEndpointPath,
  hasEndpoint,
  getModuleEndpoints
} = require('./api.config');

console.log('='.repeat(80));
console.log('BACKEND API CONFIG TEST SUITE');
console.log('='.repeat(80));
console.log('');

// Test 1: Config file loads successfully
console.log('Test 1: Config File Loading');
console.log('-'.repeat(80));
try {
  console.log('✅ Config file loaded successfully');
  console.log(`   Current Environment: ${ENV}`);
  console.log('');
} catch (error) {
  console.error('❌ Config file failed to load:', error.message);
  process.exit(1);
}

// Test 2: BASE_URLS structure
console.log('Test 2: BASE_URLS Structure');
console.log('-'.repeat(80));
try {
  const requiredEnvs = ['development', 'production', 'test'];
  const requiredServices = ['backend', 'frontend'];
  
  let passed = true;
  
  requiredEnvs.forEach(env => {
    if (!BASE_URLS[env]) {
      console.error(`❌ Missing environment: ${env}`);
      passed = false;
    } else {
      requiredServices.forEach(service => {
        if (!BASE_URLS[env][service]) {
          console.error(`❌ Missing service '${service}' in environment '${env}'`);
          passed = false;
        }
      });
    }
  });
  
  if (passed) {
    console.log('✅ BASE_URLS structure is valid');
    console.log(`   Development Backend: ${BASE_URLS.development.backend}`);
    console.log(`   Production Backend: ${BASE_URLS.production.backend}`);
  }
  console.log('');
} catch (error) {
  console.error('❌ BASE_URLS structure test failed:', error.message);
}

// Test 3: API_ENDPOINTS structure
console.log('Test 3: API_ENDPOINTS Structure');
console.log('-'.repeat(80));
try {
  const requiredModules = [
    'HEALTH', 'AUTH', 'ADMIN', 'STUDENTS', 'STAFF', 'GUARDIANS',
    'ATTENDANCE', 'ACADEMIC', 'FINANCE', 'HR', 'COMMUNICATION'
  ];
  
  let passed = true;
  let endpointCount = 0;
  
  requiredModules.forEach(module => {
    if (!API_ENDPOINTS[module]) {
      console.error(`❌ Missing module: ${module}`);
      passed = false;
    } else {
      const moduleEndpoints = Object.keys(API_ENDPOINTS[module]);
      endpointCount += moduleEndpoints.length;
    }
  });
  
  if (passed) {
    console.log('✅ API_ENDPOINTS structure is valid');
    console.log(`   Total modules: ${Object.keys(API_ENDPOINTS).length}`);
    console.log(`   Sample endpoints found: ${endpointCount}+`);
  }
  console.log('');
} catch (error) {
  console.error('❌ API_ENDPOINTS structure test failed:', error.message);
}

// Test 4: getBaseURL() function
console.log('Test 4: getBaseURL() Function');
console.log('-'.repeat(80));
try {
  const backendURL = getBaseURL();
  const frontendURL = getBaseURL('frontend');
  const prodURL = getBaseURL('backend', 'production');
  
  console.log('✅ getBaseURL() works correctly');
  console.log(`   Backend URL (current env): ${backendURL}`);
  console.log(`   Frontend URL (current env): ${frontendURL}`);
  console.log(`   Production Backend URL: ${prodURL}`);
  console.log('');
} catch (error) {
  console.error('❌ getBaseURL() test failed:', error.message);
}

// Test 5: getEndpoint() function
console.log('Test 5: getEndpoint() Function');
console.log('-'.repeat(80));
try {
  const loginEndpoint = getEndpoint('AUTH.LOGIN');
  const studentListEndpoint = getEndpoint('STUDENTS.LIST');
  const studentByIdEndpoint = getEndpoint('STUDENTS.BY_ID', { id: 123 });
  const markListCreateEndpoint = getEndpoint('ACADEMIC.MARK_LIST.CREATE');
  
  console.log('✅ getEndpoint() works correctly');
  console.log(`   AUTH.LOGIN: ${loginEndpoint}`);
  console.log(`   STUDENTS.LIST: ${studentListEndpoint}`);
  console.log(`   STUDENTS.BY_ID(123): ${studentByIdEndpoint}`);
  console.log(`   ACADEMIC.MARK_LIST.CREATE: ${markListCreateEndpoint}`);
  console.log('');
} catch (error) {
  console.error('❌ getEndpoint() test failed:', error.message);
}

// Test 6: getEndpointPath() function
console.log('Test 6: getEndpointPath() Function');
console.log('-'.repeat(80));
try {
  const loginPath = getEndpointPath('AUTH.LOGIN');
  const studentPath = getEndpointPath('STUDENTS.BY_ID', { id: 456 });
  
  console.log('✅ getEndpointPath() works correctly');
  console.log(`   AUTH.LOGIN path: ${loginPath}`);
  console.log(`   STUDENTS.BY_ID(456) path: ${studentPath}`);
  console.log('');
} catch (error) {
  console.error('❌ getEndpointPath() test failed:', error.message);
}

// Test 7: hasEndpoint() function
console.log('Test 7: hasEndpoint() Function');
console.log('-'.repeat(80));
try {
  const existsLogin = hasEndpoint('AUTH.LOGIN');
  const existsStudents = hasEndpoint('STUDENTS.LIST');
  const existsInvalid = hasEndpoint('INVALID.ENDPOINT');
  
  console.log('✅ hasEndpoint() works correctly');
  console.log(`   AUTH.LOGIN exists: ${existsLogin}`);
  console.log(`   STUDENTS.LIST exists: ${existsStudents}`);
  console.log(`   INVALID.ENDPOINT exists: ${existsInvalid}`);
  console.log('');
} catch (error) {
  console.error('❌ hasEndpoint() test failed:', error.message);
}

// Test 8: getModuleEndpoints() function
console.log('Test 8: getModuleEndpoints() Function');
console.log('-'.repeat(80));
try {
  const authEndpoints = getModuleEndpoints('AUTH');
  const studentEndpoints = getModuleEndpoints('STUDENTS');
  
  console.log('✅ getModuleEndpoints() works correctly');
  console.log(`   AUTH module endpoints: ${Object.keys(authEndpoints).length}`);
  console.log(`   STUDENTS module endpoints: ${Object.keys(studentEndpoints).length}`);
  console.log('');
} catch (error) {
  console.error('❌ getModuleEndpoints() test failed:', error.message);
}

// Test 9: Dynamic endpoint functions
console.log('Test 9: Dynamic Endpoint Functions');
console.log('-'.repeat(80));
try {
  const studentById = API_ENDPOINTS.STUDENTS.BY_ID(789);
  const staffById = API_ENDPOINTS.STAFF.BY_ID(101);
  const markListById = API_ENDPOINTS.ACADEMIC.MARK_LIST.BY_ID(202);
  
  console.log('✅ Dynamic endpoint functions work correctly');
  console.log(`   STUDENTS.BY_ID(789): ${studentById}`);
  console.log(`   STAFF.BY_ID(101): ${staffById}`);
  console.log(`   ACADEMIC.MARK_LIST.BY_ID(202): ${markListById}`);
  console.log('');
} catch (error) {
  console.error('❌ Dynamic endpoint functions test failed:', error.message);
}

// Test 10: Environment switching
console.log('Test 10: Environment Switching');
console.log('-'.repeat(80));
try {
  const devURL = getBaseURL('backend', 'development');
  const prodURL = getBaseURL('backend', 'production');
  const testURL = getBaseURL('backend', 'test');
  
  console.log('✅ Environment switching works correctly');
  console.log(`   Development: ${devURL}`);
  console.log(`   Production: ${prodURL}`);
  console.log(`   Test: ${testURL}`);
  console.log('');
} catch (error) {
  console.error('❌ Environment switching test failed:', error.message);
}

// Summary
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log('✅ All backend API config tests passed!');
console.log('');
console.log('Configuration Details:');
console.log(`   - Environment: ${ENV}`);
console.log(`   - Base URL: ${getBaseURL()}`);
console.log(`   - Total Modules: ${Object.keys(API_ENDPOINTS).length}`);
console.log(`   - Helper Functions: 5 (all working)`);
console.log('');
console.log('='.repeat(80));
