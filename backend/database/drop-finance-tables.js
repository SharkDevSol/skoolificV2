/**
 * Drop existing finance tables to allow clean migration
 */

const { Pool } = require('pg');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function dropFinanceTables() {
  try {
    console.log('\n⚠️  WARNING: This will drop existing finance tables!');
    console.log('Tables to be dropped: fee_structures, invoices, payments, expenses, budgets\n');
    
    rl.question('Are you sure you want to continue? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() !== 'yes') {
        console.log('\nOperation cancelled.');
        rl.close();
        await pool.end();
        return;
      }
      
      console.log('\n=== Dropping Finance Tables ===\n');
      
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Drop tables in reverse order of dependencies
        const tables = ['budgets', 'expenses', 'payments', 'invoices', 'fee_structures'];
        
        for (const table of tables) {
          try {
            await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            console.log(`✓ Dropped table: ${table}`);
          } catch (error) {
            console.log(`✗ Failed to drop ${table}: ${error.message}`);
          }
        }
        
        await client.query('COMMIT');
        console.log('\n✓ All finance tables dropped successfully\n');
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n✗ Error dropping tables:', error.message);
      } finally {
        client.release();
      }
      
      rl.close();
      await pool.end();
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
    await pool.end();
  }
}

dropFinanceTables();
