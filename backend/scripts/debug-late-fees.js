const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugLateFees() {
  try {
    console.log('🔍 Debugging late fee application...\n');

    const today = new Date();
    console.log('📅 Today:', today.toLocaleDateString(), '\n');

    // Check late fee rules
    const lateFeeRules = await prisma.lateFeeRule.findMany({
      where: { isActive: true }
    });

    console.log('📋 Active Late Fee Rules:', lateFeeRules.length);
    lateFeeRules.forEach(rule => {
      console.log(`   - ${rule.name}: ${rule.value} Birr, ${rule.gracePeriodDays} days grace`);
    });
    console.log('');

    // Check overdue invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    console.log('📊 Unpaid Invoices:', invoices.length);
    console.log('');

    let overdueCount = 0;
    let withinGraceCount = 0;
    let alreadyHasLateFeeCount = 0;

    for (const invoice of invoices) {
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      const hasLateFee = parseFloat(invoice.lateFeeAmount) > 0;

      console.log(`Invoice: ${invoice.invoiceNumber}`);
      console.log(`  Due Date: ${dueDate.toLocaleDateString()}`);
      console.log(`  Days Past Due: ${daysPastDue}`);
      console.log(`  Current Late Fee: ${invoice.lateFeeAmount} Birr`);
      console.log(`  Status: ${invoice.status}`);

      if (daysPastDue <= 0) {
        console.log(`  ✓ Not yet due`);
      } else if (hasLateFee) {
        console.log(`  ⚠️  Already has late fee`);
        alreadyHasLateFeeCount++;
      } else if (lateFeeRules.length > 0 && daysPastDue > lateFeeRules[0].gracePeriodDays) {
        console.log(`  ❌ SHOULD GET LATE FEE (${daysPastDue} days > ${lateFeeRules[0].gracePeriodDays} grace)`);
        overdueCount++;
      } else if (lateFeeRules.length > 0) {
        console.log(`  ⏳ Within grace period (${daysPastDue} days <= ${lateFeeRules[0].gracePeriodDays} grace)`);
        withinGraceCount++;
      }

      console.log('');
    }

    console.log('📊 Summary:');
    console.log(`   - Should get late fee: ${overdueCount}`);
    console.log(`   - Within grace period: ${withinGraceCount}`);
    console.log(`   - Already has late fee: ${alreadyHasLateFeeCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLateFees();
