const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Delete all financial data
 * WARNING: This will delete ALL invoices, payments, fee structures, and late fee rules
 */
async function deleteAllFinanceData() {
  try {
    console.log('🗑️  Starting to delete all financial data...\n');

    // Delete in correct order to respect foreign key constraints
    
    console.log('Deleting payment allocations...');
    const paymentAllocations = await prisma.paymentAllocation.deleteMany({});
    console.log(`✓ Deleted ${paymentAllocations.count} payment allocations\n`);

    console.log('Deleting payments...');
    const payments = await prisma.payment.deleteMany({});
    console.log(`✓ Deleted ${payments.count} payments\n`);

    console.log('Deleting invoice items...');
    const invoiceItems = await prisma.invoiceItem.deleteMany({});
    console.log(`✓ Deleted ${invoiceItems.count} invoice items\n`);

    console.log('Deleting invoices...');
    const invoices = await prisma.invoice.deleteMany({});
    console.log(`✓ Deleted ${invoices.count} invoices\n`);

    console.log('Deleting fee structure items...');
    const feeStructureItems = await prisma.feeStructureItem.deleteMany({});
    console.log(`✓ Deleted ${feeStructureItems.count} fee structure items\n`);

    console.log('Deleting fee structures...');
    const feeStructures = await prisma.feeStructure.deleteMany({});
    console.log(`✓ Deleted ${feeStructures.count} fee structures\n`);

    console.log('Deleting late fee rules...');
    const lateFeeRules = await prisma.lateFeeRule.deleteMany({});
    console.log(`✓ Deleted ${lateFeeRules.count} late fee rules\n`);

    console.log('✅ All financial data deleted successfully!\n');
    console.log('You can now start fresh with new fee structures and invoices.');

  } catch (error) {
    console.error('❌ Error deleting financial data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteAllFinanceData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
