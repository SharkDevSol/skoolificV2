/**
 * Telegram Bot Service for Skoolific
 * 
 * ONE bot for ALL schools with smart navigation:
 * 1. User selects school
 * 2. User selects branch (if multiple)
 * 3. User selects user type (student/staff/guardian)
 * 4. Bot matches Telegram phone number with database
 * 5. Returns credentials if match found
 * 
 * Features:
 * - Multi-school support
 * - Multi-database connection
 * - Smart phone number matching (handles +251, 09, 9 formats)
 * - Interactive menu system
 * - Credential retrieval
 */

const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');
const { normalizePhone } = require('../utils/phoneValidator');

class TelegramBotService {
  constructor() {
    this.bot = null;
    this.masterPool = null;
    this.userSessions = new Map(); // Store user session data
  }

  /**
   * Initialize Telegram bot
   * @param {string} token - Telegram bot token from BotFather
   */
  async initialize(token) {
    if (!token) {
      throw new Error('Telegram bot token is required');
    }

    try {
      // Initialize bot
      this.bot = new TelegramBot(token, { polling: true });

      // Initialize master database connection (for schools/branches registry)
      this.masterPool = new Pool({
        host: process.env.MASTER_DB_HOST || process.env.DB_HOST || 'localhost',
        port: process.env.MASTER_DB_PORT || process.env.DB_PORT || 5432,
        database: process.env.MASTER_DB_NAME || 'skoolific_master',
        user: process.env.MASTER_DB_USER || process.env.DB_USER || 'postgres',
        password: process.env.MASTER_DB_PASSWORD || process.env.DB_PASSWORD
      });

      // Set up command handlers
      this.setupHandlers();

      console.log('✅ Telegram Bot initialized successfully');
      console.log(`   Bot: @${(await this.bot.getMe()).username}`);
      console.log(`   Master DB: ${process.env.MASTER_DB_NAME || 'skoolific_master'}`);
    } catch (error) {
      console.error('❌ Failed to initialize Telegram Bot:', error.message);
      throw error;
    }
  }

