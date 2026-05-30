const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
require('dotenv').config();

const prisma = new PrismaClient();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Convert composite ID (e.g., "6-3") to UUID format
function compositeIdToUUID(compositeId) {
  const [schoolId, classId] = compositeId.split('-');
  // Pad to create a valid UUID format
  const paddedSchoolId = schoolId.padStart(8, '0');
  const paddedClassId = classId.padStart(8, '0');
  return `00000000-0000-0000-${paddedSchoolId.slice(0, 4)}-${paddedSchoolId.slice(4)}${paddedClassId}`;
}

async function generateInvoices() {
  try {
    console.log('🚀 Starting invoice generation for Class C...\n');

    // 1. Get fee structure for Class C
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        gradeLevel: 'C',
        isActive: true
      },
      include: {
        items: true
      }
    });

    if (!feeStructure) {
      console.log('❌ No fee structure found for Class C');
      console.log('Please create a fee structure first in Monthly Payment Settings');
      return;
    }

    console.log('✅ Fee structure found:');
    console.log(`   Class: ${feeStructure.gradeLevel}`);
    console.log(`   Monthly Fee: ${feeStructure.items[0]?.amount || 0} Birr`);
    console.log('');

    // 2. Get students from Class C table
    const studentsResult = await pool.query(`
      SELECT 
        school_id,
        class_id,
        student_name
      FROM classes_schema."C"
      WHERE school_id IS NOT NULL AND class_id IS NOT NULL AND student_name IS NOT NULL
      ORDER BY student_name ASC
    `);

    const students = studentsResult.rows.map(s => ({
      id: `${s.school_id}-${s.class_id}`,
      name: s.student_name
    }));

    if (students.length === 0) {
      console.log('❌ No students found in Class C');
      return;
    }

    console.log(`✅ Found ${students.length} students in Class C`);
    students.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.name} (ID: ${s.id})`);
    });
    console.log('');

    // 3. Check if invoices already exist
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        feeStructureId: feeStructure.id
      }
    });

    if (existingInvoices.length > 0) {
      console.log(`⚠️  Found ${existingInvoices.length} existing invoices`);
      console.log('Deleting them to regenerate...');
      await prisma.invoice.deleteMany({
        where: {
          feeStructureId: feeStructure.id
        }
      });
      console.log('✅ Deleted existing invoices\n');
    }

    // 4. Parse selected months from description
    const description = JSON.parse(feeStructure.description || '{"months":[]}');
    const selectedMonths = description.months || [];

    if (selectedMonths.length === 0) {
      console.log('❌ No months selected in fee structure');
      return;
    }

    console.log(`✅ Generating invoices for ${selectedMonths.length} months`);
    console.log(`   Months: ${selectedMonths.join(', ')}\n`);

    // Ethiopian month names
    const ethiopianMonths = [
      'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
      'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
    ];

    // Calculate monthly amount
    const monthlyAmount = feeStructure.items.reduce((sum, item) => 
      sum + parseFloat(item.amount), 0
    );

    const accountId = feeStructure.items[0]?.accountId;
    const academicYearId = feeStructure.academicYearId;
    const campusId = feeStructure.campusId || '00000000-0000-0000-0000-000000000001';

    console.log('Debug - IDs:');
    console.log(`  accountId: ${accountId}`);
    console.log(`  academicYearId: ${academicYearId}`);
    console.log(`  campusId: ${campusId}`);
    console.log('');

    // 5. Generate invoices
    let totalCreated = 0;
    const baseDueDate = new Date();

    for (let monthIndex = 0; monthIndex < selectedMonths.length; monthIndex++) {
      const targetMonth = selectedMonths[monthIndex];
      const monthName = ethiopianMonths[targetMonth - 1];
      
      // Calculate due date for this month (30 days apart)
      const dueDate = new Date(baseDueDate);
      dueDate.setDate(dueDate.getDate() + (monthIndex * 30));

      console.log(`📅 Generating invoices for ${monthName} (Month ${monthIndex + 1})...`);

      for (const student of students) {
        try {
          const studentId = student.id; // Use composite ID directly
          const invoiceNumber = `INV-${Date.now()}-${student.id.replace(/[^a-zA-Z0-9]/g, '')}-M${monthIndex + 1}`;

          await prisma.invoice.create({
            data: {
              invoiceNumber: invoiceNumber,
              studentId: student.id,
              academicYearId: academicYearId,
              termId: null,
              feeStructureId: feeStructure.id,
              issueDate: new Date(),
              dueDate: dueDate,
              totalAmount: monthlyAmount,
              discountAmount: 0,
              lateFeeAmount: 0,
              netAmount: monthlyAmount,
              paidAmount: 0,
              status: 'ISSUED',
              campusId: campusId,
              createdBy: '00000000-0000-0000-0000-000000000001',
              metadata: {
                month: monthName,
                monthNumber: targetMonth,
                monthIndex: monthIndex + 1,
                totalMonths: selectedMonths.length,
                isAutoGenerated: true
              },
              items: {
                create: [{
                  description: `${monthName} Monthly Fee (Month ${monthIndex + 1} of ${selectedMonths.length})`,
                  feeCategory: 'TUITION',
                  amount: monthlyAmount,
                  accountId: accountId
                }]
              }
            }
          });

          totalCreated++;
        } catch (error) {
          console.error(`   ❌ Error for ${student.name}: ${error.message}`);
        }
      }

      console.log(`   ✅ Created ${students.length} invoices for ${monthName}`);
    }

    console.log('\n🎉 Invoice generation complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Total Invoices Created: ${totalCreated}`);
    console.log(`   Students: ${students.length}`);
    console.log(`   Months: ${selectedMonths.length}`);
    console.log(`   Monthly Fee: ${monthlyAmount} Birr`);
    console.log(`   Total Amount: ${totalCreated * monthlyAmount} Birr`);
    console.log('\n✅ Now go to Finance → Monthly Payments to view the data!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

generateInvoices();
