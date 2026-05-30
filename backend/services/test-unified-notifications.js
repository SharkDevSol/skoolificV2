/**
 * Test Unified Notification Service
 * 
 * This script tests the unified notification service that sends
 * notifications through multiple channels (Push, Telegram, SMS).
 * 
 * Prerequisites:
 * 1. Migration 017 must be run (notifications_log table)
 * 2. All notification services configured (Firebase, Telegram, SMS)
 * 3. Test user must exist in database
 * 
 * Usage:
 *   node services/test-unified-notifications.js
 */

require('dotenv').config();
const notificationService = require('./NotificationService');

async function testUnifiedNotifications() {
  console.log('\n🔔 Testing Unified Notification Service...\n');

  try {
    // Initialize service
    await notificationService.initialize();
    console.log('');

    // Test configuration
    const testUserId = 1; // Change to actual user ID
    const testUserType = 'student'; // student, staff, or guardian
    const testDatabase = 'skoolific'; // Change to your database name

    console.log('⚠️  IMPORTANT: Update test configuration with actual values\n');
    console.log(`Test User ID: ${testUserId}`);
    console.log(`Test User Type: ${testUserType}`);
    console.log(`Test Database: ${testDatabase}\n`);

    // Test 1: Send generic notification
    console.log('Test 1: Send generic notification (all channels)');
    
    const result1 = await notificationService.sendNotification(
      testUserId,
      testUserType,
      testDatabase,
      'test',
      '🔔 Test Notification',
      'This is a test notification from the unified notification service. If you receive this, all channels are working!',
      { data: { test: true } }
    );

    console.log(`   Success: ${result1.success}`);
    console.log(`   Results:`);
    console.log(`      Push: ${result1.results.push ? '✓' : '✗'}`);
    console.log(`      Telegram: ${result1.results.telegram ? '✓' : '✗'}`);
    console.log(`      SMS: ${result1.results.sms ? '✓' : '✗'}`);
    console.log('');

    // Test 2: Send payment reminder
    console.log('Test 2: Send payment reminder');
    
    const result2 = await notificationService.sendPaymentReminder(
      testUserId,
      testDatabase,
      500, // Amount in ETB
      '2024-12-31' // Due date
    );

    console.log(`   Success: ${result2.success}`);
    if (result2.results) {
      console.log(`   Channels:`);
      console.log(`      Push: ${result2.results.push ? '✓' : '✗'}`);
      console.log(`      Telegram: ${result2.results.telegram ? '✓' : '✗'}`);
      console.log(`      SMS: ${result2.results.sms ? '✓' : '✗'}`);
    }
    console.log('');

    // Test 3: Send absence alert
    console.log('Test 3: Send absence alert (to guardian)');
    
    const result3 = await notificationService.sendAbsenceAlert(
      testUserId,
      testDatabase,
      new Date().toLocaleDateString()
    );

    console.log(`   Success: ${result3.success}`);
    console.log('');

    // Test 4: Send exam published notification
    console.log('Test 4: Send exam published notification');
    console.log('   Note: This requires actual exam and class IDs');
    console.log('   Skipping for now...\n');

    // Test 5: Send report card available
    console.log('Test 5: Send report card available');
    
    const result5 = await notificationService.sendReportCardAvailable(
      testUserId,
      testDatabase,
      'First Term',
      '2017 E.C.'
    );

    console.log(`   Success: ${result5.success}`);
    console.log('');

    // Test 6: Send exam repeat request
    console.log('Test 6: Send exam repeat request (to admin)');
    console.log('   Note: This requires actual exam ID and admin users');
    console.log('   Skipping for now...\n');

    console.log('✅ All tests complete!\n');
    console.log('📝 Notes:');
    console.log('   - Update test configuration with actual user ID and database');
    console.log('   - Check all channels (app, Telegram, SMS) to verify delivery');
    console.log('   - Check notifications_log table for logged notifications');
    console.log('   - Some tests skipped (require actual data)\n');

    console.log('📊 Check Notification Logs:');
    console.log('   psql -U postgres -d skoolific -c "SELECT * FROM notifications_log ORDER BY created_at DESC LIMIT 10;"\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n📝 Troubleshooting:');
    console.log('   1. Run migration 017: node database/run-migration.js 017');
    console.log('   2. Check all service credentials in .env');
    console.log('   3. Ensure test user exists in database');
    console.log('   4. Check database connection\n');
    process.exit(1);
  }
}

// Run tests
testUnifiedNotifications();
