/**
 * Migration: Add finance-related columns to ALL class tables
 * 
 * This migration adds the following columns to all tables in classes_schema:
 * - is_active: BOOLEAN DEFAULT TRUE (track active/inactive students)
 * - is_free: BOOLEAN DEFAULT FALSE (track scholarship/free students)
 * - exemption_type: VARCHAR(50) (type of exemption: scholarship, staff_child, etc.)
 * - exemption_reason: TEXT (reason for exemption)
 * 
 * These columns are required for the monthly payment tracking system.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateAllClassTables() {
  try {
    console.log('\n========================================');
    console.log('MIGRATION: Add Finance Columns to All Class Tables');
    console.log('========================================\n');
    
    // Get all tables in classes_schema
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`Found ${tables.length} class tables\n`);
    
    if (tables.length === 0) {
      console.log('No class tables found. Migration not needed.');
      return;
    }
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`Processing: ${tableName}`);
      
      try {
        // Check which columns already exist
        const existingColumns = await prisma.$queryRawUnsafe(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'classes_schema' 
            AND table_name = $1
            AND column_name IN ('is_active', 'is_free', 'exemption_type', 'exemption_reason')
        `, tableName);
        
        const existingColumnNames = existingColumns.map(c => c.column_name);
        
        // Add missing columns
        const columnsToAdd = [];
        
        if (!existingColumnNames.includes('is_active')) {
          columnsToAdd.push('is_active BOOLEAN DEFAULT TRUE');
        }
        
        if (!existingColumnNames.includes('is_free')) {
          columnsToAdd.push('is_free BOOLEAN DEFAULT FALSE');
        }
        
        if (!existingColumnNames.includes('exemption_type')) {
          columnsToAdd.push('exemption_type VARCHAR(50)');
        }
        
        if (!existingColumnNames.includes('exemption_reason')) {
          columnsToAdd.push('exemption_reason TEXT');
        }
        
        if (columnsToAdd.length === 0) {
          console.log(`  ✓ All columns already exist - skipped\n`);
          skipCount++;
          continue;
        }
        
        // Add all missing columns in one ALTER TABLE statement
        for (const columnDef of columnsToAdd) {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE classes_schema."${tableName}" 
            ADD COLUMN IF NOT EXISTS ${columnDef}
          `);
        }
        
        console.log(`  ✓ Added ${columnsToAdd.length} column(s): ${columnsToAdd.map(c => c.split(' ')[0]).join(', ')}\n`);
        successCount++;
        
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}\n`);
        errorCount++;
      }
    }
    
    console.log('========================================');
    console.log('MIGRATION COMPLETE');
    console.log('========================================');
    console.log(`Total tables: ${tables.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Already up-to-date: ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('========================================\n');
    
    // Verify the migration
    console.log('Verifying migration...\n');
    
    const verification = await prisma.$queryRawUnsafe(`
      SELECT 
        t.table_name,
        COUNT(CASE WHEN c.column_name = 'is_active' THEN 1 END) as has_is_active,
        COUNT(CASE WHEN c.column_name = 'is_free' THEN 1 END) as has_is_free,
        COUNT(CASE WHEN c.column_name = 'exemption_type' THEN 1 END) as has_exemption_type,
        COUNT(CASE WHEN c.column_name = 'exemption_reason' THEN 1 END) as has_exemption_reason
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c 
        ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
        AND c.column_name IN ('is_active', 'is_free', 'exemption_type', 'exemption_reason')
      WHERE t.table_schema = 'classes_schema'
        AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `);
    
    let allGood = true;
    verification.forEach(row => {
      const missing = [];
      if (row.has_is_active === '0') missing.push('is_active');
      if (row.has_is_free === '0') missing.push('is_free');
      if (row.has_exemption_type === '0') missing.push('exemption_type');
      if (row.has_exemption_reason === '0') missing.push('exemption_reason');
      
      if (missing.length > 0) {
        console.log(`✗ ${row.table_name}: Missing ${missing.join(', ')}`);
        allGood = false;
      } else {
        console.log(`✓ ${row.table_name}: All columns present`);
      }
    });
    
    if (allGood) {
      console.log('\n✓ All class tables have the required finance columns!\n');
    } else {
      console.log('\n✗ Some tables are still missing columns. Please check the errors above.\n');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAllClassTables()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAllClassTables };
