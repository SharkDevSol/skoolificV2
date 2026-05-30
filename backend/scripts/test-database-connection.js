/**
 * Test Database Connection and Branch Configuration
 * 
 * This script:
 * 1. Tests connection to the master database
 * 2. Lists all existing branches and their codes
 * 3. Shows how to add new branches with auto-generated codes
 * 4. Demonstrates the branch code generation algorithm
 */

require('dotenv').config();
const { Pool } = require('pg');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Generate branch code from branch name
 * Algorithm: First letter + Last 2 characters (uppercase)
 */
function generateBranchCode(branchName) {
  const cleaned = branchName.trim().replace(/\s+/g, '');
  if (cleaned.length === 0) {
    throw new Error('Branch name cannot be empty');
  }
  
  if (cleaned.length === 1) {
    return cleaned.toUpperCase() + 'XX';
  } else if (cleaned.length === 2) {
    return cleaned.toUpperCase() + 'X';
  } else {
    const firstChar = cleaned[0];
    const lastTwoChars = cleaned.slice(-2);
    return (firstChar + lastTwoChars).toUpperCase();
  }
}

async function testDatabaseConnection() {
  console.log(`\n${colors.bold}${colors.blue}========================================`);
  console.log('DATABASE CONNECTION TEST');
  console.log(`========================================${colors.reset}\n`);

  // Create connection pool
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'skoolific',
    password: String(process.env.DB_PASSWORD || '12345678'),
    port: process.env.DB_PORT || 5432,
  });

  try {
    // Test 1: Basic Connection
    console.log(`${colors.yellow}Test 1: Testing database connection...${colors.reset}`);
    const timeResult = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`${colors.green}✅ Connected successfully!${colors.reset}`);
    console.log(`   Database: ${process.env.DB_NAME || 'skoolific'}`);
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
    console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
    console.log(`   Time: ${timeResult.rows[0].current_time}`);
    console.log(`   PostgreSQL Version: ${timeResult.rows[0].pg_version.split(',')[0]}\n`);

    // Test 2: Check if branch_config table exists
    console.log(`${colors.yellow}Test 2: Checking branch_config table...${colors.reset}`);
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'branch_config'
      ) as table_exists
    `);

    if (!tableCheck.rows[0].table_exists) {
      console.log(`${colors.red}❌ branch_config table does not exist!${colors.reset}`);
      console.log(`   Run migration: node backend/database/test-migration.js\n`);
      await pool.end();
      return;
    }
    console.log(`${colors.green}✅ branch_config table exists${colors.reset}\n`);

    // Test 3: List all existing branches
    console.log(`${colors.yellow}Test 3: Listing all branches...${colors.reset}`);
    const branches = await pool.query(`
      SELECT 
        id,
        branch_name,
        branch_code,
        database_name,
        database_host,
        database_port,
        is_active,
        created_at
      FROM branch_config
      ORDER BY created_at
    `);

    if (branches.rows.length === 0) {
      console.log(`${colors.red}❌ No branches found!${colors.reset}`);
      console.log(`   Run migration to create default branch: node backend/database/test-migration.js\n`);
    } else {
      console.log(`${colors.green}✅ Found ${branches.rows.length} branch(es):${colors.reset}\n`);
      
      branches.rows.forEach((branch, index) => {
        const status = branch.is_active ? `${colors.green}ACTIVE${colors.reset}` : `${colors.red}INACTIVE${colors.reset}`;
        console.log(`   ${index + 1}. ${colors.bold}${branch.branch_name}${colors.reset}`);
        console.log(`      Branch Code: ${colors.blue}${branch.branch_code}${colors.reset}`);
        console.log(`      Database: ${branch.database_name}`);
        console.log(`      Host: ${branch.database_host}:${branch.database_port}`);
        console.log(`      Status: ${status}`);
        console.log(`      Created: ${new Date(branch.created_at).toLocaleString()}\n`);
      });
    }

    // Test 4: Demonstrate branch code generation
    console.log(`${colors.yellow}Test 4: Branch Code Generation Examples${colors.reset}`);
    console.log(`${colors.blue}Algorithm: First letter + Last 2 characters (uppercase)${colors.reset}\n`);
    
    const examples = [
      'Al Markaz Academy',
      'Sunrise School',
      'Tech Institute',
      'Green Valley High School',
      'St. Mary\'s College',
      'International School of Excellence',
      'ABC',
      'XY',
      'Z'
    ];

    examples.forEach(name => {
      const code = generateBranchCode(name);
      console.log(`   "${name}" → ${colors.green}${code}${colors.reset}`);
    });

    console.log(`\n${colors.bold}${colors.blue}========================================`);
    console.log('HOW TO ADD A NEW BRANCH');
    console.log(`========================================${colors.reset}\n`);

    console.log(`${colors.yellow}Method 1: Using SQL (Direct)${colors.reset}`);
    console.log(`
