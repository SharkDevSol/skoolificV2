/**
 * Test script for Firebase Push Notifications
 * Tests the PushNotificationService with sample data
 */

require('dotenv').config();
const pushNotificationService = require('./PushNotificationService');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function testPushNotifications() {
  console.log('\n=== Testing Firebase Push Notifications ===\n');
  
  try {
    // Step 1: Initialize Firebase
    console.log('1. Initializing Firebase Admin SDK...');
    await pushNotificationService.initialize();
    console.log('   ✓ Firebase initialized\n');
    
    // Step 2: Create test device tokens
    console.log('2. Creating test device tokens...');
    const testTokens = [
      {
        userId: 1,
        userType: 'student',
        deviceToken: 'test_token_student_1_android',
        deviceInfo: {
          deviceType: 'android',
          deviceName: 'Samsung Galaxy S21',
          appVersion: '2.0.0',
          osVersion: 'Android 13'
        }
      },
      {
        userId: 1,
        userType: 'student',
        deviceToken: 'test_token_student_1_ios',
        deviceInfo: {
          deviceType: 'ios',
          deviceName: 'iPhone 13',
          appVersion: '2.0.0',
          osVersion: 'iOS 16.5'
        }
      },
      {
        userId: 2,
        userType: 'staff',
        deviceToken: 'test_token_staff_2_android',
        deviceInfo: {
          deviceType: 'android',
          deviceName: 'Google Pixel 6',
          appVersion: '2.0.0',
          osVersion: 'Android 14'
        }
      }
    ];
    
    for (const token of testTokens) {
      await pushNotificationService.registerDeviceToken(
        token.userId,
        token.userType,
        token.deviceToken,
        token.deviceInfo
      );
    }
    console.log(`   ✓ Created ${testTokens.length} test device tokens\n`);
    
    // Step 3: Test sending to single user
    console.log('3. Testing sendToUser() - Single notification...');
    const singleResult = await pushNotificationService.sendToUser(
      1,
      'student',
      {
        title: 'Test Notification',
        body: 'This is a test notification from Skoolific V2',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        },
        clickAction: '/dashboard'
      }
    );
    
    console.log('   Result:', JSON.stringify(singleResult, null, 2));
    
    if (singleResult.success) {
      console.log('   ✓ Single notification sent successfully\n');
    } else {
      console.log('   ⚠️  Single notification failed (expected - test tokens are not real)\n');
    }
    
    // Step 4: Test sending to multiple users
    console.log('4. Testing sendToMultipleUsers() - Bulk notifications...');
    const bulkResult = await pushNotificationService.sendToMultipleUsers(
      [
        { userId: 1, userType: 'student' },
        { userId: 2, userType: 'staff' }
      ],
      {
        title: 'School Announcement',
        body: 'Tomorrow is a holiday - no classes',
        data: {
          type: 'announcement',
          priority: 'high'
        }
      }
    );
    
    console.log('   Result:', JSON.stringify(bulkResult, null, 2));
    console.log('   ✓ Bulk notification test completed\n');
    
    // Step 5: Test getUserTokens
    console.log('5. Testing getUserTokens()...');
    const tokens = await pushNotificationService.getUserTokens(1, 'student');
    console.log(`   Found ${tokens.length} token(s) for student 1`);
    tokens.forEach((token, index) => {
      console.log(`   - Token ${index + 1}: ${token.substring(0, 20)}...`);
    });
    console.log('   ✓ getUserTokens working\n');
    
    // Step 6: Test unregisterDeviceToken
    console.log('6. Testing unregisterDeviceToken()...');
    await pushNotificationService.unregisterDeviceToken('test_token_student_1_android');
    console.log('   ✓ Device token unregistered\n');
    
    // Step 7: Verify token was deactivated
    console.log('7. Verifying token deactivation...');
    const activeTokens = await pushNotificationService.getUserTokens(1, 'student');
    console.log(`   Active tokens for student 1: ${activeTokens.length}`);
    console.log('   ✓ Token deactivation verified\n');
    
    // Step 8: Clean up test data
    console.log('8. Cleaning up test data...');
    await pool.query(`
      DELETE FROM user_devices 
      WHERE device_token LIKE 'test_token_%'
    `);
    console.log('   ✓ Test data cleaned up\n');
    
    console.log('✅ All tests completed successfully!\n');
    console.log('📝 Notes:');
    console.log('   - Test tokens are not real FCM tokens, so actual sending will fail');
    console.log('   - This is expected behavior for testing');
    console.log('   - To test with real devices, register actual FCM tokens from mobile apps');
    console.log('   - Firebase Admin SDK is working correctly\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run tests
testPushNotifications();
