const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Chart of Accounts Templates
 * Standard accounting structure for educational institutions
 */
const chartOfAccountsTemplate = [
  // ASSETS
  {
    code: '1000',
    name: 'Assets',
    type: 'ASSET',
    isLeaf: false,
    children: [
      {
        code: '1100',
        name: 'Current Assets',
        type: 'ASSET',
        isLeaf: false,
        children: [
          { code: '1110', name: 'Cash on Hand', type: 'ASSET', isLeaf: true },
          { code: '1120', name: 'Bank Account - Operating', type: 'ASSET', isLeaf: true },
          { code: '1130', name: 'Bank Account - Savings', type: 'ASSET', isLeaf: true },
          { code: '1140', name: 'Accounts Receivable - Students', type: 'ASSET', isLeaf: true },
          { code: '1150', name: 'Prepaid Expenses', type: 'ASSET', isLeaf: true },
        ],
      },
      {
        code: '1200',
        name: 'Fixed Assets',
        type: 'ASSET',
        isLeaf: false,
        children: [
          { code: '1210', name: 'Land and Buildings', type: 'ASSET', isLeaf: true },
          { code: '1220', name: 'Furniture and Fixtures', type: 'ASSET', isLeaf: true },
          { code: '1230', name: 'Equipment and Machinery', type: 'ASSET', isLeaf: true },
          { code: '1240', name: 'Vehicles', type: 'ASSET', isLeaf: true },
          { code: '1250', name: 'Accumulated Depreciation', type: 'ASSET', isLeaf: true },
        ],
      },
    ],
  },

  // LIABILITIES
  {
    code: '2000',
    name: 'Liabilities',
    type: 'LIABILITY',
    isLeaf: false,
    children: [
      {
        code: '2100',
        name: 'Current Liabilities',
        type: 'LIABILITY',
        isLeaf: false,
        children: [
          { code: '2110', name: 'Accounts Payable', type: 'LIABILITY', isLeaf: true },
          { code: '2120', name: 'Salaries Payable', type: 'LIABILITY', isLeaf: true },
          { code: '2130', name: 'Taxes Payable', type: 'LIABILITY', isLeaf: true },
          { code: '2140', name: 'Advance Fee Payments', type: 'LIABILITY', isLeaf: true },
          { code: '2150', name: 'Student Credit Balances', type: 'LIABILITY', isLeaf: true },
        ],
      },
      {
        code: '2200',
        name: 'Long-term Liabilities',
        type: 'LIABILITY',
        isLeaf: false,
        children: [
          { code: '2210', name: 'Long-term Loans', type: 'LIABILITY', isLeaf: true },
          { code: '2220', name: 'Bonds Payable', type: 'LIABILITY', isLeaf: true },
        ],
      },
    ],
  },

  // INCOME
  {
    code: '4000',
    name: 'Income',
    type: 'INCOME',
    isLeaf: false,
    children: [
      {
        code: '4100',
        name: 'Fee Income',
        type: 'INCOME',
        isLeaf: false,
        children: [
          { code: '4110', name: 'Tuition Fees', type: 'INCOME', isLeaf: true },
          { code: '4120', name: 'Transport Fees', type: 'INCOME', isLeaf: true },
          { code: '4130', name: 'Lab Fees', type: 'INCOME', isLeaf: true },
          { code: '4140', name: 'Exam Fees', type: 'INCOME', isLeaf: true },
          { code: '4150', name: 'Library Fees', type: 'INCOME', isLeaf: true },
          { code: '4160', name: 'Sports Fees', type: 'INCOME', isLeaf: true },
          { code: '4170', name: 'Late Fees', type: 'INCOME', isLeaf: true },
        ],
      },
      {
        code: '4200',
        name: 'Other Income',
        type: 'INCOME',
        isLeaf: false,
        children: [
          { code: '4210', name: 'Donations', type: 'INCOME', isLeaf: true },
          { code: '4220', name: 'Grants', type: 'INCOME', isLeaf: true },
          { code: '4230', name: 'Interest Income', type: 'INCOME', isLeaf: true },
          { code: '4240', name: 'Rental Income', type: 'INCOME', isLeaf: true },
        ],
      },
    ],
  },

  // EXPENSES
  {
    code: '5000',
    name: 'Expenses',
    type: 'EXPENSE',
    isLeaf: false,
    children: [
      {
        code: '5100',
        name: 'Personnel Expenses',
        type: 'EXPENSE',
        isLeaf: false,
        children: [
          { code: '5110', name: 'Teaching Staff Salaries', type: 'EXPENSE', isLeaf: true },
          { code: '5120', name: 'Administrative Staff Salaries', type: 'EXPENSE', isLeaf: true },
          { code: '5130', name: 'Support Staff Salaries', type: 'EXPENSE', isLeaf: true },
          { code: '5140', name: 'Housing Allowance', type: 'EXPENSE', isLeaf: true },
          { code: '5150', name: 'Transport Allowance', type: 'EXPENSE', isLeaf: true },
          { code: '5160', name: 'Medical Allowance', type: 'EXPENSE', isLeaf: true },
          { code: '5170', name: 'Employee Benefits', type: 'EXPENSE', isLeaf: true },
        ],
      },
      {
        code: '5200',
        name: 'Operating Expenses',
        type: 'EXPENSE',
        isLeaf: false,
        children: [
          { code: '5210', name: 'Utilities - Electricity', type: 'EXPENSE', isLeaf: true },
          { code: '5220', name: 'Utilities - Water', type: 'EXPENSE', isLeaf: true },
          { code: '5230', name: 'Internet and Telephone', type: 'EXPENSE', isLeaf: true },
          { code: '5240', name: 'Office Supplies', type: 'EXPENSE', isLeaf: true },
          { code: '5250', name: 'Cleaning and Maintenance', type: 'EXPENSE', isLeaf: true },
          { code: '5260', name: 'Security Services', type: 'EXPENSE', isLeaf: true },
        ],
      },
      {
        code: '5300',
        name: 'Academic Expenses',
        type: 'EXPENSE',
        isLeaf: false,
        children: [
          { code: '5310', name: 'Books and Learning Materials', type: 'EXPENSE', isLeaf: true },
          { code: '5320', name: 'Laboratory Supplies', type: 'EXPENSE', isLeaf: true },
          { code: '5330', name: 'Sports Equipment', type: 'EXPENSE', isLeaf: true },
          { code: '5340', name: 'Library Resources', type: 'EXPENSE', isLeaf: true },
          { code: '5350', name: 'Educational Software', type: 'EXPENSE', isLeaf: true },
        ],
      },
      {
        code: '5400',
        name: 'Administrative Expenses',
        type: 'EXPENSE',
        isLeaf: false,
        children: [
          { code: '5410', name: 'Insurance', type: 'EXPENSE', isLeaf: true },
          { code: '5420', name: 'Legal and Professional Fees', type: 'EXPENSE', isLeaf: true },
          { code: '5430', name: 'Marketing and Advertising', type: 'EXPENSE', isLeaf: true },
          { code: '5440', name: 'Bank Charges', type: 'EXPENSE', isLeaf: true },
          { code: '5450', name: 'Depreciation', type: 'EXPENSE', isLeaf: true },
        ],
      },
    ],
  },
];

