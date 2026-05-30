const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFeeStructures() {
  try {
    console.log('Checking fee structures...\n');

    const feeStructures = await prisma.feeStructure.findMany({
      include: {
        items: true
      }
    });

    console.log(`Total fee structures: ${feeStructures.length}\n`);

    if (feeStructures.length === 0) {
      console.log('❌ No fee structures found');
      console.log('\nYou need to:');
      console.log('1. Go to Finance → Monthly Payment Settings');
      console.log('2. Add a class with monthly fee');
      console.log('3. Select months and generate invoices');
    } else {
      feeStructures.forEach((fs, index) => {
        console.log(`${index + 1}. Fee Structure:`);
        console.log(`   ID: ${fs.id}`);
        console.log(`   Class: ${fs.gradeLevel}`);
        console.log(`   Active: ${fs.isActive}`);
        console.log(`   Description: ${fs.description || 'N/A'}`);
        console.log(`   Items: ${fs.items.length}`);
        if (fs.items.length > 0) {
          fs.items.forEach(item => {
            console.log(`     - ${item.description}: ${item.amount} Birr`);
          });
        }
        console.log('');
      });

      // Check invoices for each fee structure
      console.log('\nChecking invoices...\n');
      for (const fs of feeStructures) {
        const invoices = await prisma.invoice.findMany({
          where: {
            feeStructureId: fs.id
          }
        });
        console.log(`Class ${fs.gradeLevel}: ${invoices.length} invoices`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFeeStructures();
