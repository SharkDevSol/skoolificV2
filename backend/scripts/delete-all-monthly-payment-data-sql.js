/**
 * Delete All Monthly Payment Data (SQL Version)
 * 
 * This script removes all monthly payment related data using direct SQL queries.
 * Use this if the Prisma version has issues.
 * 
 * WARNING: This action cannot be undone!
 */

const pool = require('../config/db');

async function deleteAllMonthlyPaymentData() {
  console.log('🗑️  Starting deletion of all monthly payment data...\n');

  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    // 1. Delete payment allocations first (foreign key dependency)
    console.log('1️⃣  Deleting payment allocations...');
    const paymentAllocations = await client.query('DELETE FROM "PaymentAllocation" RETURNING id');
    console.log(`   ✓ Deleted ${paymentAllocations.rowCount} payment allocations\n`);

    // 2. Delete payments
    console.log('2️⃣  Deleting payments...');
    const payments = await client.query('DELETE FROM "Payment" RETURNING id');
    console.log(`   ✓ Deleted ${payments.rowCount} payments\n`);

    // 3. Delete invoice items
    console.log('3️⃣  Deleting invoice items...');
    const invoiceItems = await client.query('DELETE FROM "InvoiceItem" RETURNING id');
    console.log(`   ✓ Deleted ${invoiceItems.rowCount} invoice items\n`);

    // 4. Delete invoices
    console.log('4️⃣  Deleting invoices...');
    const invoices = await client.query('DELETE FROM "Invoice" RETURNING id');
    console.log(`   ✓ Deleted ${invoices.rowCount} invoices\n`);

    // 5. Delete fee structure items
    console.log('5️⃣  Deleting fee structure items...');
    const feeStructureItems = await client.query('DELETE FROM "FeeStructureItem" RETURNING id');
    console.log(`   ✓ Deleted ${feeStructureItems.rowCount} fee structure items\n`);

    // 6. Delete fee structures
    console.log('6️⃣  Deleting fee structures...');
    const feeStructures = await client.query('DELETE FROM "FeeStructure" RETURNING id');
    console.log(`   ✓ Deleted ${feeStructures.rowCount} fee structures\n`);

    // 7. Delete late fee rules
    console.log('7️⃣  Deleting late fee rules...');
    const lateFeeRules = await client.query('DELETE FROM "LateFeeRule" RETURNING id');
    console.log(`   ✓ Deleted ${lateFeeRules.rowCount} late fee rules\n`);

    // 8. Delete discounts (optional)
    console.log('8️⃣  Deleting discounts...');
    const discounts = await client.query('DELETE FROM "Discount" RETURNING id');
    console.log(`   ✓ Deleted ${discounts.rowCount} discounts\n`);

    // 9. Delete scholarships (optional)
    console.log('9️⃣  Deleting scholarships...');
    const scholarships = await client.query('DELETE FROM "Scholarship" RETURNING id');
    console.log(`   ✓ Deleted ${scholarships.rowCount} scholarships\n`);

    // Commit the transaction
    await client.query('COMMIT');

    console.log('✅ All monthly payment data has been deleted successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Payment allocations: ${paymentAllocations.rowCount} deleted`);
    console.log(`   - Payments: ${payments.rowCount} deleted`);
    console.log(`   - Invoice items: ${invoiceItems.rowCount} deleted`);
    console.log(`   - Invoices: ${invoices.rowCount} deleted`);
    console.log(`   - Fee structure items: ${feeStructureItems.rowCount} deleted`);
    console.log(`   - Fee structures: ${feeStructures.rowCount} deleted`);
    console.log(`   - Late fee rules: ${lateFeeRules.rowCount} deleted`);
    console.log(`   - Discounts: ${discounts.rowCount} deleted`);
    console.log(`   - Scholarships: ${scholarships.rowCount} deleted`);
    console.log('\n💡 Note: Chart of accounts and academic years were NOT deleted.');
    console.log('   You can reuse them for new payment settings.\n');

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Error deleting monthly payment data:', error);
    console.error('\nDetails:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
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
  console.log('   node backend/scripts/delete-all-monthly-payment-data-sql.js --confirm\n');
  process.exit(0);
}

// Run the deletion
deleteAllMonthlyPaymentData();
