// Script to check webhook logs
const fs = require('fs');
const path = require('path');

function checkWebhookLogs() {
  console.log('\n========================================');
  console.log('📋 Checking Webhook Logs');
  console.log('========================================\n');

  const logFile = path.join(__dirname, '..', 'machine-webhook-log.txt');

  if (!fs.existsSync(logFile)) {
    console.log('❌ No webhook log file found');
    console.log('   This means the webhook has NEVER received any data from the machine');
    console.log('\n📝 Possible reasons:');
    console.log('   1. Machine is not configured to push logs');
    console.log('   2. Machine cannot reach the webhook URL');
    console.log('   3. Firewall is blocking the connection');
    console.log('   4. Wrong IP address or port configured on machine');
    console.log('\n✅ Next steps:');
    console.log('   1. Run test script: node scripts/test-student-machine-webhook.js');
    console.log('   2. Configure machine to push to: http://YOUR_IP:5000/api/machine/attendance');
    console.log('   3. Check firewall settings');
    return;
  }

  const content = fs.readFileSync(logFile, 'utf8');
  const lines = content.split('---\n').filter(l => l.trim());

  console.log(`✅ Found webhook log file with ${lines.length} entries\n`);

  if (lines.length === 0) {
    console.log('⚠️  Log file exists but is empty');
    return;
  }

  console.log('Recent webhook calls:\n');
  
  // Show last 10 entries
  const recentEntries = lines.slice(-10);
  
  recentEntries.forEach((entry, index) => {
    try {
      const data = JSON.parse(entry);
      console.log(`Entry ${index + 1}:`);
      console.log(`  Time: ${data.timestamp}`);
      console.log(`  Body:`, JSON.stringify(data.body, null, 2));
      console.log(`  Query:`, JSON.stringify(data.query, null, 2));
      console.log('');
    } catch (error) {
      console.log(`Entry ${index + 1}: (parse error)`);
      console.log(entry.substring(0, 200));
      console.log('');
    }
  });

  console.log('========================================');
  console.log(`Total entries: ${lines.length}`);
  console.log('========================================\n');
}

checkWebhookLogs();
