/**
 * Setup Default Late Fee Rule
 * Creates a late fee rule: $100 penalty after 10 days grace period
 * 
 * Usage: node backend/scripts/setup-late-fee-rule.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupLateFeeRule() {
  console.log('\n' + '='.repeat(60));
  console.log('⚙️  SETTING UP DEFAULT LATE FEE RULE');
  console.log('='.repeat(60) + '\n');

  try {
    // Check if rule already exists
    const existingRule = await prisma.lateFeeRule.findFirst({
      where: {
        name: 'Standard Late Fee - 10 Days'
      }
    });

    if (existingRule) {
      console.log('✅ Late fee rule already exists:');
      console.log(`   Name: ${existingRule.name}`);
      console.log(`   Grace Period: ${existingRule.gracePeriodDays} days`);
      console.log(`   Penalty: $${existingRule.value}`);
      console.log(`   Status: ${existingRule.isActive ? 'Active' : 'Inactive'}\n`);
      
      // Update if inactive
      if (!existingRule.isActive) {
        await prisma.lateFeeRule.update({
          where: { id: existingRule.id },
          data: { isActive: true }
        });
        console.log('✅ Activated existing late fee rule\n');
      }
      
      return;
    }

    // Create new late fee rule
    const lateFeeRule = await prisma.lateFeeRule.create({
      data: {
        name: 'Standard Late Fee - 10 Days',
        type: 'FIXED_AMOUNT',
        value: 100,
        gracePeriodDays: 10,
        applicableFeeCategories: ['TUITION', 'ARREARS'],
        isActive: true,
        campusId: '00000000-0000-0000-0000-000000000001',
        createdBy: '00000000-0000-0000-0000-000000000001'
      }
    });

    console.log('✅ Late fee rule created successfully!\n');
    console.log('📋 Rule Details:');
    console.log(`   Name: ${lateFeeRule.name}`);
    console.log(`   Type: Fixed Amount`);
    console.log(`   Penalty: $${lateFeeRule.value}`);
    console.log(`   Grace Period: ${lateFeeRule.gracePeriodDays} days`);
    console.log(`   Applies to: ${lateFeeRule.applicableFeeCategories.join(', ')}`);
    console.log(`   Status: Active\n`);

    console.log('📝 How it works:');
    console.log('   - Invoice due date: e.g., February 28');
    console.log('   - Grace period: March 1-10 (no penalty)');
    console.log('   - After March 10: $100 penalty added automatically');
    console.log('   - Example: $1300 invoice becomes $1400\n');

    console.log('✅ Setup complete!\n');

  } catch (error) {
    console.error('❌ Error setting up late fee rule:', error);
    throw error;
  }
}

async function main() {
  await setupLateFeeRule();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
