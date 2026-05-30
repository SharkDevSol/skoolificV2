/**
 * Setup Script for Monthly Payment Tracking System
 * 
 * This script helps you set up the monthly payment tracking system by:
 * 1. Creating income accounts for fee collection
 * 2. Creating fee structures for different classes
 * 3. Generating sample monthly invoices
 * 
 * Usage: node scripts/setup-monthly-payments.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupMonthlyPayments() {
  console.log('🚀 Starting Monthly Payment System Setup...\n');

  try {
    // Step 1: Create Income Account for Tuition
    console.log('📊 Step 1: Creating Income Account...');
    
    const incomeAccount = await prisma.account.upsert({
      where: { code: 'INC-TUITION-001' },
      update: {},
      create: {
        code: 'INC-TUITION-001',
        name: 'Tuition Fee Income',
        type: 'INCOME',
        isActive: true,
        isLeaf: true,
        createdBy: 'system'
      }
    });
    
    console.log(`✅ Income account created: ${incomeAccount.name} (${incomeAccount.code})\n`);

    // Step 2: Get or create academic year
    console.log('📅 Step 2: Setting up Academic Year...');
    
    const currentYear = new Date().getFullYear();
    const academicYearId = `AY-${currentYear}-${currentYear + 1}`;
    
    console.log(`✅ Using Academic Year: ${academicYearId}\n`);

    // Step 3: Create Fee Structures for different classes
    console.log('💰 Step 3: Creating Fee Structures...');
    
    const feeStructures = [
      {
        name: `Class A Monthly Fee ${currentYear}`,
        gradeLevel: 'Class A',
        amount: 1300,
        description: 'Monthly tuition fee for Class A'
      },
      {
        name: `Class B Monthly Fee ${currentYear}`,
        gradeLevel: 'Class B',
        amount: 1300,
        description: 'Monthly tuition fee for Class B'
      },
      {
        name: `Class C Monthly Fee ${currentYear}`,
        gradeLevel: 'Class C',
        amount: 1500,
        description: 'Monthly tuition fee for Class C'
      }
    ];

    const createdStructures = [];
    
    for (const structure of feeStructures) {
      // Check if fee structure already exists
      const existing = await prisma.feeStructure.findFirst({
        where: {
          name: structure.name,
          academicYearId: academicYearId
        }
      });

      if (existing) {
        console.log(`⚠️  Fee structure already exists: ${structure.name}`);
        createdStructures.push(existing);
        continue;
      }

      // Create fee structure
      const feeStructure = await prisma.feeStructure.create({
        data: {
          name: structure.name,
          academicYearId: academicYearId,
          gradeLevel: structure.gradeLevel,
          isActive: true
        }
      });

      // Create fee structure item
      await prisma.feeStructureItem.create({
        data: {
          feeStructureId: feeStructure.id,
          feeCategory: 'TUITION',
          amount: structure.amount,
          accountId: incomeAccount.id,
          paymentType: 'RECURRING',
          description: structure.description
        }
      });

      console.log(`✅ Created: ${structure.name} - $${structure.amount}/month`);
      createdStructures.push(feeStructure);
    }

    console.log('\n📋 Summary:');
    console.log('─────────────────────────────────────────');
    console.log(`✅ Income Account: ${incomeAccount.code}`);
    console.log(`✅ Academic Year: ${academicYearId}`);
    console.log(`✅ Fee Structures Created: ${createdStructures.length}`);
    console.log('─────────────────────────────────────────\n');

    console.log('📝 Next Steps:');
    console.log('1. Generate monthly invoices for students using the fee structures');
    console.log('2. Access the Monthly Payment Dashboard in the Finance module');
    console.log('3. Start recording payments as students pay their fees\n');

    console.log('💡 To generate invoices, use:');
    console.log('   POST /api/finance/invoices/generate');
    console.log('   with studentIds and feeStructureId\n');

    console.log('🎉 Setup Complete!\n');

  } catch (error) {
    console.error('❌ Error during setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupMonthlyPayments()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
