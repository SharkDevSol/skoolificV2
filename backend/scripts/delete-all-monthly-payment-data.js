/**
 * Delete All Monthly Payment Data
 * 
 * This script removes all monthly payment related data including:
 * - Fee structures
 * - Late fee rules
 * - Invoices
 * - Invoice items
 * - Payments
 * - Payment allocations
 * 
 * WARNING: This action cannot be undone!
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllMonthlyPaymentData() {
  console.log('🗑️  Starting deletion of all monthly payment data...\n');

  try {
    // Start a transaction to ensure all deletions succeed or fail together
    await prisma.$transaction(async (tx) => {
      
      // 1. Delete payment allocations first (foreign key dependency)
      console.log('1️⃣  Deleting payment allocations...');
      const paymentAllocations = await tx.paymentAllocation.deleteMany({});
      console.log(`   ✓ Deleted ${paymentAllocations.count} payment allocations\n`);

      // 2. Delete payments
      console.log('2️⃣  Deleting payments...');
      const payments = await tx.payment.deleteMany({});
      console.log(`   ✓ Deleted ${payments.count} payments\n`);

      // 3. Delete invoice items
      console.log('3️⃣  Deleting invoice items...');
      const invoiceItems = await tx.invoiceItem.deleteMany({});
      console.log(`   ✓ Deleted ${invoiceItems.count} invoice items\n`);

      // 4. Delete invoices
      console.log('4️⃣  Deleting invoices...');
      const invoices = await tx.invoice.deleteMany({});
      console.log(`   ✓ Deleted ${invoices.count} invoices\n`);

      // 5. Delete fee structure items
      console.log('5️⃣  Deleting fee structure items...');
      const feeStructureItems = await tx.feeStructureItem.deleteMany({});
      console.log(`   ✓ Deleted ${feeStructureItems.count} fee structure items\n`);

      // 6. Delete fee structures
      console.log('6️⃣  Deleting fee structures...');
      const feeStructures = await tx.feeStructure.deleteMany({});
      console.log(`   ✓ Deleted ${feeStructures.count} fee structures\n`);

      // 7. Delete late fee rules
      console.log('7️⃣  Deleting late fee rules...');
      const lateFeeRules = await tx.lateFeeRule.deleteMany({});
      console.log(`   ✓ Deleted ${lateFeeRules.count} late fee rules\n`);

      // 8. Delete discounts (optional - if you want to keep discounts, comment this out)
      console.log('8️⃣  Deleting discounts...');
      const discounts = await tx.discount.deleteMany({});
      console.log(`   ✓ Deleted ${discounts.count} discounts\n`);

      // 9. Delete scholarships (optional - if you want to keep scholarships, comment this out)
      console.log('9️⃣  Deleting scholarships...');
      const scholarships = await tx.scholarship.deleteMany({});
      console.log(`   ✓ Deleted ${scholarships.count} scholarships\n`);

    });

    console.log('✅ All monthly payment data has been deleted successfully!\n');
    console.log('📊 Summary:');
    console.log('   - Payment allocations: Deleted');
    console.log('   - Payments: Deleted');
    console.log('   - Invoice items: Deleted');
    console.log('   - Invoices: Deleted');
    console.log('   - Fee structure items: Deleted');
    console.log('   - Fee structures: Deleted');
    console.log('   - Late fee rules: Deleted');
    console.log('   - Discounts: Deleted');
    console.log('   - Scholarships: Deleted');
    console.log('\n💡 Note: Chart of accounts and academic years were NOT deleted.');
    console.log('   You can reuse them for new payment settings.\n');

  } catch (error) {
    console.error('❌ Error deleting monthly payment data:', error);
    console.error('\nDetails:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Confirmation prompt
console.log('⚠️  WARNING: This will delete ALL monthly payment data!');
console.log('   This includes:');
console.log('   - All fee structures');
console.log('   - All late fee rules');
console.log('   - All invoices and invoice items');
console.log('   - All payments and payment allocations');
console.log('   - All discounts and scholarships');
console.log('\n   This action CANNOT be undone!\n');

// Check for --confirm flag
const args = process.argv.slice(2);
if (!args.includes('--confirm')) {
  console.log('❌ Deletion cancelled.');
  console.log('\nTo proceed with deletion, run:');
  console.log('   node backend/scripts/delete-all-monthly-payment-data.js --confirm\n');
  process.exit(0);
}

// Run the deletion
deleteAllMonthlyPaymentData();