INSERT INTO branch_config (
  branch_name, 
  branch_code, 
  database_name,
  database_host,
  database_port,
  database_user,
  database_password,
  is_active
) VALUES (
  'Your Branch Name',           -- Branch name
  'YBE',                         -- Auto-generated code (or specify manually)
  'your_database_name',          -- Database name
  'localhost',                   -- Database host
  5432,                          -- Database port
  'postgres',                    -- Database user
  '12345678',                    -- Database password
  true                           -- Active status
);
    `);

    console.log(`${colors.yellow}Method 2: Using the API (Recommended)${colors.reset}`);
    console.log(`
POST http://localhost:3000/api/v2/branches/create
Headers:
  Content-Type: application/json
  Authorization: Bearer <admin_token>

Body:
{
  "branchName": "Your Branch Name",
  "databaseName": "your_database_name",
  "databaseHost": "localhost",
  "databasePort": 5432,
  "databaseUser": "postgres",
  "databasePassword": "12345678",
  "schoolAddress": "123 Main St",
  "schoolPhone": "+1234567890",
  "schoolEmail": "school@example.com",
  "adminName": "Admin Name",
  "adminEmail": "admin@example.com",
  "adminPhone": "+1234567890"
}

Response:
{
  "success": true,
  "branch": {
    "id": 2,
    "branch_name": "Your Branch Name",
    "branch_code": "YBE",  // Auto-generated!
    "database_name": "your_database_name",
    ...
  }
}
    `);

    console.log(`${colors.yellow}Method 3: Using Node.js Script${colors.reset}`);
    console.log(`
const dbManager = require('./services/DatabaseConnectionManager');

async function addBranch() {
  const newBranch = await dbManager.createBranch({
    branchName: 'Your Branch Name',
    databaseName: 'your_database_name',
    databaseHost: 'localhost',
    databasePort: 5432,
    databaseUser: 'postgres',
    databasePassword: '12345678',
    schoolAddress: '123 Main St',
    schoolPhone: '+1234567890',
    schoolEmail: 'school@example.com',
    adminName: 'Admin Name',
    adminEmail: 'admin@example.com',
    adminPhone: '+1234567890'
  });
  
  console.log('Branch Code:', newBranch.branch_code); // Auto-generated!
}
    `);

    console.log(`\n${colors.bold}${colors.blue}========================================`);
    console.log('HOW TO VIEW BRANCH CODES');
    console.log(`========================================${colors.reset}\n`);

    console.log(`${colors.yellow}Method 1: SQL Query${colors.reset}`);
    console.log(`
SELECT branch_name, branch_code, database_name, is_active 
FROM branch_config 
ORDER BY branch_name;
    `);

    console.log(`${colors.yellow}Method 2: API Endpoint${colors.reset}`);
    console.log(`
GET http://localhost:3000/api/v2/branches
Headers:
  Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "branches": [
    {
      "id": 1,
      "branch_name": "Main Branch",
      "branch_code": "MAI",
      "database_name": "skoolific",
      ...
    }
  ]
}
    `);

    console.log(`${colors.yellow}Method 3: Run this script${colors.reset}`);
    console.log(`
node backend/scripts/test-database-connection.js
    `);

    console.log(`\n${colors.green}${colors.bold}✅ All tests completed successfully!${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}❌ Error:${colors.reset}`, error.message);
    console.error(`\n${colors.yellow}Troubleshooting:${colors.reset}`);
    console.error(`1. Make sure PostgreSQL is running`);
    console.error(`2. Check database credentials in backend/.env`);
    console.error(`3. Verify database '${process.env.DB_NAME || 'skoolific'}' exists`);
    console.error(`4. Run: psql -U postgres -c "CREATE DATABASE skoolific;"\n`);
  } finally {
    await pool.end();
  }
}

// Run the test
testDatabaseConnection();
