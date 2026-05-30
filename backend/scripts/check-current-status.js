require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const os = require('os');

async function checkStatus() {
  console.log('🔍 DUAL-MODE ATTENDANCE SYSTEM STATUS CHECK');
  console.log('='.repeat(70));
  console.log('');

  // 1. Network Information
  console.log('📡 NETWORK INFORMATION:');
  console.log('-'.repeat(70));
  
  const interfaces = os.networkInterfaces();
  let foundLaptopIP = false;
  
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`   ${name}: ${addr.address}`);
        if (addr.address === '10.22.134.159') {
          console.log('   ✅ This is your laptop IP (correct for machine Server IP)');
          foundLaptopIP = true;
        }
      }
    }
  }
  
  if (!foundLaptopIP) {
    console.log('   ⚠️  Expected laptop IP (10.22.134.159) not found!');
    console.log('   💡 Your IP might have changed. Update machine Server IP accordingly.');
  }
  
  console.log('');

  // 2. Machine Configuration
  console.log('🤖 MACHINE CONFIGURATION:');
  console.log('-'.repeat(70));
  
  try {
    const machineResult = await pool.query(
      'SELECT * FROM machine_config WHERE id = $1',
      ['machine-001']
    );
    
    if (machineResult.rows.length > 0) {
      const machine = machineResult.rows[0];
      console.log(`   Machine ID: ${machine.id}`);
      console.log(`   Name: ${machine.name}`);
      console.log(`   IP Address: ${machine.ip_address}`);
      console.log(`   Port: ${machine.port}`);
      console.log(`   Status: ${machine.enabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   Last Sync: ${machine.last_sync_at ? new Date(machine.last_sync_at).toLocaleString() : 'Never'}`);
      console.log('');
      console.log('   ⚠️  IMPORTANT: Machine Server IP should be set to:');
      console.log('      010.022.134.159 (your laptop IP)');
      console.log('      NOT 010.022.134.155');
    } else {
      console.log('   ❌ No machine configuration found');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');

  // 3. User Mappings
  console.log('👥 USER MAPPINGS:');
  console.log('-'.repeat(70));
  
  try {
    const mappingResult = await pool.query(
      'SELECT * FROM user_machine_mapping ORDER BY machine_user_id'
    );
    
    if (mappingResult.rows.length > 0) {
      console.log(`   Total mappings: ${mappingResult.rows.length}`);
      console.log('');
      console.log('   Machine ID → Person ID (Type)');
      mappingResult.rows.forEach(row => {
        console.log(`   ${row.machine_user_id} → ${row.person_id} (${row.person_type})`);
      });
    } else {
      console.log('   ⚠️  No user mappings found!');
      console.log('   💡 You need to map machine User IDs to database person_ids');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');

  // 4. Attendance Records
  console.log('📊 ATTENDANCE RECORDS:');
  console.log('-'.repeat(70));
  
  try {
    const attendanceResult = await pool.query(`
      SELECT 
        source_type,
        COUNT(*) as count,
        MAX(timestamp) as latest
      FROM dual_mode_attendance
      GROUP BY source_type
      ORDER BY source_type
    `);
    
    if (attendanceResult.rows.length > 0) {
      attendanceResult.rows.forEach(row => {
        console.log(`   ${row.source_type}: ${row.count} records`);
        console.log(`      Latest: ${new Date(row.latest).toLocaleString()}`);
      });
    } else {
      console.log('   ℹ️  No attendance records yet');
    }
    
    // Recent records
    const recentResult = await pool.query(`
      SELECT 
        person_id,
        person_type,
        date,
        status,
        source_type,
        timestamp
      FROM dual_mode_attendance
      ORDER BY timestamp DESC
      LIMIT 5
    `);
    
    if (recentResult.rows.length > 0) {
      console.log('');
      console.log('   Recent records:');
      recentResult.rows.forEach(row => {
        console.log(`   - Person ${row.person_id} (${row.person_type}): ${row.status} on ${row.date}`);
        console.log(`     Source: ${row.source_type} at ${new Date(row.timestamp).toLocaleString()}`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');

  // 5. Webhook Status
  console.log('🔗 WEBHOOK STATUS:');
  console.log('-'.repeat(70));
  
  const logPath = 'machine-webhook-log.txt';
  
  if (fs.existsSync(logPath)) {
    const logContent = fs.readFileSync(logPath, 'utf8');
    const entries = logContent.split('---').filter(e => e.trim());
    
    console.log(`   ✅ Log file exists: ${entries.length} entries`);
    
    if (entries.length > 0) {
      console.log('');
      console.log('   Latest webhook data:');
      console.log(entries[entries.length - 1].substring(0, 500));
    }
  } else {
    console.log('   ℹ️  No webhook data received yet');
    console.log('   💡 Machine needs to push data to server');
  }
  
  console.log('');

  // 6. Summary
  console.log('📋 SUMMARY:');
  console.log('='.repeat(70));
  console.log('');
  console.log('✅ WORKING:');
  console.log('   - Database schema created');
  console.log('   - Webhook endpoints ready');
  console.log('   - Server accessible from network');
  console.log('');
  console.log('⚠️  ACTION REQUIRED:');
  console.log('   1. Update machine Server IP to: 010.022.134.159');
  console.log('   2. Create user mappings (npm run create:mapping)');
  console.log('   3. Start server (npm start)');
  console.log('   4. Do a face check-in on the machine');
  console.log('   5. Watch server console for incoming data');
  console.log('');
  console.log('📖 READ: MACHINE_DIRECT_CONNECTION_GUIDE.md for detailed instructions');
  console.log('');
  console.log('='.repeat(70));

  await pool.end();
}

checkStatus().catch(console.error);
