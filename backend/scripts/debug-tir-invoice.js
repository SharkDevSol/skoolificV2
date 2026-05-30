const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTirInvoice() {
  try {
    console.log('🔍 Debugging Tir Month Invoice...\n');

    // Get all invoices for Tir month
    const tirInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { metadata: { path: ['month'], equals: 'Tir' } },
          { metadata: { path: ['monthNumber'], equals: 5 } }
        ]
      },
      include: {
        items: true
      }
    });

    console.log(`Found ${tirInvoices.length} Tir month invoices\n`);

    if (tirInvoices.length === 0) {
      console.log('❌ No Tir invoices found!');
      console.log('Checking all invoices...\n');
      
      const allInvoices = await prisma.invoice.findMany({
        take: 5,
        include: { items: true }
      });
      
      console.log('Sample invoices:');
      allInvoices.forEach(inv => {
        console.log(`- ${inv.invoiceNumber}: metadata =`, inv.metadata);
      });
      
      process.exit(0);
    }

    const today = new Date();

    // Get active late fee rules
    const lateFeeRules = await prisma.lateFeeRule.findMany({
      where: { isActive: true },
      orderBy: { gracePeriodDays: 'asc' }
    });

    console.log(`Active Late Fee Rules: ${lateFeeRules.length}`);
    lateFeeRules.forEach(rule => {
      console.log(`  - ${rule.name}: ${rule.value} Birr after ${rule.gracePeriodDays} days`);
    });
    console.log('');

    // Analyze each Tir invoice
    for (const invoice of tirInvoices) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Invoice: ${invoice.invoiceNumber}`);
      console.log(`Student ID: ${invoice.studentId}`);
      console.log(`Status: ${invoice.status}`);
      console.log(`Due Date: ${invoice.dueDate.toISOString().split('T')[0]}`);
      
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      console.log(`Days Past Due: ${daysPastDue}`);
      
      console.log(`\nCurrent Amounts:`);
      console.log(`  Total Amount: ${invoice.totalAmount} Birr`);
      console.log(`  Discount: ${invoice.discountAmount} Birr`);
      console.log(`  Late Fee: ${invoice.lateFeeAmount} Birr`);
      console.log(`  Net Amount: ${invoice.netAmount} Birr`);
      console.log(`  Paid Amount: ${invoice.paidAmount} Birr`);
      console.log(`  Balance: ${parseFloat(invoice.netAmount) - parseFloat(invoice.paidAmount)} Birr`);

      console.log(`\nInvoice Items:`);
      invoice.items.forEach(item => {
        console.log(`  - ${item.description}: ${item.amount} Birr`);
      });

      // Calculate what late fee SHOULD be
      if (daysPastDue > 0) {
        let totalLateFee = 0;
        let applicableRules = [];

        for (const rule of lateFeeRules) {
          if (daysPastDue > rule.gracePeriodDays) {
            let lateFeeAmount = 0;
            if (rule.type === 'FIXED_AMOUNT') {
              lateFeeAmount = parseFloat(rule.value);
            } else if (rule.type === 'PERCENTAGE') {
              lateFeeAmount = (parseFloat(invoice.totalAmount) * parseFloat(rule.value)) / 100;
            }
            totalLateFee += lateFeeAmount;
            applicableRules.push({ name: rule.name, amount: lateFeeAmount });
          }
        }

        console.log(`\nCalculated Late Fee:`);
        if (applicableRules.length > 0) {
          applicableRules.forEach(r => {
            console.log(`  - ${r.name}: +${r.amount} Birr`);
          });
          console.log(`  TOTAL: ${totalLateFee} Birr`);
        } else {
          console.log(`  Within grace period (no late fee yet)`);
        }

        if (totalLateFee > 0 && parseFloat(invoice.lateFeeAmount) !== totalLateFee) {
          console.log(`\n⚠️  MISMATCH DETECTED!`);
          console.log(`   Current late fee: ${invoice.lateFeeAmount} Birr`);
          console.log(`   Should be: ${totalLateFee} Birr`);
          console.log(`   Difference: ${totalLateFee - parseFloat(invoice.lateFeeAmount)} Birr`);
          
          console.log(`\n🔧 Fixing now...`);
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              lateFeeAmount: totalLateFee,
              netAmount: parseFloat(invoice.totalAmount) + totalLateFee - parseFloat(invoice.discountAmount),
              status: 'OVERDUE'
            }
          });
          console.log(`✅ Fixed! Late fee updated to ${totalLateFee} Birr`);
        } else if (totalLateFee > 0) {
          console.log(`\n✅ Late fee is correct (${totalLateFee} Birr)`);
        }
      } else {
        console.log(`\n📅 Not yet due (${Math.abs(daysPastDue)} days until due date)`);
      }
      
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Diagnostic complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugTirInvoice();
