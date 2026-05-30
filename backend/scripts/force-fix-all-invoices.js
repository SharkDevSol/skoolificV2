const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceFixAllInvoices() {
  try {
    console.log('🔧 FORCE FIXING ALL INVOICES...\n');

    const today = new Date();

    // Get all active late fee rules
    const lateFeeRules = await prisma.lateFeeRule.findMany({
      where: { isActive: true },
      orderBy: { gracePeriodDays: 'asc' }
    });

    if (lateFeeRules.length === 0) {
      console.log('❌ No active late fee rules found!');
      console.log('Please create late fee rules in Payment Settings first.');
      process.exit(1);
    }

    console.log(`✓ Found ${lateFeeRules.length} active late fee rules:`);
    lateFeeRules.forEach(rule => {
      console.log(`  - ${rule.name}: ${rule.value} Birr after ${rule.gracePeriodDays} days`);
    });
    console.log('');

    // Get ALL unpaid invoices
    const allInvoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    console.log(`✓ Found ${allInvoices.length} unpaid invoices\n`);
    console.log('Processing each invoice...\n');

    let fixedCount = 0;
    let skippedCount = 0;
    let notDueCount = 0;
    let gracePeriodCount = 0;

    for (const invoice of allInvoices) {
      const metadata = invoice.metadata || {};
      const month = metadata.month || 'Unknown';
      const monthNumber = metadata.monthNumber || '?';
      
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      console.log(`${month} (M${monthNumber}) - ${invoice.invoiceNumber}`);
      console.log(`  Days past due: ${daysPastDue}`);

      if (daysPastDue < 0) {
        console.log(`  ⏭️  Not yet due (${Math.abs(daysPastDue)} days until due)\n`);
        notDueCount++;
        continue;
      }

      // Calculate total late fee from ALL applicable rules
      // NOTE: Due date already includes grace period, so apply late fees immediately after due date
      let totalLateFee = 0;
      let applicableRules = [];

      for (const rule of lateFeeRules) {
        // Apply late fee immediately after due date (no additional grace period check)
        let lateFeeAmount = 0;
        if (rule.type === 'FIXED_AMOUNT') {
          lateFeeAmount = parseFloat(rule.value);
        } else if (rule.type === 'PERCENTAGE') {
          lateFeeAmount = (parseFloat(invoice.totalAmount) * parseFloat(rule.value)) / 100;
        }
        totalLateFee += lateFeeAmount;
        applicableRules.push({ name: rule.name, amount: lateFeeAmount });
      }

      if (totalLateFee === 0) {
        console.log(`  ⏳ Within grace period (no late fee yet)\n`);
        gracePeriodCount++;
        continue;
      }

      const currentLateFee = parseFloat(invoice.lateFeeAmount);
      console.log(`  Current late fee: ${currentLateFee} Birr`);
      console.log(`  Should be: ${totalLateFee} Birr`);
      
      if (applicableRules.length > 0) {
        applicableRules.forEach(r => {
          console.log(`    - ${r.name}: +${r.amount} Birr`);
        });
      }

      if (currentLateFee === totalLateFee) {
        console.log(`  ✅ Already correct\n`);
        skippedCount++;
        continue;
      }

      // FORCE UPDATE - Always update regardless of current value
      const newNetAmount = parseFloat(invoice.totalAmount) + totalLateFee - parseFloat(invoice.discountAmount);
      
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          lateFeeAmount: totalLateFee,
          netAmount: newNetAmount,
          status: 'OVERDUE'
        }
      });

      console.log(`  🔧 FIXED! Updated from ${currentLateFee} to ${totalLateFee} Birr`);
      console.log(`  New balance: ${newNetAmount - parseFloat(invoice.paidAmount)} Birr\n`);
      fixedCount++;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ Fixed: ${fixedCount} invoices`);
    console.log(`⏭️  Already correct: ${skippedCount} invoices`);
    console.log(`⏳ Within grace period: ${gracePeriodCount} invoices`);
    console.log(`📅 Not yet due: ${notDueCount} invoices`);
    console.log(`📋 Total processed: ${allInvoices.length} invoices`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (fixedCount > 0) {
      console.log('✅ SUCCESS! All invoices have been updated.');
      console.log('\n🔄 Please refresh your browser to see the changes.');
      console.log('   Go to: Finance → Monthly Payments → Select Class → Select Student');
    } else {
      console.log('ℹ️  No invoices needed fixing. All late fees are already correct.');
    }

    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

forceFixAllInvoices();
