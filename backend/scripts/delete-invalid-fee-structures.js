/**
 * Delete Invalid Fee Structures
 * Removes fee structures that have no months selected
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteInvalidFeeStructures() {
  console.log('🔍 Checking for invalid fee structures...\n');

  try {
    const feeStructures = await prisma.feeStructure.findMany({
      include: {
        items: true
      }
    });

    let deletedCount = 0;

    for (const fs of feeStructures) {
      let monthsData = {};
      try {
        monthsData = JSON.parse(fs.description || '{}');
      } catch (e) {
        monthsData = {};
      }

      const monthCount = monthsData.months?.length || 0;

      if (monthCount === 0) {
        console.log(`❌ Invalid fee structure found:`);
        console.log(`   Class: ${fs.gradeLevel}`);
        console.log(`   Months selected: ${monthCount}`);
        console.log(`   Deleting...`);

        // Delete fee structure items first
        await prisma.feeStructureItem.deleteMany({
          where: { feeStructureId: fs.id }
        });

        // Delete fee structure
        await prisma.feeStructure.delete({
          where: { id: fs.id }
        });

        console.log(`   ✅ Deleted\n`);
        deletedCount++;
      } else {
        console.log(`✅ Valid fee structure:`);
        console.log(`   Class: ${fs.gradeLevel}`);
        console.log(`   Months selected: ${monthCount}\n`);
      }
    }

    if (deletedCount > 0) {
      console.log(`\n✅ Deleted ${deletedCount} invalid fee structure(s)`);
      console.log('\nYou can now create new fee structures with Ethiopian months selected.');
    } else {
      console.log('\n✅ No invalid fee structures found. All good!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteInvalidFeeStructures();
