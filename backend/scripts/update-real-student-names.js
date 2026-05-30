const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRealStudentNames() {
  try {
    console.log('📝 Updating student names with REAL names...\n');

    // REPLACE THESE WITH YOUR ACTUAL STUDENT NAMES
    const studentNames = {
      '00000000-0000-0000-0004-000000000001': 'Ahmed Ali Hassan',
      '00000000-0000-0000-0005-000000000002': 'Fatima Omar Mohammed',
      '00000000-0000-0000-0006-000000000003': 'Hassan Yusuf Ibrahim'
    };

    console.log('⚠️  IMPORTANT: Edit this script and replace the names above with your actual student names!\n');
    console.log('Current names to be updated:');
    for (const [id, name] of Object.entries(studentNames)) {
      console.log(`   ${id} → ${name}`);
    }

    console.log('\n❓ Do you want to proceed with these names?');
    console.log('   If YES: The names above will be saved to the database');
    console.log('   If NO: Edit this script first, then run again\n');

    // Uncomment the lines below after editing the names above
    /*
    let updated = 0;
    for (const [studentId, studentName] of Object.entries(studentNames)) {
      await prisma.student.update({
        where: { id: studentId },
        data: { studentName }
      });
      console.log(`✅ Updated: ${studentId} → ${studentName}`);
      updated++;
    }

    console.log(`\n✅ Successfully updated ${updated} student names!\n`);
    console.log('💡 Refresh your browser to see the changes');
    */

    console.log('⚠️  Update blocked: Uncomment the code in this script to proceed');
    console.log('💡 This is a safety feature to prevent accidental updates\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateRealStudentNames();
