/**
 * Test SMS Service
 * 
 * This script tests SMS sending functionality.
 * 
 * Prerequisites:
 * 1. SMS provider credentials configured in .env
 * 2. For Africa's Talking: Use sandbox for testing (free)
 * 3. For Twilio: Add credits to account
 * 
 * Usage:
 *   node services/test-sms.js
 */

require('dotenv').config();
const smsService = require('./SMSService');

async function testSMS() {
  console.log('\n📱 Testing SMS Service...\n');

  try {
    // Initialize SMS service
    await smsService.initialize();
    console.log('');

    // Test phone number (replace with your phone number)
    const testPhone = '+251912345678'; // Change this to your phone number
    
    console.log('⚠️  IMPORTANT: Update testPhone variable with your actual phone number\n');

    // Test 1: Send single SMS
    console.log('Test 1: Send single SMS');
    console.log(`   Sending to: ${testPhone}`);
    
    const message = `
🎓 Skoolific SMS Test

This is a test message from Skoolific SMS Service.

Time: ${new Date().toLocaleString()}

If you receive this, SMS is working! ✅
    `.trim();

    const result = await smsService.sendSMS(testPhone, message);

    if (result.success) {
      console.log(`   ✓ SMS sent successfully`);
      console.log(`   Message ID: ${result.messageId}`);
      if (result.cost) {
        console.log(`   Cost: ${result.cost}`);
      }
    } else {
      console.log(`   ✗ Failed to send SMS: ${result.error}`);
    }
    console.log('');

    // Test 2: Send bulk SMS
    console.log('Test 2: Send bulk SMS');
    
    const phoneNumbers = [
      testPhone,
      // Add more phone numbers for bulk testing
    ];

    const bulkMessage = `
📢 Skoolific Bulk SMS Test

This is a bulk SMS test.

All recipients should receive this message.

Time: ${new Date().toLocaleString()}
    `.trim();

    const bulkResult = await smsService.sendBulkSMS(phoneNumbers, bulkMessage);

    console.log(`   ✓ Bulk SMS complete`);
    console.log(`   Sent: ${bulkResult.sent}`);
    console.log(`   Failed: ${bulkResult.failed}`);
    
    if (bulkResult.results) {
      console.log('   Results:');
      for (const r of bulkResult.results) {
        if (r.success) {
          console.log(`      ✓ ${r.phoneNumber} - ${r.messageId}`);
        } else {
          console.log(`      ✗ ${r.phoneNumber} - ${r.error}`);
        }
      }
    }
    console.log('');

    // Test 3: Phone number normalization
    console.log('Test 3: Phone number normalization');
    
    const testNumbers = [
      '+251912345678',
      '0912345678',
      '912345678',
      '+251 91 234 5678',
      '09-12-34-56-78'
    ];

    console.log('   Testing different phone formats:');
    for (const num of testNumbers) {
      const normalized = smsService.normalizePhoneNumber(num);
      console.log(`      ${num} → ${normalized}`);
    }
    console.log('');

    // Test 4: Check balance (Africa's Talking only)
    if (process.env.SMS_PROVIDER === 'africastalking') {
      console.log('Test 4: Check account balance');
      
      const balance = await smsService.checkBalance();
      
      if (balance.error) {
        console.log(`   ⚠️  ${balance.error}`);
      } else {
        console.log(`   Balance: ${balance.balance} ${balance.currency}`);
      }
      console.log('');
    }

    console.log('✅ All tests complete!\n');
    console.log('📝 Notes:');
    console.log('   - Update testPhone with your actual phone number');
    console.log('   - Check your phone to verify SMS was received');
    console.log('   - For Africa\'s Talking sandbox: Only works with registered test numbers');
    console.log('   - For production: Add credits to your account\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n📝 Troubleshooting:');
    console.log('   1. Check SMS_PROVIDER in .env (africastalking or twilio)');
    console.log('   2. Check API credentials in .env');
    console.log('   3. For Africa\'s Talking: Use sandbox for testing');
    console.log('   4. For Twilio: Ensure account has credits\n');
    process.exit(1);
  }
}

// Run tests
testSMS();
