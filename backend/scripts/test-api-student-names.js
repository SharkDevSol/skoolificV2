const axios = require('axios');

async function testStudentNames() {
  try {
    console.log('🧪 Testing API for student names...\n');

    // You'll need to replace this with a valid auth token
    // For now, let's just test if the endpoint works
    const response = await axios.get('http://localhost:5000/api/finance/monthly-payments-view/class/C?currentMonth=5', {
      headers: {
        // Add your auth token here if needed
        // 'Authorization': 'Bearer YOUR_TOKEN'
      }
    });

    console.log('✅ API Response received\n');
    
    if (response.data && response.data.students) {
      console.log(`📊 Found ${response.data.students.length} students\n`);
      
      console.log('📋 Student names in response:');
      response.data.students.forEach(student => {
        console.log(`   ${student.studentId} → ${student.studentName || 'MISSING!'}`);
      });
      
      const missingNames = response.data.students.filter(s => !s.studentName || s.studentName === 'Unknown');
      if (missingNames.length > 0) {
        console.log(`\n⚠️  ${missingNames.length} students have missing names`);
      } else {
        console.log('\n✅ All students have names!');
      }
    } else {
      console.log('⚠️  No students found in response');
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.statusText);
      if (error.response.status === 401) {
        console.log('\n💡 This endpoint requires authentication');
        console.log('💡 Test by logging into the app and checking the UI');
      }
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testStudentNames();