/**
 * Recursively create accounts with parent-child relationships
 */
async function createAccountsRecursively(accounts, parentId = null, createdBy) {
  for (const accountData of accounts) {
    const { children, ...accountFields } = accountData;

    const account = await prisma.account.upsert({
      where: { code: accountFields.code },
      update: {
        name: accountFields.name,
        type: accountFields.type,
        isLeaf: accountFields.isLeaf,
        parentId,
      },
      create: {
        ...accountFields,
        parentId,
        createdBy,
      },
    });

    console.log(`Upserted account: ${account.code} - ${account.name}`);

    if (children && children.length > 0) {
      await createAccountsRecursively(children, account.id, createdBy);
    }
  }
}

/**
 * Seed Chart of Accounts
 */
async function seedChartOfAccounts(adminUserId) {
  console.log('Seeding Chart of Accounts...');
  await createAccountsRecursively(chartOfAccountsTemplate, null, adminUserId);
  console.log('Chart of Accounts seeded successfully!');
}

/**
 * Seed Approval Workflows
 */
async function seedApprovalWorkflows() {
  console.log('Seeding Approval Workflows...');

  // Expense Approval Workflow
  const expenseWorkflow = await prisma.approvalWorkflow.create({
    data: {
      name: 'Standard Expense Approval',
      entityType: 'EXPENSE',
      isActive: true,
      steps: {
        create: [
          {
            stepOrder: 1,
            approverRole: 'FINANCE_OFFICER',
            minAmount: 0,
            maxAmount: 10000,
            isRequired: true,
          },
          {
            stepOrder: 2,
            approverRole: 'SCHOOL_ADMINISTRATOR',
            minAmount: 10000,
            maxAmount: null,
            isRequired: true,
          },
        ],
      },
    },
  });
  console.log(`Created workflow: ${expenseWorkflow.name}`);

  // Budget Approval Workflow
  const budgetWorkflow = await prisma.approvalWorkflow.create({
    data: {
      name: 'Budget Approval',
      entityType: 'BUDGET',
      isActive: true,
      steps: {
        create: [
          {
            stepOrder: 1,
            approverRole: 'FINANCE_OFFICER',
            isRequired: true,
          },
          {
            stepOrder: 2,
            approverRole: 'SCHOOL_ADMINISTRATOR',
            isRequired: true,
          },
        ],
      },
    },
  });
  console.log(`Created workflow: ${budgetWorkflow.name}`);

  // Refund Approval Workflow
  const refundWorkflow = await prisma.approvalWorkflow.create({
    data: {
      name: 'Refund Approval',
      entityType: 'REFUND',
      isActive: true,
      steps: {
        create: [
          {
            stepOrder: 1,
            approverRole: 'FINANCE_OFFICER',
            minAmount: 0,
            maxAmount: 5000,
            isRequired: true,
          },
          {
            stepOrder: 2,
            approverRole: 'SCHOOL_ADMINISTRATOR',
            minAmount: 5000,
            maxAmount: null,
            isRequired: true,
          },
        ],
      },
    },
  });
  console.log(`Created workflow: ${refundWorkflow.name}`);

  // Payroll Approval Workflow
  const payrollWorkflow = await prisma.approvalWorkflow.create({
    data: {
      name: 'Payroll Approval',
      entityType: 'PAYROLL',
      isActive: true,
      steps: {
        create: [
          {
            stepOrder: 1,
            approverRole: 'FINANCE_OFFICER',
            isRequired: true,
          },
          {
            stepOrder: 2,
            approverRole: 'SCHOOL_ADMINISTRATOR',
            isRequired: true,
          },
        ],
      },
    },
  });
  console.log(`Created workflow: ${payrollWorkflow.name}`);

  // Scholarship Approval Workflow
  const scholarshipWorkflow = await prisma.approvalWorkflow.create({
    data: {
      name: 'Scholarship Approval',
      entityType: 'SCHOLARSHIP',
      isActive: true,
      steps: {
        create: [
          {
            stepOrder: 1,
            approverRole: 'FINANCE_OFFICER',
            isRequired: true,
          },
          {
            stepOrder: 2,
            approverRole: 'SCHOOL_ADMINISTRATOR',
            isRequired: true,
          },
        ],
      },
    },
  });
  console.log(`Created workflow: ${scholarshipWorkflow.name}`);

  console.log('Approval Workflows seeded successfully!');
}

