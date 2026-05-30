/**
 * Test Telegram Bot Notification Functionality
 * 
 * This script tests sending notifications to users via Telegram bot.
 * 
 * Prerequisites:
 * 1. Master database must be set up
 * 2. Telegram bot must be running
 * 3. User must have used the bot to get credentials (chat ID saved)
 * 
 * Usage:
 *   node services/test-telegram-notifications.js
 */

require('dotenv').config();
const telegramBotService = require('./TelegramBotService');

async function testNotifications() {
  console.log('\n📱 Testing Telegram Bot Notifications...\n');

  try {
    // Initialize bot
    await telegramBotService.initialize(process.env.TELEGRAM_BOT_TOKEN);
    console.log('✅ Bot initialized\n');

    // Test 1: Get chat ID by phone number
    console.log('Test 1: Get chat ID by phone number');
    console.log('   Testing with a sample phone number...');
    
    // Replace with actual phone number from your database
    const testPhone = '+251912345678'; // Change this to a real phone number
    const chatId = await telegramBotService.getChatIdByPhone(
      testPhone,
      'student',
      'skoolific' // Change to your database name
    );

    if (chatId) {
      console.log(`   ✓ Found chat ID: ${chatId}\n`);
    } else {
      console.log('   ⚠️  No chat ID found (user may not have used the bot yet)\n');
    }

    // Test 2: Send notification to single user
    console.log('Test 2: Send notification to single user');
    
    const message = `
🔔 *Test Notification*

This is a test notification from Skoolific Bot.

If you receive this message, the notification system is working correctly! ✅

*Test Details:*
- Time: ${new Date().toLocaleString()}
- Type: System Test
- Status: Success

Thank you for using Skoolific! 🎓
    `;

    const success = await telegramBotService.sendNotification(
      testPhone,
      'student',
      'skoolific',
      message
    );

    if (success) {
      console.log('   ✓ Notification sent successfully\n');
    } else {
      console.log('   ⚠️  Failed to send notification (user may not have chat ID)\n');
    }

    // Test 3: Send bulk notification
    console.log('Test 3: Send bulk notification');
    
    const users = [
      { phoneNumber: testPhone, userType: 'student', databaseName: 'skoolific' },
      // Add more users here for bulk testing
    ];

    const bulkMessage = `
📢 *Bulk Notification Test*

This is a bulk notification test from Skoolific Bot.

All users in the test group should receive this message.

*Test Time:* ${new Date().toLocaleString()}

Thank you! 🎓
    `;

    const result = await telegramBotService.sendBulkNotification(users, bulkMessage);
    console.log(`   ✓ Bulk notification complete: ${result.sent} sent, ${result.failed} failed\n`);

    // Test 4: Send notification with custom formatting
    console.log('Test 4: Send notification with custom formatting');
    
    const formattedMessage = `
🎯 *Exam Notification*

Dear Student,

Your exam has been published and is now available.

*Exam Details:*
📚 Subject: Mathematics
📅 Date: ${new Date().toLocaleDateString()}
⏰ Duration: 60 minutes
📝 Questions: 20

*Instructions:*
1. Click the link below to start the exam
2. Complete all questions before time expires
3. Submit your answers before the deadline

Good luck! 💪

[Start Exam](https://skoolific.com/exams/123)
    `;

    const formatted = await telegramBotService.sendNotification(
      testPhone,
      'student',
      'skoolific',
      formattedMessage,
      { parse_mode: 'Markdown' }
    );

    if (formatted) {
      console.log('   ✓ Formatted notification sent\n');
    } else {
      console.log('   ⚠️  Failed to send formatted notification\n');
    }

    console.log('✅ All tests complete!\n');
    console.log('📝 Notes:');
    console.log('   - Users must use the bot first to save their chat ID');
    console.log('   - Update testPhone variable with real phone numbers');
    console.log('   - Check Telegram to verify messages were received\n');

    // Stop bot
    await telegramBotService.stop();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testNotifications();
