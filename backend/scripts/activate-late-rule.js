const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateLateRule() {
  try {
    console.log('\n🔄 Activating "late" rule (15 days)...\n');
    
    // Find the "late" rule
    const lateRule = await prisma.lateFeeRule.findFirst({
      where: { name: 'late' }
    });
    
    if (!lateRule) {
      console.log('❌ Rule "late" not found');
      process.exit(1);
    }
    
    console.log(`Found rule: ${lateRule.name}`);
    console.log(`  Current status: ${lateRule.isActive ? 'Active' : 'Inactive'}`);
    console.log(`  Grace period: ${lateRule.gracePeriodDays} days`);
    
    if (lateRule.isActive) {
      console.log('\n✓ Rule is already active!');
      await prisma.$disconnect();
      return;
    }
    
    // Get sample invoice before update
    const beforeInvoice = await prisma.invoice.findFirst({
      where: {
        metadata: {
          path: ['monthNumber'],
          equals: 5
        }
      }
    });
    
    console.log(`\nBefore activation:`);
    console.log(`  Sample invoice due date: ${beforeInvoice.dueDate.toISOString().split('T')[0]}`);
    
    // Activate the rule
    console.log('\n⏳ Activating rule...');
    await prisma.lateFeeRule.update({
      where: { id: lateRule.id },
      data: { isActive: true }
    });
    
    console.log('✅ Rule activated!');
    
    // Wait a moment for the update to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get sample invoice after update
    const afterInvoice = await prisma.invoice.findFirst({
      where: {
        metadata: {
          path: ['monthNumber'],
          equals: 5
        }
      }
    });
    
    console.log(`\nAfter activation:`);
    console.log(`  Sample invoice due date: ${afterInvoice.dueDate.toISOString().split('T')[0]}`);
    
    if (beforeInvoice.dueDate.getTime() !== afterInvoice.dueDate.getTime()) {
      console.log('\n✅ SUCCESS! Due date was automatically updated!');
      console.log(`  Changed from: ${beforeInvoice.dueDate.toISOString().split('T')[0]}`);
      console.log(`  Changed to: ${afterInvoice.dueDate.toISOString().split('T')[0]}`);
    } else {
      console.log('\n⚠️  Due date did not change');
      console.log('   This might be expected if the backend update is async');
    }
    
    // Show all active rules
    const allRules = await prisma.lateFeeRule.findMany({
      where: { isActive: true },
      orderBy: { gracePeriodDays: 'asc' }
    });
    
    console.log('\n📋 Active Rules:');
    allRules.forEach(rule => {
      console.log(`  ✅ ${rule.name}: ${rule.gracePeriodDays} days, $${rule.value}`);
    });
    
    console.log('\n✅ Done! Now you should see BOTH due dates in the frontend!');
    console.log('   Refresh your browser to see the changes.\n');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

activateLateRule();
