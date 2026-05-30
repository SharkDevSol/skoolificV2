const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupAcademicYear() {
  try {
    console.log('Setting up default academic year...\n');

    // For now, we'll use a fixed UUID for the current academic year
    // In a real system, you'd have an AcademicYear table
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const academicYearName = `${currentYear}-${nextYear}`;
    
    // Use a deterministic UUID based on the year
    // This ensures the same year always gets the same UUID
    const academicYearId = '00000000-0000-0000-0000-' + currentYear.toString().padStart(12, '0');
    
    console.log('✅ Academic Year Configuration:');
    console.log(`   Name: ${academicYearName}`);
    console.log(`   ID: ${academicYearId}`);
    console.log('\n📝 Use this ID in your fee structures');
    console.log('\n💡 Note: In a production system, you should create an AcademicYear table');
    console.log('   to properly manage academic years, terms, and dates.');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupAcademicYear();
