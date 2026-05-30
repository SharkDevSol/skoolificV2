const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvoices() {
  try {
    console.log('Checking invoices in database...\n');

    // Count total invoices
    const totalCount = await prisma.invoice.count();
    console.log(`Total invoices: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('❌ No invoices found in database');
      console.log('\nPossible reasons:');
      console.log('1. Invoices were not generated yet');
      console.log('2. Invoice generation failed');
      console.log('3. Database connection issue\n');
      return;
    }

    // Get recent invoices
    const recentInvoices = await prisma.invoice.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true
      }
    });

    console.log('Recent invoices:');
    console.log('================\n');

    recentInvoices.forEach((inv, index) => {
      console.log(`${index + 1}. Invoice #${inv.invoiceNumber}`);
      console.log(`   Student ID: ${inv.studentId}`);
      console.log(`   Amount: $${inv.netAmount}`);
      console.log(`   Status: ${inv.status}`);
      console.log(`   Issue Date: ${inv.issueDate}`);
      console.log(`   Due Date: ${inv.dueDate}`);
      console.log(`   Items: ${inv.items.length}`);
      console.log('');
    });

    // Group by month
    const byMonth = {};
    recentInvoices.forEach(inv => {
      const date = new Date(inv.issueDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });

    console.log('Invoices by month:');
    console.log('==================');
    Object.entries(byMonth).forEach(([month, count]) => {
      console.log(`${month}: ${count} invoices`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoices();
