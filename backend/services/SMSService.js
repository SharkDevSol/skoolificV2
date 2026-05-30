/**
 * SMS Service for Skoolific
 * 
 * Supports multiple SMS providers:
 * - Africa's Talking (recommended for Ethiopia)
 * - Twilio (international)
 * 
 * Features:
 * - Send single SMS
 * - Send bulk SMS
 * - Provider abstraction
 * - Error handling and logging
 * - Delivery status tracking
 */

const AfricasTalking = require('africastalking');

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'africastalking';
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize SMS provider
   */
  async initialize() {
    try {
      if (this.provider === 'africastalking') {
        await this.initializeAfricasTalking();
      } else if (this.provider === 'twilio') {
        await this.initializeTwilio();
      } else {
        throw new Error(`Unsupported SMS provider: ${this.provider}`);
      }

      this.initialized = true;
      console.log(`✅ SMS Service initialized (Provider: ${this.provider})`);
    } catch (error) {
      console.error('❌ Failed to initialize SMS Service:', error.message);
      throw error;
    }
  }

  /**
   * Initialize Africa's Talking
   */
  async initializeAfricasTalking() {
    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;

    if (!username || !apiKey) {
      throw new Error('Africa\'s Talking credentials not configured. Set AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY in .env');
    }

    this.client = AfricasTalking({
      apiKey: apiKey,
      username: username
    });

    this.sms = this.client.SMS;
    console.log('   ✓ Africa\'s Talking initialized');
  }

  /**
   * Initialize Twilio
   */
  async initializeTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in .env');
    }

    // Lazy load Twilio (only if needed)
    const twilio = require('twilio');
    this.client = twilio(accountSid, authToken);
    this.twilioFromNumber = fromNumber;
    console.log('   ✓ Twilio initialized');
  }

  /**
   * Send SMS to single recipient
   * @param {string} phoneNumber - Recipient phone number (E.164 format recommended)
   * @param {string} message - SMS message content
   * @param {object} options - Additional options
   * @returns {object} - {success: boolean, messageId: string, error: string}
   */
  async sendSMS(phoneNumber, message, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Send via appropriate provider
      let result;
      if (this.provider === 'africastalking') {
        result = await this.sendViaAfricasTalking([normalizedPhone], message, options);
      } else if (this.provider === 'twilio') {
        result = await this.sendViaTwilio(normalizedPhone, message, options);
      }

      if (result.success) {
        console.log(`✅ SMS sent to ${phoneNumber} (ID: ${result.messageId})`);
      } else {
        console.error(`❌ Failed to send SMS to ${phoneNumber}: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send SMS to multiple recipients
   * @param {Array<string>} phoneNumbers - Array of phone numbers
   * @param {string} message - SMS message content
   * @param {object} options - Additional options
   * @returns {object} - {sent: number, failed: number, results: Array}
   */
  async sendBulkSMS(phoneNumbers, message, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Normalize all phone numbers
      const normalizedPhones = phoneNumbers.map(phone => this.normalizePhoneNumber(phone));

      // Send via appropriate provider
      let result;
      if (this.provider === 'africastalking') {
        result = await this.sendViaAfricasTalking(normalizedPhones, message, options);
      } else if (this.provider === 'twilio') {
        // Twilio doesn't have native bulk SMS, send individually
        result = await this.sendBulkViaTwilio(normalizedPhones, message, options);
      }

      console.log(`📊 Bulk SMS complete: ${result.sent} sent, ${result.failed} failed`);
      return result;
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      return {
        sent: 0,
        failed: phoneNumbers.length,
        error: error.message
      };
    }
  }

  /**
   * Send SMS via Africa's Talking
   * @param {Array<string>} phoneNumbers - Array of phone numbers
   * @param {string} message - SMS message
   * @param {object} options - Additional options
   * @returns {object} - Result object
   */
  async sendViaAfricasTalking(phoneNumbers, message, options = {}) {
    try {
      const params = {
        to: phoneNumbers,
        message: message,
        from: options.from || process.env.AFRICASTALKING_SENDER_ID || null
      };

      const response = await this.sms.send(params);

      // Parse response
      const recipients = response.SMSMessageData.Recipients;
      let sent = 0;
      let failed = 0;
      const results = [];

      for (const recipient of recipients) {
        if (recipient.status === 'Success') {
          sent++;
          results.push({
            phoneNumber: recipient.number,
            success: true,
            messageId: recipient.messageId,
            cost: recipient.cost
          });
        } else {
          failed++;
          results.push({
            phoneNumber: recipient.number,
            success: false,
            error: recipient.status
          });
        }
      }

      return {
        success: sent > 0,
        sent: sent,
        failed: failed,
        results: results,
        messageId: recipients[0]?.messageId
      };
    } catch (error) {
      console.error('Africa\'s Talking error:', error);
      return {
        success: false,
        sent: 0,
        failed: phoneNumbers.length,
        error: error.message
      };
    }
  }

  /**
   * Send SMS via Twilio
   * @param {string} phoneNumber - Phone number
   * @param {string} message - SMS message
   * @param {object} options - Additional options
   * @returns {object} - Result object
   */
  async sendViaTwilio(phoneNumber, message, options = {}) {
    try {
      const response = await this.client.messages.create({
        body: message,
        from: options.from || this.twilioFromNumber,
        to: phoneNumber
      });

      return {
        success: true,
        messageId: response.sid,
        status: response.status
      };
    } catch (error) {
      console.error('Twilio error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send bulk SMS via Twilio (individual sends)
   * @param {Array<string>} phoneNumbers - Array of phone numbers
   * @param {string} message - SMS message
   * @param {object} options - Additional options
   * @returns {object} - Result object
   */
  async sendBulkViaTwilio(phoneNumbers, message, options = {}) {
    let sent = 0;
    let failed = 0;
    const results = [];

    for (const phoneNumber of phoneNumbers) {
      const result = await this.sendViaTwilio(phoneNumber, message, options);
      
      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      results.push({
        phoneNumber: phoneNumber,
        ...result
      });

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: sent > 0,
      sent: sent,
      failed: failed,
      results: results
    };
  }

  /**
   * Normalize phone number to E.164 format
   * @param {string} phoneNumber - Phone number in any format
   * @returns {string} - Normalized phone number
   */
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';

    // Remove all non-digit characters
    let digits = phoneNumber.replace(/\D/g, '');

    // Handle Ethiopian numbers
    if (digits.startsWith('251')) {
      // Already has country code
      return '+' + digits;
    } else if (digits.startsWith('0')) {
      // Remove leading 0 and add country code
      return '+251' + digits.substring(1);
    } else if (digits.length === 9) {
      // Just the 9-digit number, add country code
      return '+251' + digits;
    }

    // For other countries, assume it's already in correct format
    if (!digits.startsWith('+')) {
      return '+' + digits;
    }

    return digits;
  }

  /**
   * Get SMS delivery status (Africa's Talking only)
   * @param {string} messageId - Message ID from send response
   * @returns {object} - Delivery status
   */
  async getDeliveryStatus(messageId) {
    if (this.provider !== 'africastalking') {
      return { error: 'Delivery status only available for Africa\'s Talking' };
    }

    try {
      // Note: Africa's Talking doesn't have a direct API for this
      // You would typically use webhooks for delivery reports
      return {
        messageId: messageId,
        note: 'Use webhooks for delivery reports'
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  /**
   * Check account balance (Africa's Talking only)
   * @returns {object} - Account balance
   */
  async checkBalance() {
    if (this.provider !== 'africastalking') {
      return { error: 'Balance check only available for Africa\'s Talking' };
    }

    try {
      const application = this.client.APPLICATION;
      const balance = await application.fetchApplicationData();
      
      return {
        balance: balance.UserData.balance,
        currency: 'USD'
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}

// Export singleton instance
const smsService = new SMSService();
module.exports = smsService;
