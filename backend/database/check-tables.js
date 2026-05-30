/**
 * Check existing tables in the database
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function checkTables() {
  try {
    console.log('\n=== Checking Database Tables ===\n');
    
    // Check if expenses table exists
    const expensesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses'
      );
    `);
    
    console.log(`Expenses table exists: ${expensesCheck.rows[0].exists}`);
    
    if (expensesCheck.rows[0].exists) {
      // Get expenses table structure
      const expensesStructure = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'expenses'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nExpenses table structure:');
      expensesStructure.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check for indexes on expenses
      const expensesIndexes = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'expenses';
      `);
      
      console.log('\nExpenses table indexes:');
      expensesIndexes.rows.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });
    }
    
    // Check all finance-related tables
    const financeTablesCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('fee_structures', 'invoices', 'payments', 'expenses', 'budgets')
      ORDER BY table_name;
    `);
    
    console.log('\n\nFinance tables that exist:');
    financeTablesCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
