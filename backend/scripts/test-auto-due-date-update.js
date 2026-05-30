const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAutoDueDateUpdate() {
  try {
    console.log('\n🧪 Testing Automatic Due Date Update\n');
    
    // Get current late fee rules
    const rules = await prisma.lateFeeRule.findMany({
      orderBy: { gracePeriodDays: 'asc' }
    });
    
    console.log('📋 Current Late Fee Rules:');
    rules.forEach(rule => {
      console.log(`  ${rule.isActive ? '✅' : '❌'} ${rule.name}: ${rule.gracePeriodDays} days, $${rule.value}`);
    });
    
    // Get a sample invoice to check current due date
    const sampleInvoice = await prisma.invoice.findFirst({
      where: {
        metadata: {
          path: ['monthNumber'],
          equals: 5 // Tir month
        }
      }
    });
    
    if (sampleInvoice) {
      console.log('\n📄 Sample Invoice (Tir Month):');
      console.log(`  Invoice: ${sampleInvoice.invoiceNumber}`);
      console.log(`  Current Due Date: ${sampleInvoice.dueDate.toISOString().split('T')[0]}`);
      console.log(`  Month Number: ${sampleInvoice.metadata.monthNumber}`);
    }
    
    // Find the active rules
    const activeRules = rules.filter(r => r.isActive);
    if (activeRules.length > 0) {
      const shortestGracePeriod = Math.min(...activeRules.map(r => r.gracePeriodDays));
      console.log(`\n✓ Shortest active grace period: ${shortestGracePeriod} days`);
      
      // Calculate expected due date for Tir (month 5)
      const ethiopianNewYear = new Date(2025, 8, 11);
      const monthNumber = 5;
      const daysFromNewYear = (monthNumber - 1) * 30;
      const monthStartDate = new Date(ethiopianNewYear);
      monthStartDate.setDate(monthStartDate.getDate() + daysFromNewYear);
      
      const expectedDueDate = new Date(monthStartDate);
      expectedDueDate.setDate(expectedDueDate.getDate() + shortestGracePeriod);
      
      console.log(`✓ Expected due date for Tir: ${expectedDueDate.toISOString().split('T')[0]}`);
      
      if (sampleInvoice) {
        const currentDueDate = sampleInvoice.dueDate.toISOString().split('T')[0];
        const expectedDueDateStr = expectedDueDate.toISOString().split('T')[0];
        
        if (currentDueDate === expectedDueDateStr) {
          console.log('\n✅ Due date is CORRECT!');
        } else {
          console.log('\n❌ Due date is INCORRECT!');
          console.log(`   Current: ${currentDueDate}`);
          console.log(`   Expected: ${expectedDueDateStr}`);
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  Total Rules: ${rules.length}`);
    console.log(`  Active Rules: ${activeRules.length}`);
    console.log(`  Inactive Rules: ${rules.length - activeRules.length}`);
    
    if (activeRules.length === 2) {
      console.log('\n✅ You have 2 active rules - frontend should show BOTH due dates!');
      activeRules.forEach((rule, idx) => {
        const ethiopianNewYear = new Date(2025, 8, 11);
        const monthNumber = 5;
        const daysFromNewYear = (monthNumber - 1) * 30;
        const monthStartDate = new Date(ethiopianNewYear);
        monthStartDate.setDate(monthStartDate.getDate() + daysFromNewYear);
        
        const dueDate = new Date(monthStartDate);
        dueDate.setDate(dueDate.getDate() + rule.gracePeriodDays);
        
        console.log(`  ${idx + 1}. ${rule.name} (${rule.gracePeriodDays} days): ${dueDate.toISOString().split('T')[0]}`);
      });
    }
    
    console.log('');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAutoDueDateUpdate();
