const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Fix all invoice due dates to use Month Start + Grace Period
 */
async function fixInvoiceDueDates() {
  try {
    console.log('🔧 Starting to fix invoice due dates...\n');

    // Get active late fee rules to determine grace period
    const lateFeeRules = await prisma.lateFeeRule.findMany({
      where: { isActive: true },
      orderBy: { gracePeriodDays: 'desc' }
    });

    const gracePeriodDays = lateFeeRules.length > 0 ? lateFeeRules[0].gracePeriodDays : 15;
    console.log(`📅 Using grace period: ${gracePeriodDays} days\n`);

    // Get all invoices
    const invoices = await prisma.invoice.findMany({
      orderBy: [
        { studentId: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    console.log(`📊 Found ${invoices.length} invoices to update\n`);

    if (invoices.length === 0) {
      console.log('✅ No invoices to update!');
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    // Helper function to calculate due date using Ethiopian calendar
    const calculateDueDate = (monthNumber, gracePeriod) => {
      // Current Ethiopian year is 2018, Gregorian year is 2026
      const gregorianYear = 2026;
      
      // Ethiopian New Year (Meskerem 1, 2018) = September 11, 2025
      const ethiopianNewYear = new Date(gregorianYear - 1, 8, 11); // September 11, 2025
      
      // Each Ethiopian month is 30 days (except Pagume which is 5-6 days)
      // Month 1 (Meskerem) starts on Ethiopian New Year
      // Month 2 (Tikimt) starts 30 days later, etc.
      const daysFromNewYear = (monthNumber - 1) * 30;
      
      // Calculate the 1st day of the Ethiopian month in Gregorian calendar
      const monthStartDate = new Date(ethiopianNewYear);
      monthStartDate.setDate(monthStartDate.getDate() + daysFromNewYear);
      
      // Due date = Month start (1st of Ethiopian month) + Grace period days
      const dueDate = new Date(monthStartDate);
      dueDate.setDate(dueDate.getDate() + gracePeriod);
      
      return dueDate;
    };

    // Update each invoice
    for (const invoice of invoices) {
      try {
        const monthNumber = invoice.metadata?.monthNumber;
        
        if (!monthNumber) {
          console.log(`⚠️  Skipping invoice ${invoice.invoiceNumber} - no month number in metadata`);
          continue;
        }

        // Calculate new due date
        const newDueDate = calculateDueDate(monthNumber, gracePeriodDays);
        
        // Update invoice
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { dueDate: newDueDate }
        });

        updatedCount++;
        
        if (updatedCount % 10 === 0) {
          console.log(`✓ Updated ${updatedCount} invoices...`);
        }

      } catch (error) {
        console.error(`❌ Error updating invoice ${invoice.invoiceNumber}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n✅ Due date update complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Total invoices: ${invoices.length}`);
    console.log(`   - Successfully updated: ${updatedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Grace period used: ${gracePeriodDays} days`);

    // Show sample of updated invoices
    console.log('\n📋 Sample of updated invoices:');
    const sampleInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'asc' },
      select: {
        invoiceNumber: true,
        dueDate: true,
        metadata: true
      }
    });

    sampleInvoices.forEach(inv => {
      const monthName = inv.metadata?.month || 'Unknown';
      const monthNumber = inv.metadata?.monthNumber || '?';
      console.log(`   - ${inv.invoiceNumber} (Month ${monthNumber} - ${monthName}): Due ${inv.dueDate.toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('❌ Error fixing invoice due dates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixInvoiceDueDates()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
