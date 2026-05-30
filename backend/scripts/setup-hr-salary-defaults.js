const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupHRSalaryDefaults() {
  try {
    console.log('🚀 Setting up HR Salary Management defaults...\n');

    // 1. Create default account for salary
    console.log('📊 Creating salary account...');
    let salaryAccount = await prisma.account.upsert({
      where: { code: '5100' },
      update: {},
      create: {
        code: '5100',
        name: 'Staff Salaries',
        type: 'EXPENSE'
      }
    });
    console.log('✅ Salary account created: 5100 - Staff Salaries\n');

    // 2. Create deduction types
    console.log('➖ Creating deduction types...');
    const deductions = [
      { name: 'Tax', description: 'Income Tax Deduction', defaultValue: 15 },
      { name: 'Pension', description: 'Pension Fund Contribution', defaultValue: 7 },
      { name: 'Service', description: 'Service Charge', defaultValue: 2 },
      { name: 'Credit', description: 'Loan/Credit Deduction', defaultValue: 0 }
    ];

    for (const d of deductions) {
      await prisma.deductionType.upsert({
        where: { name: d.name },
        update: {},
        create: {
          ...d,
          calculationType: 'PERCENTAGE',
          accountId: salaryAccount.id
        }
      });
      console.log(`  ✅ ${d.name} (${d.defaultValue}%)`);
    }
    console.log('');

    // 3. Create allowance types
    console.log('➕ Creating allowance types...');
    const allowances = [
      { name: 'Housing Allowance', description: 'Housing/Accommodation Allowance', defaultValue: 500 },
      { name: 'Transport Allowance', description: 'Transportation Allowance', defaultValue: 200 },
      { name: 'Medical Allowance', description: 'Medical/Health Allowance', defaultValue: 150 },
      { name: 'Food Allowance', description: 'Meal/Food Allowance', defaultValue: 100 }
    ];

    for (const a of allowances) {
      await prisma.allowanceType.upsert({
        where: { name: a.name },
        update: {},
        create: {
          ...a,
          calculationType: 'FIXED',
          accountId: salaryAccount.id
        }
      });
      console.log(`  ✅ ${a.name} ($${a.defaultValue})`);
    }
    console.log('');

    // 4. Create retention benefit types
    console.log('🎁 Creating retention benefit types...');
    
    await prisma.retentionBenefitType.upsert({
      where: { name: 'Tuition Waiver' },
      update: {},
      create: {
        name: 'Tuition Waiver',
        type: 'TUITION_WAIVER',
        description: 'Tuition fee waiver for staff children',
        calculationType: 'FIXED',
        defaultValue: 1000,
        accountId: salaryAccount.id
      }
    });
    console.log('  ✅ Tuition Waiver ($1000)');

    await prisma.retentionBenefitType.upsert({
      where: { name: 'Merit Pay' },
      update: {},
      create: {
        name: 'Merit Pay',
        type: 'MERIT_PAY',
        description: 'Performance-based merit pay',
        calculationType: 'PERCENTAGE',
        defaultValue: 10,
        accountId: salaryAccount.id
      }
    });
    console.log('  ✅ Merit Pay (10%)');
    console.log('');

    // 5. Create sample staff (optional)
    console.log('👥 Creating sample staff members...');
    const sampleStaff = [
      {
        employeeNumber: 'TCH001',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@school.com',
        phone: '1234567890',
        staffType: 'TEACHER',
        dateOfBirth: new Date('1985-05-15'),
        gender: 'MALE',
        hireDate: new Date('2020-01-01'),
        contractType: 'PERMANENT',
        address: '123 Main St, City'
      },
      {
        employeeNumber: 'SUP001',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@school.com',
        phone: '0987654321',
        staffType: 'SUPPORTIVE',
        dateOfBirth: new Date('1990-08-20'),
        gender: 'FEMALE',
        hireDate: new Date('2021-03-15'),
        contractType: 'PERMANENT',
        address: '456 Oak Ave, City'
      },
      {
        employeeNumber: 'ADM001',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@school.com',
        phone: '5555555555',
        staffType: 'ADMINISTRATIVE',
        dateOfBirth: new Date('1982-12-10'),
        gender: 'MALE',
        hireDate: new Date('2019-06-01'),
        contractType: 'PERMANENT',
        address: '789 Pine Rd, City'
      }
    ];

    for (const staff of sampleStaff) {
      try {
        await prisma.staff.upsert({
          where: { employeeNumber: staff.employeeNumber },
          update: {},
          create: staff
        });
        console.log(`  ✅ ${staff.firstName} ${staff.lastName} (${staff.staffType})`);
      } catch (err) {
        console.log(`  ⚠️  ${staff.firstName} ${staff.lastName} - Already exists or error`);
      }
    }
    console.log('');

    console.log('🎉 HR Salary Management setup complete!\n');
    console.log('📋 Summary:');
    console.log('  ✅ 1 Salary Account');
    console.log('  ✅ 4 Deduction Types (Tax, Pension, Service, Credit)');
    console.log('  ✅ 4 Allowance Types (Housing, Transport, Medical, Food)');
    console.log('  ✅ 2 Retention Benefit Types (Tuition Waiver, Merit Pay)');
    console.log('  ✅ 3 Sample Staff Members\n');
    console.log('🚀 You can now start using the HR Salary Management system!');
    console.log('📍 Navigate to: /hr/salary\n');

  } catch (error) {
    console.error('❌ Error setting up HR Salary defaults:', error);
    console.error('\n💡 Make sure you have:');
    console.error('  1. Run the Prisma migration');
    console.error('  2. PostgreSQL is running');
    console.error('  3. DATABASE_URL is correct in .env\n');
  } finally {
    await prisma.$disconnect();
  }
}

setupHRSalaryDefaults();
