// Script to test student machine webhook with simulated data
const axios = require('axios');

async function testStudentMachineWebhook() {
  console.log('\n========================================');
  console.log('🧪 Testing Student Machine Webhook');
  console.log('========================================\n');

  const baseUrl = 'http://localhost:5000/api/machine';

  try {
    // Test 1: Health check
    console.log('Test 1: Health Check');
    console.log('-------------------');
    try {
      const healthResponse = await axios.get(`${baseUrl}/health`);
      console.log('✅ Health check passed');
      console.log('   Response:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      console.log('   Make sure backend is running on port 5000');
      return;
    }

    // Test 2: Simple test endpoint
    console.log('\nTest 2: Test Endpoint');
    console.log('-------------------');
    try {
      const testResponse = await axios.get(`${baseUrl}/test`);
      console.log('✅ Test endpoint passed');
      console.log('   Response:', testResponse.data);
    } catch (error) {
      console.log('❌ Test endpoint failed:', error.message);
    }

    // Test 3: Simulate student check-in (Machine ID 3001 = kalid abdulamid)
    console.log('\nTest 3: Simulate Student Check-in');
    console.log('-------------------');
    console.log('Simulating: kalid abdulamid (Machine ID 3001)');
    console.log('Time: Today at 08:30:00');
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const checkInTime = `${today} 08:30:00`;
    
    const studentData = {
      UserID: '3001',
      DateTime: checkInTime,
      Status: '0'
    };
    
    console.log('Sending data:', studentData);
    
    try {
      const response = await axios.post(`${baseUrl}/attendance`, studentData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Webhook accepted the data');
      console.log('   Status:', response.status);
      console.log('   Response:', response.data);
      console.log('\n📋 Check backend console for detailed processing logs');
      console.log('📋 Check student attendance page to see if it appears');
    } catch (error) {
      console.log('❌ Webhook failed:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Response:', error.response.data);
      }
    }

    // Test 4: Simulate late check-in
    console.log('\nTest 4: Simulate Late Check-in');
    console.log('-------------------');
    console.log('Simulating: kalid abdulamid (Machine ID 3001)');
    console.log('Time: Today at 09:30:00 (should be marked as LATE)');
    
    const lateCheckInTime = `${today} 09:30:00`;
    
    const lateData = {
      UserID: '3001',
      DateTime: lateCheckInTime,
      Status: '0'
    };
    
    console.log('Sending data:', lateData);
    
    try {
      const response = await axios.post(`${baseUrl}/attendance`, lateData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Webhook accepted the data');
      console.log('   Status:', response.status);
      console.log('   Response:', response.data);
    } catch (error) {
      console.log('❌ Webhook failed:', error.message);
    }

    // Test 5: Simulate unknown machine ID
    console.log('\nTest 5: Simulate Unknown Machine ID');
    console.log('-------------------');
    console.log('Simulating: Unknown user (Machine ID 9999)');
    
    const unknownData = {
      UserID: '9999',
      DateTime: checkInTime,
      Status: '0'
    };
    
    console.log('Sending data:', unknownData);
    
    try {
      const response = await axios.post(`${baseUrl}/attendance`, unknownData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Webhook accepted the data (but should reject internally)');
      console.log('   Check backend console - should show "Machine User ID 9999 not registered"');
    } catch (error) {
      console.log('❌ Webhook failed:', error.message);
    }

    console.log('\n========================================');
    console.log('✅ Test Complete');
    console.log('========================================');
    console.log('\nNext Steps:');
    console.log('1. Check backend console for detailed logs');
    console.log('2. Open Student Attendance page');
    console.log('3. Look for "kalid abdulamid" - should show PRESENT or LATE');
    console.log('4. If it works, configure your AI06 machine to push to this webhook');
    console.log('\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testStudentMachineWebhook();