/**
 * Seed Sample Vendors
 */
async function seedVendors() {
  console.log('Seeding Sample Vendors...');

  const vendors = [
    {
      name: 'ABC Stationery Supplies',
      contactPerson: 'John Doe',
      email: 'john@abcstationery.com',
      phone: '+1234567890',
      address: '123 Main Street, City',
      taxId: 'TAX123456',
      isActive: true,
    },
    {
      name: 'XYZ Utilities Company',
      contactPerson: 'Jane Smith',
      email: 'jane@xyzutilities.com',
      phone: '+1234567891',
      address: '456 Power Avenue, City',
      taxId: 'TAX789012',
      isActive: true,
    },
    {
      name: 'Tech Solutions Ltd',
      contactPerson: 'Bob Johnson',
      email: 'bob@techsolutions.com',
      phone: '+1234567892',
      address: '789 Tech Park, City',
      taxId: 'TAX345678',
      isActive: true,
    },
  ];

  for (const vendor of vendors) {
    await prisma.vendor.create({ data: vendor });
    console.log(`Created vendor: ${vendor.name}`);
  }

  console.log('Vendors seeded successfully!');
}

/**
 * Seed Sample Salary Structures
 */
async function seedSalaryStructures() {
  console.log('Seeding Sample Salary Structures...');

  // Get account IDs for salary components
  const baseSalaryAccount = await prisma.account.findFirst({
    where: { code: '5110' }, // Teaching Staff Salaries
  });

  const housingAllowanceAccount = await prisma.account.findFirst({
    where: { code: '5140' }, // Housing Allowance
  });

  const transportAllowanceAccount = await prisma.account.findFirst({
    where: { code: '5150' }, // Transport Allowance
  });

  if (!baseSalaryAccount || !housingAllowanceAccount || !transportAllowanceAccount) {
    console.log('Required accounts not found. Skipping salary structure seeding.');
    return;
  }

  const teacherStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Standard Teacher Salary',
      staffCategory: 'TEACHER',
      baseSalary: 50000,
      isActive: true,
      components: {
        create: [
          {
            componentType: 'ALLOWANCE',
            name: 'Housing Allowance',
            calculationType: 'PERCENTAGE',
            value: 20,
            accountId: housingAllowanceAccount.id,
          },
          {
            componentType: 'ALLOWANCE',
            name: 'Transport Allowance',
            calculationType: 'FIXED',
            value: 5000,
            accountId: transportAllowanceAccount.id,
          },
          {
            componentType: 'DEDUCTION',
            name: 'Income Tax',
            calculationType: 'PERCENTAGE',
            value: 10,
            accountId: baseSalaryAccount.id,
          },
        ],
      },
    },
  });
  console.log(`Created salary structure: ${teacherStructure.name}`);

  console.log('Salary Structures seeded successfully!');
}

