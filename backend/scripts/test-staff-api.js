const axios = require('axios');

async function testStaffAPI() {
  try {
    console.log('Testing staff API...\n');
    
    // You'll need to replace this with a valid token from your browser
    const token = 'YOUR_TOKEN_HERE';
    
    console.log('1. Testing GET /api/hr/salary/staff?staffType=TEACHER');
    const response = await axios.get('http://localhost:5000/api/hr/salary/staff?staffType=TEACHER', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('   Status:', response.status);
    console.log('   Success:', response.data.success);
    console.log('   Count:', response.data.count);
    console.log('\n   Staff found:');
    response.data.data.forEach(staff => {
      console.log(`   - ${staff.firstName} ${staff.lastName} (${staff.employeeNumber})`);
    });
    
  } catch (error) {
    if (error.response) {
      console.error('Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

console.log('Note: You need to get a valid token from your browser first.');
console.log('1. Open browser console (F12)');
console.log('2. Run: localStorage.getItem("authToken")');
console.log('3. Copy the token and replace YOUR_TOKEN_HERE in this script\n');

// testStaffAPI();
