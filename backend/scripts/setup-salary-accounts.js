const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupSalaryAccounts() {
  try {
    console.log('Setting up salary-related accounts...\n');

    // Check if accounts already exist
    const existingSalary = await prisma.account.findFirst({
      where: { code: '5100' }
    });

    if (existingSalary) {
      console.log('✅ Salary accounts already exist!');
      console.log('   Salary Expense:', existingSalary.id);
      return;
    }

    // Create Salary Expense account
    const salaryAccount = await prisma.account.create({
      data: {
        code: '5100',
        name: 'Salary Expense',
        type: 'EXPENSE',
        isActive: true,
        isLeaf: true,
        createdBy: '00000000-0000-0000-0000-000000000001'
      }
    });

    console.log('✅ Created Salary Expense account:');
    console.log('   ID:', salaryAccount.id);
    console.log('   Code:', salaryAccount.code);
    console.log('   Name:', salaryAccount.name);
    console.log('   Type:', salaryAccount.type);
    console.log();

    // Create Tax Payable account
    const taxAccount = await prisma.account.create({
      data: {
        code: '2100',
        name: 'Tax Payable',
        type: 'LIABILITY',
        isActive: true,
        isLeaf: true,
        createdBy: '00000000-0000-0000-0000-000000000001'
      }
    });

    console.log('✅ Created Tax Payable account:');
    console.log('   ID:', taxAccount.id);
    console.log('   Code:', taxAccount.code);
    console.log('   Name:', taxAccount.name);
    console.log('   Type:', taxAccount.type);
    console.log();

    // Create Pension Payable account
    const pensionAccount = await prisma.account.create({
      data: {
        code: '2110',
        name: 'Pension Payable',
        type: 'LIABILITY',
        isActive: true,
        isLeaf: true,
        createdBy: '00000000-0000-0000-0000-000000000001'
      }
    });

    console.log('✅ Created Pension Payable account:');
    console.log('   ID:', pensionAccount.id);
    console.log('   Code:', pensionAccount.code);
    console.log('   Name:', pensionAccount.name);
    console.log('   Type:', pensionAccount.type);
    console.log();

    console.log('✅ Setup complete!');
    console.log('\n📋 You can now use these accounts in the Salary Management system.');

  } catch (error) {
    console.error('Error setting up accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupSalaryAccounts();