/**
 * Seed Sample Late Fee Rules
 */
async function seedLateFeeRules() {
  console.log('Seeding Late Fee Rules...');

  const lateFeeRules = [
    {
      name: 'Standard Late Fee - 5%',
      type: 'PERCENTAGE',
      value: 5,
      gracePeriodDays: 7,
      applicableFeeCategories: ['TUITION', 'TRANSPORT', 'LAB', 'EXAM'],
      isActive: true,
    },
    {
      name: 'Fixed Late Fee - $50',
      type: 'FIXED_AMOUNT',
      value: 50,
      gracePeriodDays: 10,
      applicableFeeCategories: ['TUITION'],
      isActive: false, // Inactive by default
    },
  ];

  for (const rule of lateFeeRules) {
    await prisma.lateFeeRule.create({ data: rule });
    console.log(`Created late fee rule: ${rule.name}`);
  }

  console.log('Late Fee Rules seeded successfully!');
}

/**
 * Main seed function
 */
async function seedFinanceModule() {
  try {
    console.log('Starting Finance Module Seeding...\n');

    // Get or create an admin user for createdBy fields
    let adminUser = await prisma.user.findFirst({
      where: { role: 'director' },
    });

    if (!adminUser) {
      console.log('No admin user found. Creating default admin user...');
      adminUser = await prisma.user.create({
        data: {
          name: 'System Administrator',
          role: 'director',
          username: 'admin',
        },
      });
      console.log(`Created admin user: ${adminUser.name}\n`);
    }

    // Seed all finance data
    await seedChartOfAccounts(adminUser.id);
    console.log('');

    await seedApprovalWorkflows();
    console.log('');

    await seedVendors();
    console.log('');

    await seedSalaryStructures();
    console.log('');

    await seedLateFeeRules();
    console.log('');

    console.log('✅ Finance Module Seeding Completed Successfully!');
  } catch (error) {
    console.error('❌ Error seeding finance module:', error);
    throw error;
  }
}

module.exports = {
  seedFinanceModule,
  seedChartOfAccounts,
  seedApprovalWorkflows,
  seedVendors,
  seedSalaryStructures,
  seedLateFeeRules,
};

// Run if called directly
if (require.main === module) {
  seedFinanceModule()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
