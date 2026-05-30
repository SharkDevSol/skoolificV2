const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMissingStudents() {
  try {
    console.log('🔧 Creating missing Student records...\n');

    // Get all unique student IDs from invoices
    const invoices = await prisma.invoice.findMany({
      select: {
        studentId: true
      },
      distinct: ['studentId']
    });

    console.log(`📊 Found ${invoices.length} unique student IDs in invoices\n`);

    // Get existing students
    const existingStudents = await prisma.student.findMany({
      select: {
        id: true
      }
    });

    const existingIds = new Set(existingStudents.map(s => s.id));

    // Find missing students
    const missingStudentIds = invoices
      .map(inv => inv.studentId)
      .filter(id => !existingIds.has(id));

    if (missingStudentIds.length === 0) {
      console.log('✅ No missing students found. All invoice student IDs have Student records!\n');
      return;
    }

    console.log(`⚠️  Found ${missingStudentIds.length} missing students\n`);

    // Get or create a default class
    let defaultClass = await prisma.class.findFirst();
    
    if (!defaultClass) {
      console.log('📝 Creating default class...');
      defaultClass = await prisma.class.create({
        data: {
          name: 'Default Class'
        }
      });
      console.log(`✅ Created default class: ${defaultClass.id}\n`);
    } else {
      console.log(`✅ Using existing class: ${defaultClass.name} (${defaultClass.id})\n`);
    }

    // Get or create a default guardian (any user)
    let defaultGuardian = await prisma.user.findFirst({
      where: {
        role: 'director'
      }
    });

    if (!defaultGuardian) {
      console.log('⚠️  No director found, looking for any user...');
      defaultGuardian = await prisma.user.findFirst();
    }

    if (!defaultGuardian) {
      console.log('❌ No user found. Cannot create students without a guardian.');
      console.log('💡 Please create a user first, then run this script again.');
      return;
    }

    console.log(`✅ Using guardian: ${defaultGuardian.username} (${defaultGuardian.id})\n`);

    // Create missing students
    console.log('📝 Creating Student records...\n');
    
    for (const studentId of missingStudentIds) {
      // Extract a readable part from the UUID for the name
      const shortId = studentId.split('-').pop().slice(-4);
      const studentName = `Student ${shortId}`;

      await prisma.student.create({
        data: {
          id: studentId,
          studentName: studentName,
          classId: defaultClass.id,
          guardianId: defaultGuardian.id
        }
      });

      console.log(`   ✅ Created: ${studentId} → ${studentName}`);
    }

    console.log(`\n✅ Successfully created ${missingStudentIds.length} Student records!\n`);
    console.log('💡 Student names will now appear in the UI');
    console.log('💡 You can update the student names in the database if needed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingStudents();
