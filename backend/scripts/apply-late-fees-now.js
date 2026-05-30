const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Manually apply late fees to all overdue invoices
 * This applies ALL applicable late fee rules cumulatively
 */
async function applyLateFees() {
  try {
    console.log('🔍 Checking for overdue invoices...\n');
    
    const today = new Date();
    
    // Get all active late fee rules
    const lateFeeRules = await prisma.lateFeeRule.findMany({
      where: { isActive: true },
      orderBy: { gracePeriodDays: 'asc' }
    });

    if (lateFeeRules.length === 0) {
      console.log('❌ No active late fee rules found');
      process.exit(0);
    }

    console.log(`✓ Found ${lateFeeRules.length} active late fee rules:`);
    lateFeeRules.forEach(rule => {
      console.log(`  - ${rule.name}: ${rule.value} ${rule.type === 'PERCENTAGE' ? '%' : 'Birr'} after ${rule.gracePeriodDays} days`);
    });
    console.log('');

    // Get all unpaid/partially paid invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    console.log(`✓ Found ${invoices.length} unpaid/partially paid invoices\n`);

    let appliedCount = 0;
    let updatedCount = 0;
    let withinGracePeriod = 0;
    let notYetDue = 0;

    for (const invoice of invoices) {
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      if (daysPastDue <= 0) {
        notYetDue++;
        continue;
      }

      // Calculate total late fee from ALL applicable rules
      let totalLateFee = 0;
      let appliedRules = [];

      for (const rule of lateFeeRules) {
        if (daysPastDue > rule.gracePeriodDays) {
          let lateFeeAmount = 0;
          if (rule.type === 'FIXED_AMOUNT') {
            lateFeeAmount = parseFloat(rule.value);
          } else if (rule.type === 'PERCENTAGE') {
            lateFeeAmount = (parseFloat(invoice.totalAmount) * parseFloat(rule.value)) / 100;
          }

          totalLateFee += lateFeeAmount;
          appliedRules.push({ name: rule.name, amount: lateFeeAmount });
        }
      }

      if (totalLateFee === 0) {
        withinGracePeriod++;
        continue;
      }

      // Check if update needed
      const currentLateFee = parseFloat(invoice.lateFeeAmount);
      if (currentLateFee === totalLateFee) {
        // Already correct
        continue;
      }

      // Apply or update late fee
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          lateFeeAmount: totalLateFee,
          netAmount: parseFloat(invoice.totalAmount) + totalLateFee - parseFloat(invoice.discountAmount),
          status: 'OVERDUE'
        }
      });

      if (currentLateFee > 0) {
        console.log(`🔄 Updated: ${invoice.invoiceNumber} - ${daysPastDue} days overdue`);
        console.log(`   Old late fee: ${currentLateFee} Birr → New late fee: ${totalLateFee} Birr`);
        updatedCount++;
      } else {
        console.log(`✓ Applied: ${invoice.invoiceNumber} - ${daysPastDue} days overdue`);
        console.log(`   Late fee: ${totalLateFee} Birr`);
        appliedCount++;
      }
      
      if (appliedRules.length > 0) {
        console.log(`   Rules: ${appliedRules.map(r => `${r.name} (+${r.amount} Birr)`).join(', ')}`);
      }
      console.log('');
    }

    console.log('\n📊 Summary:');
    console.log(`   ✓ Applied late fees: ${appliedCount} invoices`);
    console.log(`   🔄 Updated late fees: ${updatedCount} invoices`);
    console.log(`   ⏳ Within grace period: ${withinGracePeriod} invoices`);
    console.log(`   📅 Not yet due: ${notYetDue} invoices`);
    console.log(`   📋 Total processed: ${invoices.length} invoices`);
    console.log('\n✅ Done!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

applyLateFees();
