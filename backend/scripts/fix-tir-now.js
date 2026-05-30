const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTirInvoice() {
  try {
    console.log('🔧 Fixing Tir Month Invoice...\n');

    const today = new Date();

    // Get active late fee rules
    const lateFeeRules = await prisma.lateFeeRule.findMany({
      where: { isActive: true },
      orderBy: { gracePeriodDays: 'asc' }
    });

    if (lateFeeRules.length === 0) {
      console.log('❌ No active late fee rules found!');
      console.log('Please create late fee rules first.');
      process.exit(1);
    }

    console.log(`✓ Found ${lateFeeRules.length} active late fee rules\n`);

    // Get ALL invoices and find Tir
    const allInvoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']
        }
      }
    });

    console.log(`✓ Found ${allInvoices.length} total invoices\n`);

    // Find Tir invoices by checking metadata
    const tirInvoices = allInvoices.filter(inv => {
      const metadata = inv.metadata || {};
      return metadata.month === 'Tir' || metadata.monthNumber === 5;
    });

    console.log(`✓ Found ${tirInvoices.length} Tir invoices\n`);

    if (tirInvoices.length === 0) {
      console.log('❌ No Tir invoices found!');
      console.log('\nSearching for month 5 in all invoices...');
      
      // Try to find by invoice number pattern
      const possibleTir = allInvoices.filter(inv => 
        inv.invoiceNumber.includes('-M5') || 
        inv.invoiceNumber.includes('-M05')
      );
      
      if (possibleTir.length > 0) {
        console.log(`Found ${possibleTir.length} invoices with M5 in number:`);
        possibleTir.forEach(inv => {
          console.log(`  - ${inv.invoiceNumber}`);
        });
        console.log('\nTrying to fix these...\n');
        tirInvoices.push(...possibleTir);
      } else {
        console.log('Could not find Tir invoices by any method.');
        process.exit(1);
      }
    }

    let fixedCount = 0;

    for (const invoice of tirInvoices) {
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      console.log(`Invoice: ${invoice.invoiceNumber}`);
      console.log(`  Days past due: ${daysPastDue}`);
      console.log(`  Current late fee: ${invoice.lateFeeAmount} Birr`);

      if (daysPastDue <= 0) {
        console.log(`  ⏭️  Not yet due\n`);
        continue;
      }

      // Calculate total late fee
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

      if (totalLateFee === 0) {
        console.log(`  ⏳ Within grace period\n`);
        continue;
      }

      console.log(`  Should be: ${totalLateFee} Birr`);
      applicableRules.forEach(r => {
        console.log(`    - ${r.name}: +${r.amount} Birr`);
      });

      // Update the invoice
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          lateFeeAmount: totalLateFee,
          netAmount: parseFloat(invoice.totalAmount) + totalLateFee - parseFloat(invoice.discountAmount),
          status: 'OVERDUE'
        }
      });

      console.log(`  ✅ FIXED! Updated to ${totalLateFee} Birr\n`);
      fixedCount++;
    }

    console.log(`\n✅ Done! Fixed ${fixedCount} Tir invoices`);
    console.log('\nPlease refresh the Monthly Payments page to see the changes.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

fixTirInvoice();
