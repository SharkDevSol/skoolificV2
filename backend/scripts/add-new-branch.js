/**
 * Add New Branch Script
 * 
 * This script helps you add a new branch to the system.
 * The branch code will be auto-generated from the branch name.
 * 
 * Usage:
 *   node backend/scripts/add-new-branch.js "Branch Name" "database_name"
 * 
 * Example:
 *   node backend/scripts/add-new-branch.js "Sunrise School" "sunrise_db"
 */

require('dotenv').config();
const dbManager = require('../services/DatabaseConnectionManager');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

async function addNewBranch() {
  const branchName = process.argv[2];
  const databaseName = process.argv[3];

  console.log(`\n${colors.bold}${colors.blue}========================================`);
  console.log('ADD NEW BRANCH');
  console.log(`========================================${colors.reset}\n`);

  // Validate input
  if (!branchName || !databaseName) {
    console.log(`${colors.red}❌ Missing required arguments!${colors.reset}\n`);
    console.log('Usage:');
    console.log('  node backend/scripts/add-new-branch.js "Branch Name" "database_name"\n');
    console.log('Example:');
    console.log('  node backend/scripts/add-new-branch.js "Sunrise School" "sunrise_db"\n');
    process.exit(1);
  }

  try {
    // Generate branch code preview
    const cleaned = branchName.trim().replace(/\s+/g, '');
    let previewCode;
    if (cleaned.length === 1) {
      previewCode = cleaned.toUpperCase() + 'XX';
    } else if (cleaned.length === 2) {
      previewCode = cleaned.toUpperCase() + 'X';
    } else {
      const firstChar = cleaned[0];
      const lastTwoChars = cleaned.slice(-2);
      previewCode = (firstChar + lastTwoChars).toUpperCase();
    }

    console.log(`${colors.yellow}Branch Information:${colors.reset}`);
    console.log(`  Branch Name: ${branchName}`);
    console.log(`  Database Name: ${databaseName}`);
    console.log(`  Branch Code (auto-generated): ${colors.green}${previewCode}${colors.reset}\n`);

    // Create the branch
    console.log(`${colors.yellow}Creating branch...${colors.reset}`);
    
    const newBranch = await dbManager.createBranch({
      branchName: branchName,
      databaseName: databaseName,
      databaseHost: process.env.DB_HOST || 'localhost',
      databasePort: process.env.DB_PORT || 5432,
      databaseUser: process.env.DB_USER || 'postgres',
      databasePassword: process.env.DB_PASSWORD || '12345678',
      schoolAddress: '',
      schoolPhone: '',
      schoolEmail: '',
      adminName: '',
      adminEmail: '',
      adminPhone: ''
    });

    console.log(`${colors.green}${colors.bold}✅ Branch created successfully!${colors.reset}\n`);
    console.log(`${colors.yellow}Branch Details:${colors.reset}`);
    console.log(`  ID: ${newBranch.id}`);
    console.log(`  Branch Name: ${newBranch.branch_name}`);
    console.log(`  Branch Code: ${colors.green}${colors.bold}${newBranch.branch_code}${colors.reset}`);
    console.log(`  Database: ${newBranch.database_name}`);
    console.log(`  Host: ${newBranch.database_host}:${newBranch.database_port}`);
    console.log(`  Status: ${newBranch.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`  Created: ${new Date(newBranch.created_at).toLocaleString()}\n`);

    console.log(`${colors.blue}${colors.bold}📝 IMPORTANT: Save this branch code!${colors.reset}`);
    console.log(`${colors.blue}   Branch Code: ${colors.bold}${newBranch.branch_code}${colors.reset}\n`);

    console.log(`${colors.yellow}Next Steps:${colors.reset}`);
    console.log(`  1. Create the database: ${colors.blue}${databaseName}${colors.reset}`);
    console.log(`     psql -U postgres -c "CREATE DATABASE ${databaseName};"`);
    console.log(`  2. Run migrations on the new database`);
    console.log(`  3. Use branch code ${colors.green}${colors.bold}${newBranch.branch_code}${colors.reset} to login\n`);

    // List all branches
    console.log(`${colors.yellow}All Branches:${colors.reset}`);
    const allBranches = await dbManager.getAllBranches();
    allBranches.forEach((branch, index) => {
      const status = branch.is_active ? `${colors.green}ACTIVE${colors.reset}` : `${colors.red}INACTIVE${colors.reset}`;
      console.log(`  ${index + 1}. ${branch.branch_name} (${colors.blue}${branch.branch_code}${colors.reset}) → ${branch.database_name} [${status}]`);
    });
    console.log('');

  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}❌ Error:${colors.reset}`, error.message);
    
    if (error.message.includes('duplicate key')) {
      console.error(`\n${colors.yellow}This branch code or database name already exists!${colors.reset}`);
      console.error(`Try a different branch name or database name.\n`);
    }
  } finally {
    await dbManager.closeAll();
  }
}

addNewBranch();
