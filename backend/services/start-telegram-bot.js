/**
 * Telegram Bot Startup Script
 * Starts the Skoolific Telegram bot for credential retrieval
 */

require('dotenv').config();
const telegramBotService = require('./TelegramBotService');

async function startBot() {
  console.log('\n🤖 Starting Skoolific Telegram Bot...\n');

  try {
    // Get bot token from environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN not found in .env file');
      console.error('   Please add: TELEGRAM_BOT_TOKEN=your_bot_token');
      process.exit(1);
    }

    // Initialize bot
    await telegramBotService.initialize(botToken);

    console.log('\n✅ Telegram Bot is running!');
    console.log('   Bot link: https://t.me/skoolific_credentials_bot');
    console.log('   Press Ctrl+C to stop\n');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Stopping Telegram Bot...');
      await telegramBotService.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Stopping Telegram Bot...');
      await telegramBotService.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ Failed to start Telegram Bot:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Start the bot
startBot();
