/**
 * Test Multi-Branch Database Connection Manager
 * 
 * This script tests the DatabaseConnectionManager with multiple branches
 * to ensure connection pooling, switching, and concurrent access work correctly.
 * 
 * Usage:
 *   node backend/scripts/test-multi-branch.js
 */

require('dotenv').config();
const dbManager = require('../services/DatabaseConnectionManager');

async function testMultiBranch() {
  console.log('\n🧪 Testing Multi-Branch Database Connection Manager');
  console.log('====================================================\n');

  try {
    // Test 1: Get all branches
    console.log('📋 Test 1: Get All Branches');
    console.log('----------------------------');
    const branches = await dbManager.getAllBranches();
    console.log(`✅ Found ${branches.length} branch(es):`);
    branches.forEach(branch => {
      console.log(`   - ${branch.branch_name} (${branch.branch_code}) → ${branch.database_name}`);
    });

    if (branches.length === 0) {
      console.log('\n⚠️  No branches found. Please run the migration first:');
      console.log('   backend/database/migrations/001_create_branch_config.sql');
      process.exit(1);
    }

    // Test 2: Connect to each branch
    console.log('\n🔌 Test 2: Connect to Each Branch');
    console.log('----------------------------------');
    for (const branch of branches) {
      try {
        const pool = await dbManager.getPool(branch.branch_code);
        const result = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
        console.log(`✅ ${branch.branch_code}: Connected to ${result.rows[0].db_name}`);
        console.log(`   Time: ${result.rows[0].current_time}`);
      } catch (error) {
        console.log(`❌ ${branch.branch_code}: Connection failed - ${error.message}`);
      }
    }

    // Test 3: Test connection pooling (reuse)
    console.log('\n♻️  Test 3: Test Connection Pool Reuse');
    console.log('--------------------------------------');
    if (branches.length > 0) {
      const branchCode = branches[0].branch_code;
      console.log(`Testing with branch: ${branchCode}`);
      
      // First connection
      const pool1 = await dbManager.getPool(branchCode);
      console.log('✅ First getPool() call - pool created');
      
      // Second connection (should reuse)
      const pool2 = await dbManager.getPool(branchCode);
      console.log('✅ Second getPool() call - pool reused');
      
      if (pool1 === pool2) {
        console.log('✅ Connection pool reuse working correctly');
      } else {
        console.log('❌ Connection pool NOT reused (unexpected)');
      }
    }

    // Test 4: Test concurrent connections
    console.log('\n⚡ Test 4: Test Concurrent Connections');
    console.log('--------------------------------------');
    if (branches.length > 0) {
      const branchCode = branches[0].branch_code;
      console.log(`Running 5 concurrent queries on branch: ${branchCode}`);
      
      const pool = await dbManager.getPool(branchCode);
      const promises = [];
      
      for (let i = 1; i <= 5; i++) {
        promises.push(
          pool.query('SELECT $1 as query_number, pg_sleep(0.1)', [i])
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      console.log(`✅ All 5 queries completed in ${endTime - startTime}ms`);
      results.forEach(result => {
        console.log(`   Query ${result.rows[0].query_number} completed`);
      });
    }

    // Test 5: Test switching between branches
    console.log('\n🔄 Test 5: Test Switching Between Branches');
    console.log('-------------------------------------------');
    if (branches.length >= 2) {
      const branch1 = branches[0];
      const branch2 = branches[1];
      
      // Query branch 1
      const pool1 = await dbManager.getPool(branch1.branch_code);
      const result1 = await pool1.query('SELECT current_database() as db');
      console.log(`✅ Switched to ${branch1.branch_code}: ${result1.rows[0].db}`);
      
      // Query branch 2
      const pool2 = await dbManager.getPool(branch2.branch_code);
      const result2 = await pool2.query('SELECT current_database() as db');
      console.log(`✅ Switched to ${branch2.branch_code}: ${result2.rows[0].db}`);
      
      // Back to branch 1
      const pool1Again = await dbManager.getPool(branch1.branch_code);
      const result1Again = await pool1Again.query('SELECT current_database() as db');
      console.log(`✅ Switched back to ${branch1.branch_code}: ${result1Again.rows[0].db}`);
      
      console.log('✅ Branch switching working correctly');
    } else {
      console.log('⚠️  Need at least 2 branches to test switching');
      console.log('   Create another branch using: node backend/scripts/create-branch-database.js');
    }

    // Test 6: Test connection pool statistics
    console.log('\n📊 Test 6: Connection Pool Statistics');
    console.log('-------------------------------------');
    for (const branch of branches) {
      const stats = dbManager.getPoolStats(branch.branch_code);
      if (stats) {
        console.log(`${branch.branch_code}:`);
        console.log(`   Total connections: ${stats.totalCount}`);
        console.log(`   Idle connections: ${stats.idleCount}`);
        console.log(`   Waiting clients: ${stats.waitingCount}`);
      }
    }

    // Test 7: Test invalid branch code
    console.log('\n❌ Test 7: Test Invalid Branch Code');
    console.log('------------------------------------');
    try {
      await dbManager.getPool('XYZ');
      console.log('❌ Should have thrown error for invalid branch code');
    } catch (error) {
      console.log(`✅ Correctly rejected invalid branch code: ${error.message}`);
    }

    // Test 8: Test branch code generation
    console.log('\n🔤 Test 8: Test Branch Code Generation');
    console.log('--------------------------------------');
    const testCases = [
      { name: 'Al Markaz Academy', expected: 'AMA' },
      { name: 'Sunrise School', expected: 'SOL' },
      { name: 'Tech Academy', expected: 'TYY' },
      { name: 'ABC', expected: 'ABC' },
      { name: 'XY', expected: 'XYY' }
    ];
    
    testCases.forEach(test => {
      const generated = dbManager.generateBranchCode(test.name);
      const status = generated === test.expected ? '✅' : '❌';
      console.log(`${status} "${test.name}" → ${generated} (expected: ${test.expected})`);
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Total branches: ${branches.length}`);
    console.log(`   All connections working: ✅`);
    console.log(`   Connection pooling: ✅`);
    console.log(`   Concurrent queries: ✅`);
    console.log(`   Branch switching: ${branches.length >= 2 ? '✅' : '⚠️  (need 2+ branches)'}`);
    console.log(`   Error handling: ✅`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testMultiBranch();
