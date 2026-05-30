/**
 * Check Monthly Payment Setup
 * Verifies all requirements are met for monthly payment system
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const pool = require('../config/db');

async function checkSetup() {
  console.log('🔍 Checking Monthly Payment System Setup...\n');

  let allGood = true;

  try {
    // 1. Check database connection
    console.log('1️⃣  Checking database connection...');
    try {
      await pool.query('SELECT 1');
      console.log('   ✅ Database connected\n');
    } catch (error) {
      console.log('   ❌ Database connection failed');
      console.log('   Error:', error.message, '\n');
      allGood = false;
    }

    // 2. Check if accounts exist
    console.log('2️⃣  Checking chart of accounts...');
    try {
      const accounts = await prisma.account.findMany({
        where: {
          type: 'INCOME',
          isActive: true
        }
      });
      
      if (accounts.length > 0) {
        console.log(`   ✅ Found ${accounts.length} income account(s)`);
        accounts.forEach(acc => {
          console.log(`      - ${acc.name} (${acc.code})`);
        });
        console.log('');
      } else {
        console.log('   ⚠️  No income accounts found');
        console.log('   Run: node backend/scripts/setup-default-accounts.js\n');
        allGood = false;
      }
    } catch (error) {
      console.log('   ❌ Error checking accounts');
      console.log('   Error:', error.message, '\n');
      allGood = false;
    }

    // 3. Check if classes exist
    console.log('3️⃣  Checking available classes...');
    try {
      const result = await pool.query(`
        SELECT class_names FROM school_schema_points.classes WHERE id = 1
      `);
      
      if (result.rows.length > 0 && result.rows[0].class_names) {
        const classes = result.rows[0].class_names;
        console.log(`   ✅ Found ${classes.length} class(es)`);
        classes.slice(0, 5).forEach(cls => {
          console.log(`      - ${cls}`);
        });
        if (classes.length > 5) {
          console.log(`      ... and ${classes.length - 5} more`);
        }
        console.log('');
      } else {
        console.log('   ⚠️  No classes found');
        console.log('   Please create classes in the system first\n');
        allGood = false;
      }
    } catch (error) {
      console.log('   ❌ Error checking classes');
      console.log('   Error:', error.message, '\n');
      allGood = false;
    }

    // 4. Check if students exist
    console.log('4️⃣  Checking students...');
    try {
      const result = await pool.query(`
        SELECT class_names FROM school_schema_points.classes WHERE id = 1
      `);
      
      if (result.rows.length > 0 && result.rows[0].class_names) {
        const classes = result.rows[0].class_names;
        let totalStudents = 0;
        
        for (const className of classes.slice(0, 3)) {
          try {
            const studentResult = await pool.query(`
              SELECT COUNT(*) as count
              FROM classes_schema."${className}"
              WHERE school_id IS NOT NULL AND class_id IS NOT NULL
            `);
            const count = parseInt(studentResult.rows[0].count);
            totalStudents += count;
            if (count > 0) {
              console.log(`   ✅ ${className}: ${count} student(s)`);
            }
          } catch (error) {
            // Class table might not exist
          }
        }
        
        if (totalStudents > 0) {
          console.log(`   ✅ Total students checked: ${totalStudents}\n`);
        } else {
          console.log('   ⚠️  No students found in checked classes');
          console.log('   Please add students to classes first\n');
          allGood = false;
        }
      }
    } catch (error) {
      console.log('   ⚠️  Could not check students');
      console.log('   Error:', error.message, '\n');
    }

    // 5. Check fee structures
    console.log('5️⃣  Checking fee structures...');
    try {
      const feeStructures = await prisma.feeStructure.findMany({
        include: {
          items: true
        }
      });
      
      if (feeStructures.length > 0) {
        console.log(`   ✅ Found ${feeStructures.length} fee structure(s)`);
        feeStructures.forEach(fs => {
          let monthsData = {};
          try {
            monthsData = JSON.parse(fs.description || '{}');
          } catch (e) {}
          
          const monthCount = monthsData.months?.length || 0;
          console.log(`      - ${fs.gradeLevel}: ${monthCount} month(s) selected`);
        });
        console.log('');
      } else {
        console.log('   ℹ️  No fee structures found (this is normal after cleanup)');
        console.log('   Create one in: Finance → Monthly Payment Settings\n');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking fee structures');
      console.log('   Error:', error.message, '\n');
    }

    // 6. Check invoices
    console.log('6️⃣  Checking invoices...');
    try {
      const invoiceCount = await prisma.invoice.count();
      
      if (invoiceCount > 0) {
        console.log(`   ✅ Found ${invoiceCount} invoice(s)`);
        
        const pendingCount = await prisma.invoice.count({
          where: { status: 'PENDING' }
        });
        const paidCount = await prisma.invoice.count({
          where: { status: 'PAID' }
        });
        
        console.log(`      - Pending: ${pendingCount}`);
        console.log(`      - Paid: ${paidCount}`);
        console.log('');
      } else {
        console.log('   ℹ️  No invoices found (this is normal after cleanup)');
        console.log('   Generate invoices after creating fee structures\n');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking invoices');
      console.log('   Error:', error.message, '\n');
    }

    // 7. Check late fee rules
    console.log('7️⃣  Checking late fee rules...');
    try {
      const lateFeeRules = await prisma.lateFeeRule.findMany({
        where: { isActive: true }
      });
      
      if (lateFeeRules.length > 0) {
        console.log(`   ✅ Found ${lateFeeRules.length} active late fee rule(s)`);
        lateFeeRules.forEach(rule => {
          console.log(`      - ${rule.name}: ${rule.value} (${rule.type})`);
        });
        console.log('');
      } else {
        console.log('   ℹ️  No late fee rules found');
        console.log('   You can add them in: Finance → Monthly Payment Settings → Late Fees\n');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking late fee rules');
      console.log('   Error:', error.message, '\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    if (allGood) {
      console.log('✅ SYSTEM READY!');
      console.log('\nYou can now:');
      console.log('1. Go to Finance → Monthly Payment Settings');
      console.log('2. Click "+ Add Class Fee"');
      console.log('3. Select Ethiopian months and create fee structure');
      console.log('4. Generate invoices for students');
    } else {
      console.log('⚠️  SETUP INCOMPLETE');
      console.log('\nPlease fix the issues above before proceeding.');
      console.log('\nCommon fixes:');
      console.log('- Run: node backend/scripts/setup-default-accounts.js');
      console.log('- Create classes in the system');
      console.log('- Add students to classes');
    }
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during setup check:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkSetup();
