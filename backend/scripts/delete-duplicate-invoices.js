const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteDuplicateInvoices() {
  try {
    console.log('🔍 Finding duplicate invoices...\n');

    // Get all invoices grouped by student and month
    const invoices = await prisma.invoice.findMany({
      orderBy: [
        { studentId: 'asc' },
        { createdAt: 'asc' }
      ],
      include: {
        items: true
      }
    });

    // Group by studentId and month
    const grouped = {};
    
    for (const invoice of invoices) {
      const monthNumber = invoice.metadata?.monthNumber;
      if (!monthNumber) continue;

      const key = `${invoice.studentId}-${monthNumber}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(invoice);
    }

    // Find duplicates
    let duplicateCount = 0;
    const toDelete = [];

    for (const [key, invoiceList] of Object.entries(grouped)) {
      if (invoiceList.length > 1) {
        console.log(`Found ${invoiceList.length} duplicates for ${key}`);
        
        // Keep the first one, delete the rest
        for (let i = 1; i < invoiceList.length; i++) {
          toDelete.push(invoiceList[i].id);
          duplicateCount++;
        }
      }
    }

    if (toDelete.length === 0) {
      console.log('✅ No duplicate invoices found!');
      return;
    }

    console.log(`\n🗑️  Deleting ${duplicateCount} duplicate invoices...\n`);

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete payment allocations
      await tx.paymentAllocation.deleteMany({
        where: { invoiceId: { in: toDelete } }
      });

      // Delete invoice items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: { in: toDelete } }
      });

      // Delete invoices
      await tx.invoice.deleteMany({
        where: { id: { in: toDelete } }
      });
    });

    console.log(`✅ Successfully deleted ${duplicateCount} duplicate invoices!`);
    console.log('\n📊 Summary:');
    console.log(`   - Total duplicates removed: ${duplicateCount}`);
    console.log(`   - Unique invoices kept: ${Object.keys(grouped).length}`);

  } catch (error) {
    console.error('❌ Error deleting duplicate invoices:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteDuplicateInvoices()
  .then(() => {
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
