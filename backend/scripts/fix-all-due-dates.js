const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllDueDates() {
  try {
    console.log('🔧 Fixing All Invoice Due Dates...\n');

    // Get active late fee rules to determine grace period
    const lateFeeRules = await prisma.lateFeeRule.findMany({
      where: { isActive: true },
      orderBy: { gracePeriodDays: 'desc' }
    });

    const gracePeriodDays = lateFeeRules.length > 0 ? lateFeeRules[0].gracePeriodDays : 15;
    console.log(`✓ Grace Period: ${gracePeriodDays} days\n`);

    // Get all invoices
    const allInvoices = await prisma.invoice.findMany({
      orderBy: { dueDate: 'asc' }
    });

    console.log(`✓ Found ${allInvoices.length} invoices\n`);

    // Ethiopian New Year (Meskerem 1, 2018) = September 11, 2025
    const ethiopianNewYear = new Date(2025, 8, 11); // September 11, 2025

    const ethiopianMonths = [
      'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
      'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
    ];

    let fixedCount = 0;

    for (const invoice of allInvoices) {
      const metadata = invoice.metadata || {};
      const monthNumber = metadata.monthNumber;

      if (!monthNumber) {
        console.log(`⏭️  Skipping ${invoice.invoiceNumber} - no month number in metadata`);
        continue;
      }

      // Calculate correct due date
      // Month start = Ethiopian New Year + (monthNumber - 1) * 30 days
      // Due date = Month start + grace period
      const daysFromNewYear = (monthNumber - 1) * 30;
      const monthStartDate = new Date(ethiopianNewYear);
      monthStartDate.setDate(monthStartDate.getDate() + daysFromNewYear);
      
      const correctDueDate = new Date(monthStartDate);
      correctDueDate.setDate(correctDueDate.getDate() + gracePeriodDays);

      const currentDueDate = new Date(invoice.dueDate);
      
      // Check if due date needs updating
      if (currentDueDate.getTime() === correctDueDate.getTime()) {
        // Already correct
        continue;
      }

      const monthName = ethiopianMonths[monthNumber - 1] || 'Unknown';
      
      console.log(`${monthName} (M${monthNumber}) - ${invoice.invoiceNumber}`);
      console.log(`  Current Due Date: ${currentDueDate.toISOString().split('T')[0]}`);
      console.log(`  Correct Due Date: ${correctDueDate.toISOString().split('T')[0]}`);
      console.log(`  Ethiopian: ${monthNumber}/16/2018 (${monthName} 16, 2018)`);

      // Update the invoice
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          dueDate: correctDueDate
        }
      });

      console.log(`  ✅ FIXED!\n`);
      fixedCount++;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ Fixed: ${fixedCount} invoices`);
    console.log(`⏭️  Already correct: ${allInvoices.length - fixedCount} invoices`);
    console.log(`📋 Total processed: ${allInvoices.length} invoices`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (fixedCount > 0) {
      console.log('✅ SUCCESS! All due dates have been updated.');
      console.log('\nDue dates now follow Ethiopian calendar:');
      console.log('  - Meskerem: 1/16/2018');
      console.log('  - Tikimt: 2/16/2018');
      console.log('  - Hidar: 3/16/2018');
      console.log('  - Tahsas: 4/16/2018');
      console.log('  - Tir: 5/16/2018');
      console.log('  - Yekatit: 6/16/2018');
      console.log('  - etc...');
      console.log('\n🔄 Please refresh your browser to see the changes.');
    } else {
      console.log('ℹ️  All due dates are already correct!');
    }

    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

fixAllDueDates();
