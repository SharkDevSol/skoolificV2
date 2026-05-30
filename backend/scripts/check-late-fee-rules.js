const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLateFeeRules() {
  try {
    const rules = await prisma.lateFeeRule.findMany({
      orderBy: { gracePeriodDays: 'asc' }
    });

    console.log('\n📋 Late Fee Rules:\n');
    rules.forEach(rule => {
      console.log(`  ${rule.isActive ? '✅' : '❌'} ${rule.name}`);
      console.log(`     Grace Period: ${rule.gracePeriodDays} days`);
      console.log(`     Penalty: $${rule.value}`);
      console.log(`     Type: ${rule.type}`);
      console.log('');
    });

    console.log(`Total Rules: ${rules.length}`);
    console.log(`Active Rules: ${rules.filter(r => r.isActive).length}\n`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLateFeeRules();
