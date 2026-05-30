/**
 * Example Script: Generate Monthly Invoices
 * 
 * This script demonstrates how to generate monthly invoices for students.
 * Modify the studentIds and other parameters according to your needs.
 * 
 * Usage: node scripts/generate-monthly-invoices-example.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateMonthlyInvoices() {
  console.log('📄 Generating Monthly Invoices...\n');

  try {
    // Configuration
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Calculate due date (end of current month)
    const dueDate = new Date(currentYear, currentMonth, 0);
    
    console.log(`📅 Month: ${currentMonth}/${currentYear}`);
    console.log(`📅 Due Date: ${dueDate.toISOString().split('T')[0]}\n`);

    // Get fee structures
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        isActive: true
      },
      include: {
        items: true
      }
    });

    if (feeStructures.length === 0) {
      console.log('⚠️  No fee structures found. Please run setup-monthly-payments.js first.');
      return;
    }

    console.log(`Found ${feeStructures.length} fee structures:\n`);
    feeStructures.forEach(fs => {
      const totalAmount = fs.items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      console.log(`  - ${fs.name}: $${totalAmount}`);
    });
    console.log('');

    // Example: Get students from database
    // In a real scenario, you would fetch actual students
    console.log('📝 Note: This is an example script.');
    console.log('To generate actual invoices, you need to:');
    console.log('1. Fetch real student IDs from your database');
    console.log('2. Match students to their appropriate fee structures');
    console.log('3. Call the invoice generation API\n');

    console.log('Example API call:');
    console.log('─────────────────────────────────────────');
    console.log('POST /api/finance/invoices/generate');
    console.log(JSON.stringify({
      studentIds: ['student-uuid-1', 'student-uuid-2', 'student-uuid-3'],
      feeStructureId: feeStructures[0]?.id || 'fee-structure-uuid',
      academicYearId: feeStructures[0]?.academicYearId || 'academic-year-id',
      dueDate: dueDate.toISOString().split('T')[0],
      campusId: 'your-campus-id',
      applyDiscounts: true
    }, null, 2));
    console.log('─────────────────────────────────────────\n');

    // Example: Generate invoices for a sample class
    console.log('💡 To generate invoices programmatically:');
    console.log('');
    console.log('const invoiceService = require("../services/invoiceService");');
    console.log('');
    console.log('const result = await invoiceService.generateBulkInvoices({');
    console.log('  studentIds: [/* array of student IDs */],');
    console.log('  feeStructureId: "fee-structure-id",');
    console.log('  academicYearId: "academic-year-id",');
    console.log('  dueDate: new Date(),');
    console.log('  campusId: "campus-id",');
    console.log('  createdBy: "user-id",');
    console.log('  applyDiscounts: true');
    console.log('});\n');

    // Show existing invoices for current month
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lte: new Date(currentYear, currentMonth, 0)
        }
      },
      include: {
        items: true
      }
    });

    if (existingInvoices.length > 0) {
      console.log(`📊 Found ${existingInvoices.length} existing invoices for ${currentMonth}/${currentYear}:`);
      console.log('─────────────────────────────────────────');
      
      const summary = {
        total: existingInvoices.length,
        paid: existingInvoices.filter(i => i.status === 'PAID').length,
        partial: existingInvoices.filter(i => i.status === 'PARTIALLY_PAID').length,
        unpaid: existingInvoices.filter(i => i.status === 'ISSUED' || i.status === 'OVERDUE').length,
        totalAmount: existingInvoices.reduce((sum, i) => sum + parseFloat(i.netAmount), 0),
        paidAmount: existingInvoices.reduce((sum, i) => sum + parseFloat(i.paidAmount), 0)
      };

      console.log(`Total Invoices: ${summary.total}`);
      console.log(`Paid: ${summary.paid}`);
      console.log(`Partial: ${summary.partial}`);
      console.log(`Unpaid: ${summary.unpaid}`);
      console.log(`Total Amount: $${summary.totalAmount.toFixed(2)}`);
      console.log(`Paid Amount: $${summary.paidAmount.toFixed(2)}`);
      console.log(`Pending: $${(summary.totalAmount - summary.paidAmount).toFixed(2)}`);
      console.log('─────────────────────────────────────────\n');
    } else {
      console.log(`ℹ️  No invoices found for ${currentMonth}/${currentYear}\n`);
    }

    console.log('✅ Script completed\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateMonthlyInvoices()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
