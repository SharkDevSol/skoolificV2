const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showAllInvoices() {
  try {
    console.log('📋 Showing ALL Invoices...\n');

    const today = new Date();

    // Get all invoices
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

    console.log(`Total unpaid invoices: ${allInvoices.length}\n`);

    // Get late fee rules
    const lateFeeRules = await prisma.lateFeeRule.findMany({
      where: { isActive: true },
      orderBy: { gracePeriodDays: 'asc' }
    });

    console.log(`Active Late Fee Rules: ${lateFeeRules.length}`);
    lateFeeRules.forEach(rule => {
      console.log(`  - ${rule.name}: ${rule.value} Birr after ${rule.gracePeriodDays} days`);
    });
    console.log('\n');

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('INVOICE DETAILS');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    allInvoices.forEach((invoice, index) => {
      const metadata = invoice.metadata || {};
      const month = metadata.month || 'Unknown';
      const monthNumber = metadata.monthNumber || '?';
      
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      // Calculate what late fee SHOULD be
      let shouldBeLateFee = 0;
      let applicableRules = [];
      
      if (daysPastDue > 0) {
        for (const rule of lateFeeRules) {
          if (daysPastDue > rule.gracePeriodDays) {
            let amount = 0;
            if (rule.type === 'FIXED_AMOUNT') {
              amount = parseFloat(rule.value);
            } else if (rule.type === 'PERCENTAGE') {
              amount = (parseFloat(invoice.totalAmount) * parseFloat(rule.value)) / 100;
            }
            shouldBeLateFee += amount;
            applicableRules.push({ name: rule.name, amount });
          }
        }
      }

      const currentLateFee = parseFloat(invoice.lateFeeAmount);
      const balance = parseFloat(invoice.netAmount) - parseFloat(invoice.paidAmount);
      const isMismatch = shouldBeLateFee > 0 && currentLateFee !== shouldBeLateFee;

      console.log(`${index + 1}. ${month} (Month ${monthNumber})`);
      console.log(`   Invoice: ${invoice.invoiceNumber}`);
      console.log(`   Due Date: ${dueDate.toISOString().split('T')[0]} (${daysPastDue} days ${daysPastDue >= 0 ? 'overdue' : 'until due'})`);
      console.log(`   Total Amount: ${invoice.totalAmount} Birr`);
      console.log(`   Current Late Fee: ${currentLateFee} Birr`);
      console.log(`   Should Be Late Fee: ${shouldBeLateFee} Birr`);
      
      if (applicableRules.length > 0) {
        console.log(`   Applicable Rules:`);
        applicableRules.forEach(r => {
          console.log(`     - ${r.name}: +${r.amount} Birr`);
        });
      }
      
      console.log(`   Net Amount: ${invoice.netAmount} Birr`);
      console.log(`   Balance: ${balance} Birr`);
      console.log(`   Status: ${invoice.status}`);
      
      if (isMismatch) {
        console.log(`   ⚠️  MISMATCH! Should be ${shouldBeLateFee} but is ${currentLateFee}`);
      } else if (shouldBeLateFee > 0 && currentLateFee === shouldBeLateFee) {
        console.log(`   ✅ Late fee is correct`);
      } else if (daysPastDue > 0 && shouldBeLateFee === 0) {
        console.log(`   ⏳ Within grace period`);
      } else if (daysPastDue < 0) {
        console.log(`   📅 Not yet due`);
      }
      
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // Find Tir specifically
    const tirInvoices = allInvoices.filter(inv => {
      const metadata = inv.metadata || {};
      return metadata.month === 'Tir' || metadata.monthNumber === 5 || inv.invoiceNumber.includes('-M5');
    });

    if (tirInvoices.length > 0) {
      console.log('🎯 TIR MONTH INVOICES FOUND:\n');
      tirInvoices.forEach(inv => {
        const metadata = inv.metadata || {};
        const dueDate = new Date(inv.dueDate);
        const daysPastDue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        
        console.log(`Invoice: ${inv.invoiceNumber}`);
        console.log(`  Student: ${inv.studentId}`);
        console.log(`  Due Date: ${dueDate.toISOString().split('T')[0]}`);
        console.log(`  Days Past Due: ${daysPastDue}`);
        console.log(`  Current Late Fee: ${inv.lateFeeAmount} Birr`);
        console.log(`  Balance: ${parseFloat(inv.netAmount) - parseFloat(inv.paidAmount)} Birr`);
        console.log(`  Status: ${inv.status}`);
        console.log('');
      });
    } else {
      console.log('❌ NO TIR MONTH INVOICES FOUND!\n');
      console.log('Checking invoice numbers for M5 pattern...\n');
      const m5Invoices = allInvoices.filter(inv => inv.invoiceNumber.includes('M5'));
      if (m5Invoices.length > 0) {
        console.log(`Found ${m5Invoices.length} invoices with M5 in number:`);
        m5Invoices.forEach(inv => {
          console.log(`  - ${inv.invoiceNumber}: metadata =`, inv.metadata);
        });
      }
    }

    console.log('\n✅ Done!');
    console.log('\nPlease copy this output and share it.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

showAllInvoices();