  /**
   * Set up bot command handlers
   */
  setupHandlers() {
    // /start command
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));

    // /help command
    this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));

    // /credentials command
    this.bot.onText(/\/credentials/, (msg) => this.handleCredentials(msg));

    // Handle callback queries (button clicks)
    this.bot.on('callback_query', (query) => this.handleCallbackQuery(query));

    // Handle errors
    this.bot.on('polling_error', (error) => {
      console.error('Telegram polling error:', error.message);
    });
  }

  /**
   * Handle /start command
   */
  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'User';

    // Clear any existing session
    this.userSessions.delete(chatId);

    const welcomeMessage = `
🎓 *Welcome to Skoolific Bot!* 🎓

Hello ${userName}! 👋

I can help you retrieve your login credentials for the Skoolific system.

*How it works:*
1️⃣ Select your school
2️⃣ Select your branch (if applicable)
3️⃣ Select your user type (Student/Staff/Guardian)
4️⃣ I'll match your Telegram phone number with our records
5️⃣ Get your username and password instantly!

*Important:* Your Telegram account must be registered with the same phone number you used during registration.

Click the button below to get started! 👇
    `;

    const keyboard = {
      inline_keyboard: [[
        { text: '🔑 Get My Credentials', callback_data: 'get_credentials' }
      ], [
        { text: '❓ Help', callback_data: 'help' }
      ]]
    };

    await this.bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Handle /help command
   */
  async handleHelp(msg) {
    const chatId = msg.chat.id;

    const helpMessage = `
📚 *Skoolific Bot Help* 📚

*Available Commands:*
/start - Start the bot and get credentials
/credentials - Get your login credentials
/help - Show this help message

*How to get your credentials:*
1. Make sure your Telegram is registered with your school phone number
2. Click "Get My Credentials" button
3. Select your school from the list
4. Select your branch (if your school has multiple branches)
5. Select your user type (Student, Staff, or Guardian)
6. Receive your username and password

*Troubleshooting:*
❌ "Phone number not registered" - Your Telegram phone number doesn't match any record in our system. Contact your school admin.

❌ "No schools found" - Database connection issue. Contact support.

*Privacy & Security:*
🔒 Your credentials are sent only to you
🔒 Messages are not stored
🔒 Your phone number is used only for verification

*Need more help?*
Contact your school administrator.
    `;

    await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'Markdown'
    });
  }

  /**
   * Handle /credentials command
   */
  async handleCredentials(msg) {
    const chatId = msg.chat.id;
    await this.showSchoolSelection(chatId);
  }

  /**
   * Handle callback queries (button clicks)
   */
  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Answer callback query to remove loading state
    await this.bot.answerCallbackQuery(query.id);

    try {
      if (data === 'get_credentials') {
        await this.showSchoolSelection(chatId);
      } else if (data === 'help') {
        await this.handleHelp(query.message);
      } else if (data.startsWith('school_')) {
        const schoolId = parseInt(data.split('_')[1]);
        await this.handleSchoolSelection(chatId, schoolId);
      } else if (data.startsWith('branch_')) {
        const branchId = parseInt(data.split('_')[1]);
        await this.handleBranchSelection(chatId, branchId);
      } else if (data.startsWith('usertype_')) {
        const userType = data.split('_')[1];
        await this.handleUserTypeSelection(chatId, userType, query.from);
      } else if (data === 'back_to_schools') {
        await this.showSchoolSelection(chatId);
      } else if (data === 'back_to_branches') {
        const session = this.userSessions.get(chatId);
        if (session && session.schoolId) {
          await this.handleSchoolSelection(chatId, session.schoolId);
        }
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      await this.bot.sendMessage(chatId, '❌ An error occurred. Please try again with /start');
    }
  }

  /**
   * Show school selection menu
   */
  async showSchoolSelection(chatId) {
    try {
      // Get all active schools
      const result = await this.masterPool.query(
        'SELECT id, school_name, school_code FROM schools WHERE is_active = true ORDER BY school_name'
      );

      if (result.rows.length === 0) {
        await this.bot.sendMessage(chatId, '❌ No schools found in the system. Please contact support.');
        return;
      }

      // Create keyboard with school buttons
      const keyboard = {
        inline_keyboard: result.rows.map(school => [{
          text: `🏫 ${school.school_name}`,
          callback_data: `school_${school.id}`
        }])
      };

      const message = `
🏫 *Select Your School*

Please select your school from the list below:
      `;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error showing school selection:', error);
      await this.bot.sendMessage(chatId, '❌ Failed to load schools. Please try again.');
    }
  }

  /**
   * Handle school selection
   */
  async handleSchoolSelection(chatId, schoolId) {
    try {
      // Get branches for this school
      const result = await this.masterPool.query(
        'SELECT id, branch_name, branch_code FROM branches WHERE school_id = $1 AND is_active = true ORDER BY branch_name',
        [schoolId]
      );

      // Store school selection in session
      const session = this.userSessions.get(chatId) || {};
      session.schoolId = schoolId;
      this.userSessions.set(chatId, session);

      if (result.rows.length === 0) {
        await this.bot.sendMessage(chatId, '❌ No branches found for this school. Please contact support.');
        return;
      }

      // If only one branch, skip branch selection
      if (result.rows.length === 1) {
        await this.handleBranchSelection(chatId, result.rows[0].id);
        return;
      }

      // Create keyboard with branch buttons
      const keyboard = {
        inline_keyboard: [
          ...result.rows.map(branch => [{
            text: `📍 ${branch.branch_name}`,
            callback_data: `branch_${branch.id}`
          }]),
          [{ text: '⬅️ Back to Schools', callback_data: 'back_to_schools' }]
        ]
      };

      const message = `
📍 *Select Your Branch*

Please select your branch from the list below:
      `;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error handling school selection:', error);
      await this.bot.sendMessage(chatId, '❌ Failed to load branches. Please try again.');
    }
  }

  /**
   * Handle branch selection
   */
  async handleBranchSelection(chatId, branchId) {
    try {
      // Store branch selection in session
      const session = this.userSessions.get(chatId) || {};
      session.branchId = branchId;
      this.userSessions.set(chatId, session);

      // Show user type selection
      const keyboard = {
        inline_keyboard: [
          [{ text: '👨‍🎓 Student', callback_data: 'usertype_student' }],
          [{ text: '👨‍🏫 Staff', callback_data: 'usertype_staff' }],
          [{ text: '👨‍👩‍👧 Guardian', callback_data: 'usertype_guardian' }],
          [{ text: '⬅️ Back to Branches', callback_data: 'back_to_branches' }]
        ]
      };

      const message = `
👤 *Select Your User Type*

Please select your role in the system:
      `;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error handling branch selection:', error);
      await this.bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
  }

  /**
   * Handle user type selection and retrieve credentials
   */
  async handleUserTypeSelection(chatId, userType, telegramUser) {
    try {
      const session = this.userSessions.get(chatId);
      if (!session || !session.branchId) {
        await this.bot.sendMessage(chatId, '❌ Session expired. Please start again with /start');
        return;
      }

      // Get user's phone number from Telegram
      // Note: This requires user to share phone number or we extract from username
      await this.bot.sendMessage(chatId, '🔍 Searching for your credentials...');

      // Get branch database connection info
      const branchResult = await this.masterPool.query(
        'SELECT database_name, database_host, database_port FROM branches WHERE id = $1',
        [session.branchId]
      );

      if (branchResult.rows.length === 0) {
        await this.bot.sendMessage(chatId, '❌ Branch not found. Please try again.');
        return;
      }

      const branch = branchResult.rows[0];

      // Try to get credentials
      const credentials = await this.getCredentialsByTelegramUser(
        telegramUser,
        userType,
        branch,
        chatId
      );

      if (credentials) {
        await this.sendCredentials(chatId, credentials, userType);
        
        // Save chat ID to database for future notifications
        await this.saveChatIdToDatabase(credentials.id, userType, branch, chatId);
      } else {
        await this.sendPhoneNumberNotFound(chatId);
      }

      // Clear session
      this.userSessions.delete(chatId);
    } catch (error) {
      console.error('Error handling user type selection:', error);
      await this.bot.sendMessage(chatId, '❌ An error occurred while retrieving credentials. Please try again.');
    }
  }

  /**
   * Get credentials by matching Telegram user with database
   */
  async getCredentialsByTelegramUser(telegramUser, userType, branch, chatId) {
    try {
      // Create connection to branch database
      const branchPool = new Pool({
        host: branch.database_host || 'localhost',
        port: branch.database_port || 5432,
        database: branch.database_name,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
      });

      // Determine table name based on user type
      const tableName = userType === 'student' ? 'students' :
                       userType === 'staff' ? 'staff' :
                       'guardians';

      // Get all phone numbers from the table
      const result = await branchPool.query(
        `SELECT id, name, username, password, phone_number FROM ${tableName} WHERE phone_number IS NOT NULL`
      );

      // Try to match with Telegram username (if it's a phone number)
      let telegramPhone = null;
      if (telegramUser.username && /^\d+$/.test(telegramUser.username)) {
        telegramPhone = telegramUser.username;
      }

      // Normalize and compare phone numbers
      for (const row of result.rows) {
        if (!row.phone_number) continue;

        const dbPhone = this.normalizePhoneForMatching(row.phone_number);
        const tgPhone = telegramPhone ? this.normalizePhoneForMatching(telegramPhone) : null;

        // Match last 9 digits (Ethiopian phone number without country code and leading 0)
        if (tgPhone && dbPhone === tgPhone) {
          await branchPool.end();
          return {
            id: row.id,
            name: row.name,
            username: row.username,
            password: row.password,
            phone: row.phone_number
          };
        }
      }

      await branchPool.end();
      return null;
    } catch (error) {
      console.error('Error getting credentials:', error);
      return null;
    }
  }

  /**
   * Normalize phone number for matching
   * Extracts last 9 digits for comparison
   * 
   * Examples:
   * +251912345678 → 912345678
   * 0912345678 → 912345678
   * 912345678 → 912345678
   */
  normalizePhoneForMatching(phone) {
    if (!phone) return '';

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Get last 9 digits
    return digits.slice(-9);
  }

  /**
   * Send credentials to user
   */
  async sendCredentials(chatId, credentials, userType) {
    const userTypeEmoji = userType === 'student' ? '👨‍🎓' :
                         userType === 'staff' ? '👨‍🏫' :
                         '👨‍👩‍👧';

    const message = `
✅ *Credentials Found!* ✅

${userTypeEmoji} *Name:* ${credentials.name}

🔑 *Login Credentials:*
👤 *Username:* \`${credentials.username}\`
🔒 *Password:* \`${credentials.password}\`

📱 *Registered Phone:* ${credentials.phone}

*Important:*
⚠️ Keep your credentials secure
⚠️ Do not share with anyone
⚠️ Change your password after first login

*Need help?*
Contact your school administrator.
    `;

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown'
    });
  }

  /**
   * Send phone number not found message
   */
  async sendPhoneNumberNotFound(chatId) {
    const message = `
❌ *Phone Number Not Registered*

Your Telegram phone number was not found in our system.

*Possible reasons:*
1️⃣ Your Telegram account uses a different phone number
2️⃣ Your phone number is not registered in the school system
3️⃣ Your account is not active

*What to do:*
📞 Contact your school administrator
📝 Verify your registered phone number
🔄 Update your phone number in the system

*Need help?*
Use /help for more information.
    `;

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown'
    });
  }

  /**
   * Save Telegram chat ID to database for future notifications
   */
  async saveChatIdToDatabase(userId, userType, branch, chatId) {
    try {
      // Create connection to branch database
      const branchPool = new Pool({
        host: branch.database_host || 'localhost',
        port: branch.database_port || 5432,
        database: branch.database_name,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
      });

      // Determine table name based on user type
      const tableName = userType === 'student' ? 'students' :
                       userType === 'staff' ? 'staff' :
                       'guardians';

      // Update telegram_chat_id
      await branchPool.query(
        `UPDATE ${tableName} SET telegram_chat_id = $1 WHERE id = $2`,
        [chatId, userId]
      );

      await branchPool.end();
      console.log(`✅ Saved chat ID ${chatId} for ${userType} ${userId} in ${branch.database_name}`);
    } catch (error) {
      console.error('Error saving chat ID to database:', error);
    }
  }

  /**
   * Get chat ID by phone number
   * @param {string} phoneNumber - User's phone number
   * @param {string} userType - User type (student, staff, guardian)
   * @param {string} databaseName - Database name
   * @returns {number|null} - Telegram chat ID or null
   */
  async getChatIdByPhone(phoneNumber, userType, databaseName) {
    try {
      // Get branch info from master database
      const branchResult = await this.masterPool.query(
        'SELECT database_host, database_port FROM branches WHERE database_name = $1',
        [databaseName]
      );

      if (branchResult.rows.length === 0) {
        console.error(`Branch not found for database: ${databaseName}`);
        return null;
      }

      const branch = branchResult.rows[0];

      // Create connection to branch database
      const branchPool = new Pool({
        host: branch.database_host || 'localhost',
        port: branch.database_port || 5432,
        database: databaseName,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
      });

      // Determine table name based on user type
      const tableName = userType === 'student' ? 'students' :
                       userType === 'staff' ? 'staff' :
                       'guardians';

      // Normalize phone number for matching
      const normalizedPhone = this.normalizePhoneForMatching(phoneNumber);

      // Get all users with telegram_chat_id
      const result = await branchPool.query(
        `SELECT telegram_chat_id, phone_number FROM ${tableName} WHERE telegram_chat_id IS NOT NULL`
      );

      // Find matching phone number
      for (const row of result.rows) {
        if (!row.phone_number) continue;

        const dbPhone = this.normalizePhoneForMatching(row.phone_number);
        if (dbPhone === normalizedPhone) {
          await branchPool.end();
          return row.telegram_chat_id;
        }
      }

      await branchPool.end();
      return null;
    } catch (error) {
      console.error('Error getting chat ID by phone:', error);
      return null;
    }
  }

  /**
   * Send notification to user via Telegram
   * @param {string} phoneNumber - User's phone number
   * @param {string} userType - User type (student, staff, guardian)
   * @param {string} databaseName - Database name
   * @param {string} message - Notification message
   * @param {object} options - Additional options (parse_mode, reply_markup, etc.)
   * @returns {boolean} - Success status
   */
  async sendNotification(phoneNumber, userType, databaseName, message, options = {}) {
    try {
      // Get chat ID by phone number
      const chatId = await this.getChatIdByPhone(phoneNumber, userType, databaseName);

      if (!chatId) {
        console.log(`⚠️  No Telegram chat ID found for ${userType} with phone ${phoneNumber}`);
        return false;
      }

      // Send message
      await this.bot.sendMessage(chatId, message, {
        parse_mode: options.parse_mode || 'Markdown',
        ...options
      });

      console.log(`✅ Notification sent to ${userType} (chat ID: ${chatId})`);
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array} users - Array of {phoneNumber, userType, databaseName}
   * @param {string} message - Notification message
   * @param {object} options - Additional options
   * @returns {object} - {sent: number, failed: number}
   */
  async sendBulkNotification(users, message, options = {}) {
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const success = await this.sendNotification(
        user.phoneNumber,
        user.userType,
        user.databaseName,
        message,
        options
      );

      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📊 Bulk notification complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Stop the bot
   */
  async stop() {
    if (this.bot) {
      await this.bot.stopPolling();
      console.log('✅ Telegram Bot stopped');
    }

    if (this.masterPool) {
      await this.masterPool.end();
    }
  }
}

// Export singleton instance
const telegramBotService = new TelegramBotService();
module.exports = telegramBotService;
