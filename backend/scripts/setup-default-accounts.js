const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupDefaultAccounts() {
  try {
    console.log('Setting up default accounts for monthly payments...\n');

    // Check if accounts already exist
    const existingAccounts = await prisma.account.findMany({
      where: {
        code: {
          in: ['4000', '2025-2026']
        }
      }
    });

    if (existingAccounts.length > 0) {
      console.log('✅ Default accounts already exist:');
      existingAccounts.forEach(acc => {
        console.log(`   - ${acc.code}: ${acc.name}`);
      });
      
      // Return the income account ID
      const incomeAccount = existingAccounts.find(acc => acc.code === '4000');
      if (incomeAccount) {
        console.log(`\n📝 Use this Account ID for fee structures: ${incomeAccount.id}`);
      }
      
      return;
    }

    // Create default income account for tuition fees
    const incomeAccount = await prisma.account.create({
      data: {
        code: '4000',
        name: 'Tuition Fee Income',
        type: 'INCOME',
        isActive: true,
        isLeaf: true,
        createdBy: '00000000-0000-0000-0000-000000000000' // System user
      }
    });

    console.log('✅ Created default income account:');
    console.log(`   ID: ${incomeAccount.id}`);
    console.log(`   Code: ${incomeAccount.code}`);
    console.log(`   Name: ${incomeAccount.name}`);
    console.log(`   Type: ${incomeAccount.type}\n`);

    // Create default academic year (if needed)
    console.log('📝 Note: You may also need to create academic years.');
    console.log('   For now, you can use "2025-2026" as academicYearId\n');

    console.log('✅ Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Use the Account ID above when creating fee structures');
    console.log('   2. Or update the MonthlyPaymentSettings component to fetch this automatically');

  } catch (error) {
    console.error('❌ Error setting up default accounts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupDefaultAccounts();
