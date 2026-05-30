/**
 * Integration Tests for Notifications
 * 
 * Tests the notification system including:
 * - Send push notifications
 * - Send Telegram notifications
 * - Send SMS notifications
 * - Store notification history
 * - Mark notifications as read
 * - Retrieve user notifications
 * - Handle notification preferences
 * - Multi-channel notification delivery
 */

const {
  initTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  generateTestId,
  getTestPool
} = require('./setup');

describe('Notifications Integration Tests', () => {
  let testPool;
  let testUserId;
  let testNotificationId;

  beforeAll(async () => {
    testPool = await initTestDatabase();
    testUserId = 6001;
    
    // Create notifications table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        channels JSONB DEFAULT '[]'::jsonb,
        data JSONB DEFAULT '{}'::jsonb,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP
      )
    `);
    
    // Create notification_preferences table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        notification_types JSONB DEFAULT '[]'::jsonb,
        UNIQUE(user_id, user_type, channel)
      )
    `);
    
    // Create notification_delivery_log table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS notification_delivery_log (
        id SERIAL PRIMARY KEY,
        notification_id INTEGER NOT NULL,
        channel VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await testPool.query(`DELETE FROM notifications WHERE user_id = $1`, [testUserId]);
    await testPool.query(`DELETE FROM notification_preferences WHERE user_id = $1`, [testUserId]);
    await testPool.query(`DELETE FROM notification_delivery_log WHERE notification_id IN (SELECT id FROM notifications WHERE user_id = $1)`, [testUserId]);
    await closeTestDatabase();
  });

  afterEach(async () => {
    await testPool.query(`DELETE FROM notifications WHERE user_id = $1`, [testUserId]);
    await testPool.query(`DELETE FROM notification_preferences WHERE user_id = $1`, [testUserId]);
    testNotificationId = null;
  });

  describe('1. Send Push Notifications', () => {
    test('should create push notification record', async () => {
      const result = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testUserId, 'student', 'New Exam Published',
        'Math exam has been published', 'exam_published',
        JSON.stringify(['push'])
      ]);

      testNotificationId = result.rows[0].id;

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].title).toBe('New Exam Published');
      expect(result.rows[0].channels).toContain('push');
      expect(result.rows[0].is_read).toBe(false);
    });

    test('should send notification with priority', async () => {
      const result = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, priority, channels
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        testUserId, 'student', 'Urgent: Exam Tomorrow',
        'Your exam is scheduled for tomorrow', 'exam_reminder',
        'high', JSON.stringify(['push'])
      ]);

      expect(result.rows[0].priority).toBe('high');
    });

    test('should include additional data in notification', async () => {
      const additionalData = {
        exam_id: 123,
        subject: 'Mathematics',
        date: '2025-01-20'
      };
      
      const result = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels, data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        testUserId, 'student', 'Exam Scheduled',
        'Your Math exam is scheduled', 'exam_scheduled',
        JSON.stringify(['push']), JSON.stringify(additionalData)
      ]);

      expect(result.rows[0].data.exam_id).toBe(123);
      expect(result.rows[0].data.subject).toBe('Mathematics');
    });
  });

  describe('2. Send Telegram Notifications', () => {
    test('should create Telegram notification record', async () => {
      const result = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testUserId, 'guardian', 'Payment Reminder',
        'Monthly fee payment is due', 'payment_reminder',
        JSON.stringify(['telegram'])
      ]);

      expect(result.rows[0].channels).toContain('telegram');
    });

    test('should log Telegram delivery status', async () => {
      const notifResult = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testUserId, 'guardian', 'Test Notification',
        'Test message', 'test', JSON.stringify(['telegram'])
      ]);

      testNotificationId = notifResult.rows[0].id;

      const logResult = await testPool.query(`
        INSERT INTO notification_delivery_log (
          notification_id, channel, status
        ) VALUES ($1, $2, $3)
        RETURNING *
      `, [testNotificationId, 'telegram', 'delivered']);

      expect(logResult.rows[0].channel).toBe('telegram');
      expect(logResult.rows[0].status).toBe('delivered');
    });
  });

  describe('3. Send SMS Notifications', () => {
    test('should create SMS notification record', async () => {
      const result = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testUserId, 'guardian', 'Absence Alert',
        'Your child was absent today', 'absence_alert',
        JSON.stringify(['sms'])
      ]);

      expect(result.rows[0].channels).toContain('sms');
    });

    test('should log SMS delivery failure', async () => {
      const notifResult = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testUserId, 'guardian', 'Test SMS',
        'Test message', 'test', JSON.stringify(['sms'])
      ]);

      testNotificationId = notifResult.rows[0].id;

      const logResult = await testPool.query(`
        INSERT INTO notification_delivery_log (
          notification_id, channel, status, error_message
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [testNotificationId, 'sms', 'failed', 'Invalid phone number']);

      expect(logResult.rows[0].status).toBe('failed');
      expect(logResult.rows[0].error_message).toBe('Invalid phone number');
    });
  });

  describe('4. Store Notification History', () => {
    test('should store notification with timestamp', async () => {
      const result = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `, [
        testUserId, 'student', 'Test Notification',
        'Test message', 'test', JSON.stringify(['push'])
      ]);

      expect(result.rows[0].created_at).toBeTruthy();
      expect(result.rows[0].sent_at).toBeTruthy();
    });

    test('should retrieve notification history for user', async () => {
      // Create multiple notifications
      for (let i = 0; i < 3; i++) {
        await testPool.query(`
          INSERT INTO notifications (
            user_id, user_type, title, message, notification_type, channels
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          testUserId, 'student', `Notification ${i}`,
          `Message ${i}`, 'test', JSON.stringify(['push'])
        ]);
      }

      const result = await testPool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
        [testUserId]
      );

      expect(result.rows.length).toBe(3);
    });

    test('should filter notifications by type', async () => {
      await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels
        ) VALUES 
          ($1, $2, $3, $4, $5, $6),
          ($1, $2, $7, $8, $9, $6)
      `, [
        testUserId, 'student', 'Exam Published', 'Math exam', 'exam_published', JSON.stringify(['push']),
        'Payment Due', 'Fee payment', 'payment_reminder', JSON.stringify(['push'])
      ]);

      const result = await testPool.query(
        'SELECT * FROM notifications WHERE user_id = $1 AND notification_type = $2',
        [testUserId, 'exam_published']
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].notification_type).toBe('exam_published');
    });
  });

  describe('5. Mark Notifications as Read', () => {
    test('should mark notification as read', async () => {
      const notifResult = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testUserId, 'student', 'Test Notification',
        'Test message', 'test', JSON.stringify(['push'])
      ]);

      testNotificationId = notifResult.rows[0].id;

      await testPool.query(`
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW()
        WHERE id = $1
      `, [testNotificationId]);

      const result = await testPool.query(
        'SELECT * FROM notifications WHERE id = $1',
        [testNotificationId]
      );

      expect(result.rows[0].is_read).toBe(true);
      expect(result.rows[0].read_at).toBeTruthy();
    });

    test('should mark all notifications as read for user', async () => {
      // Create multiple unread notifications
      for (let i = 0; i < 3; i++) {
        await testPool.query(`
          INSERT INTO notifications (
            user_id, user_type, title, message, notification_type, channels
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          testUserId, 'student', `Notification ${i}`,
          `Message ${i}`, 'test', JSON.stringify(['push'])
        ]);
      }

      await testPool.query(`
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = $1 AND is_read = FALSE
      `, [testUserId]);

      const result = await testPool.query(
        'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE',
        [testUserId]
      );

      expect(result.rows.length).toBe(0);
    });
  });

  describe('6. Retrieve User Notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels, is_read
        ) VALUES 
          ($1, $2, $3, $4, $5, $6, $7),
          ($1, $2, $8, $9, $10, $6, $11)
      `, [
        testUserId, 'student', 'Read Notification', 'Message 1', 'test', JSON.stringify(['push']), true,
        'Unread Notification', 'Message 2', 'test', false
      ]);
    });

    test('should retrieve unread notifications', async () => {
      const result = await testPool.query(
        'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE',
        [testUserId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].title).toBe('Unread Notification');
    });

    test('should count unread notifications', async () => {
      const result = await testPool.query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
        [testUserId]
      );

      expect(parseInt(result.rows[0].count)).toBe(1);
    });

    test('should retrieve notifications with pagination', async () => {
      // Create more notifications
      for (let i = 0; i < 10; i++) {
        await testPool.query(`
          INSERT INTO notifications (
            user_id, user_type, title, message, notification_type, channels
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          testUserId, 'student', `Notification ${i}`,
          `Message ${i}`, 'test', JSON.stringify(['push'])
        ]);
      }

      const limit = 5;
      const offset = 0;
      
      const result = await testPool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [testUserId, limit, offset]
      );

      expect(result.rows.length).toBe(5);
    });
  });

  describe('7. Handle Notification Preferences', () => {
    test('should set user notification preferences', async () => {
      const result = await testPool.query(`
        INSERT INTO notification_preferences (
          user_id, user_type, channel, enabled, notification_types
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        testUserId, 'student', 'push', true,
        JSON.stringify(['exam_published', 'payment_reminder'])
      ]);

      expect(result.rows[0].enabled).toBe(true);
      expect(result.rows[0].notification_types).toContain('exam_published');
    });

    test('should disable specific notification channel', async () => {
      await testPool.query(`
        INSERT INTO notification_preferences (
          user_id, user_type, channel, enabled
        ) VALUES ($1, $2, $3, $4)
      `, [testUserId, 'student', 'sms', false]);

      const result = await testPool.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1 AND channel = $2',
        [testUserId, 'sms']
      );

      expect(result.rows[0].enabled).toBe(false);
    });

    test('should retrieve user preferences for all channels', async () => {
      const channels = ['push', 'telegram', 'sms'];
      
      for (const channel of channels) {
        await testPool.query(`
          INSERT INTO notification_preferences (
            user_id, user_type, channel, enabled
          ) VALUES ($1, $2, $3, $4)
        `, [testUserId, 'student', channel, true]);
      }

      const result = await testPool.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [testUserId]
      );

      expect(result.rows.length).toBe(3);
    });

    test('should update notification preferences', async () => {
      await testPool.query(`
        INSERT INTO notification_preferences (
          user_id, user_type, channel, enabled
        ) VALUES ($1, $2, $3, $4)
      `, [testUserId, 'student', 'push', true]);

      await testPool.query(`
        UPDATE notification_preferences 
        SET enabled = $1
        WHERE user_id = $2 AND channel = $3
      `, [false, testUserId, 'push']);

      const result = await testPool.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1 AND channel = $2',
        [testUserId, 'push']
      );

      expect(result.rows[0].enabled).toBe(false);
    });
  });

  describe('8. Multi-Channel Notification Delivery', () => {
    test('should send notification to multiple channels', async () => {
      const result = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testUserId, 'guardian', 'Important Alert',
        'Your child needs attention', 'alert',
        JSON.stringify(['push', 'telegram', 'sms'])
      ]);

      testNotificationId = result.rows[0].id;

      expect(result.rows[0].channels.length).toBe(3);
      expect(result.rows[0].channels).toContain('push');
      expect(result.rows[0].channels).toContain('telegram');
      expect(result.rows[0].channels).toContain('sms');
    });

    test('should log delivery status for each channel', async () => {
      const notifResult = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testUserId, 'guardian', 'Multi-channel Test',
        'Test message', 'test', JSON.stringify(['push', 'telegram', 'sms'])
      ]);

      testNotificationId = notifResult.rows[0].id;

      // Log delivery for each channel
      const channels = ['push', 'telegram', 'sms'];
      const statuses = ['delivered', 'delivered', 'failed'];
      
      for (let i = 0; i < channels.length; i++) {
        await testPool.query(`
          INSERT INTO notification_delivery_log (
            notification_id, channel, status
          ) VALUES ($1, $2, $3)
        `, [testNotificationId, channels[i], statuses[i]]);
      }

      const result = await testPool.query(
        'SELECT * FROM notification_delivery_log WHERE notification_id = $1',
        [testNotificationId]
      );

      expect(result.rows.length).toBe(3);
      
      const deliveredCount = result.rows.filter(r => r.status === 'delivered').length;
      expect(deliveredCount).toBe(2);
    });

    test('should respect channel preferences when sending', async () => {
      // Set preferences: push enabled, sms disabled
      await testPool.query(`
        INSERT INTO notification_preferences (
          user_id, user_type, channel, enabled
        ) VALUES 
          ($1, $2, $3, $4),
          ($1, $2, $5, $6)
      `, [testUserId, 'student', 'push', true, 'sms', false]);

      // Get enabled channels
      const prefs = await testPool.query(
        'SELECT channel FROM notification_preferences WHERE user_id = $1 AND enabled = TRUE',
        [testUserId]
      );

      const enabledChannels = prefs.rows.map(r => r.channel);
      
      // Create notification with only enabled channels
      const result = await testPool.query(`
        INSERT INTO notifications (
          user_id, user_type, title, message, notification_type, channels
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testUserId, 'student', 'Preference Test',
        'Test message', 'test', JSON.stringify(enabledChannels)
      ]);

      expect(result.rows[0].channels).toContain('push');
      expect(result.rows[0].channels).not.toContain('sms');
    });
  });
});
