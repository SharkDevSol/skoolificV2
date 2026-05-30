const axios = require('axios');

async function checkClassStudents() {
  try {
    console.log('Checking students in Class C...\n');

    const response = await axios.get('http://localhost:5000/api/finance/classes/C/students');
    
    const students = response.data.data || [];

    console.log(`Total students in Class C: ${students.length}\n`);

    if (students.length === 0) {
      console.log('❌ No students found in Class C');
      console.log('\nPossible reasons:');
      console.log('1. No students have been assigned to Class C');
      console.log('2. Students exist but className field doesn\'t match "C"');
      console.log('3. API endpoint is not working correctly');
    } else {
      console.log('✅ Students found:\n');
      students.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name || 'Unknown'}`);
        console.log(`   ID: ${student.id}`);
        console.log(`   Class: ${student.className || 'N/A'}`);
        console.log('');
      });

      console.log(`\n📊 Invoice Generation:`);
      console.log(`   Students: ${students.length}`);
      console.log(`   Months: 10`);
      console.log(`   Total Invoices: ${students.length * 10}`);
      console.log(`   Monthly Fee: 1400 Birr`);
      console.log(`   Total Amount: ${students.length * 10 * 1400} Birr`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n❌ Make sure the backend server is running on port 5000');
  }
}

checkClassStudents();
