/**
 * NotificationService Unit Tests
 * 
 * Comprehensive test suite for the NotificationService class.
 * Tests cover:
 * - Initialization
 * - Multi-channel notification sending
 * - Specific notification types (payment, absence, exam, report card)
 * - User preferences
 * - Notification logging
 * - Error handling
 * 
 * Target: 80%+ code coverage
 */

// Mock dependencies
jest.mock('pg');
jest.mock('../PushNotificationService');
jest.mock('../TelegramBotService');
jest.mock('../SMSService');

const { Pool } = require('pg');
const pushNotificationService = require('../PushNotificationService');
const telegramBotService = require('../TelegramBotService');
const smsService = require('../SMSService');

describe('NotificationService', () => {
  let NotificationService;
  let notificationService;
  let mockPool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock Pool
    mockPool = {
      query: jest.fn(),
      end: jest.fn()
    };
    Pool.mockImplementation(() => mockPool);

    // Mock push notification service
    pushNotificationService.initialize = jest.fn().mockResolvedValue();
    pushNotificationService.sendToUser = jest.fn().mockResolvedValue(true);

    // Mock telegram bot service
    telegramBotService.initialize = jest.fn().mockResolvedValue();
    telegramBotService.sendNotification = jest.fn().mockResolvedValue(true);

    // Mock SMS service
    smsService.initialize = jest.fn().mockResolvedValue();
    smsService.sendSMS = jest.fn().mockResolvedValue({ success: true });

    // Clear module cache and require fresh instance
    jest.resetModules();
    NotificationService = require('../NotificationService');
    notificationService = NotificationService;
  });

  // ============================================================================
  // TEST SUITE 1: Initialization
  // ============================================================================
  describe('1. Initialization', () => {
    test('1.1 Should initialize all notification channels', async () => {
      await notificationService.initialize();

      expect(pushNotificationService.initialize).toHaveBeenCalled();
      expect(telegramBotService.initialize).toHaveBeenCalled();
      expect(smsService.initialize).toHaveBeenCalled();
      expect(notificationService.initialized).toBe(true);
    });

    test('1.2 Should handle initialization errors gracefully', async () => {
      pushNotificationService.initialize.mockRejectedValue(new Error('Init failed'));

      await notificationService.initialize();

      // Should not throw, but log error
      expect(notificationService.initialized).toBe(true);
    });

    test('1.3 Should not throw on partial initialization failure', async () => {
      telegramBotService.initialize.mockRejectedValue(new Error('Telegram init failed'));

      await expect(notificationService.initialize()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // TEST SUITE 2: Send Notification - Success Cases
  // ============================================================================
  describe('2. Send Notification - Success Cases', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    test('2.1 Should send notification through all enabled channels', async () => {
      // Mock user info
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', phone_number: '+251911234567' }]
        })
        // Mock preferences
        .mockResolvedValueOnce({
          rows: []
        })
        // Mock logging
        .mockResolvedValue({ rows: [] });

      const result = await notificationService.sendNotification(
        1,
        'student',
        'test_db',
        'general',
        'Test Title',
        'Test Message'
      );

      expect(result.success).toBe(true);
      expect(pushNotificationService.sendToUser).toHaveBeenCalled();
      expect(telegramBotService.sendNotification).toHaveBeenCalled();
      expect(smsService.sendSMS).toHaveBeenCalled();
    });

    test('2.2 Should respect user preferences', async () => {
      // Mock user info
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', phone_number: '+251911234567' }]
        })
        // Mock preferences - only push enabled
        .mockResolvedValueOnce({
          rows: [
            { channel: 'push', enabled: true },
            { channel: 'telegram', enabled: false },
            { channel: 'sms', enabled: false }
          ]
        })
        // Mock logging
        .mockResolvedValue({ rows: [] });

      await notificationService.sendNotification(
        1,
        'student',
        'test_db',
        'general',
        'Test Title',
        'Test Message'
      );

      expect(pushNotificationService.sendToUser).toHaveBeenCalled();
      expect(telegramBotService.sendNotification).not.toHaveBeenCalled();
      expect(smsService.sendSMS).not.toHaveBeenCalled();
    });

    test('2.3 Should succeed if at least one channel succeeds', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', phone_number: '+251911234567' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      pushNotificationService.sendToUser.mockResolvedValue(true);
      telegramBotService.sendNotification.mockResolvedValue(false);
      smsService.sendSMS.mockResolvedValue({ success: false });

      const result = await notificationService.sendNotification(
        1,
        'student',
        'test_db',
        'general',
        'Test Title',
        'Test Message'
      );

      expect(result.success).toBe(true);
      expect(result.results.push).toBe(true);
    });

    test('2.4 Should include data payload in push notifications', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', phone_number: '+251911234567' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      const options = {
        data: { type: 'exam', examId: 123 }
      };

      await notificationService.sendNotification(
        1,
        'student',
        'test_db',
        'exam_published',
        'New Exam',
        'Exam available',
        options
      );

      expect(pushNotificationService.sendToUser).toHaveBeenCalledWith(
        1,
        'student',
        expect.objectContaining({
          data: { type: 'exam', examId: 123 }
        })
      );
    });
  });

  // ============================================================================
  // TEST SUITE 3: Send Notification - Error Cases
  // ============================================================================
  describe('3. Send Notification - Error Cases', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    test('3.1 Should return error when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.sendNotification(
        999,
        'student',
        'test_db',
        'general',
        'Test',
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    test('3.2 Should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const result = await notificationService.sendNotification(
        1,
        'student',
        'test_db',
        'general',
        'Test',
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('3.3 Should handle all channels failing', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', phone_number: '+251911234567' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      pushNotificationService.sendToUser.mockResolvedValue(false);
      telegramBotService.sendNotification.mockResolvedValue(false);
      smsService.sendSMS.mockResolvedValue({ success: false });

      const result = await notificationService.sendNotification(
        1,
        'student',
        'test_db',
        'general',
        'Test',
        'Test'
      );

      expect(result.success).toBe(false);
    });

    test('3.4 Should handle channel exceptions gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', phone_number: '+251911234567' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      pushNotificationService.sendToUser.mockRejectedValue(new Error('Push error'));
      telegramBotService.sendNotification.mockResolvedValue(true);

      const result = await notificationService.sendNotification(
        1,
        'student',
        'test_db',
        'general',
        'Test',
        'Test'
      );

      expect(result.success).toBe(true); // Telegram succeeded
      expect(result.results.telegram).toBe(true);
    });
  });

  // ============================================================================
  // TEST SUITE 4: Payment Reminder
  // ============================================================================
  describe('4. Payment Reminder', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    test('4.1 Should send payment reminder successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'John Doe', phone_number: '+251911234567' }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', phone_number: '+251911234567' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      const result = await notificationService.sendPaymentReminder(
        1,
        'test_db',
        5000,
        '2024-03-15'
      );

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT name, phone_number FROM students WHERE id = $1',
        [1]
      );
    });

    test('4.2 Should return error when student not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.sendPaymentReminder(
        999,
        'test_db',
        5000,
        '2024-03-15'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Student not found');
    });

    test('4.3 Should include payment details in message', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'John Doe', phone_number: '+251911234567' }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', phone_number: '+251911234567' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      await notificationService.sendPaymentReminder(
        1,
        'test_db',
        5000,
        '2024-03-15'
      );

      expect(pushNotificationService.sendToUser).toHaveBeenCalledWith(
        1,
        'student',
        expect.objectContaining({
          title: '💰 Payment Reminder',
          body: expect.stringContaining('5000 ETB'),
          data: expect.objectContaining({ type: 'payment', amount: 5000 })
        })
      );
    });
  });

  // ============================================================================
  // TEST SUITE 5: Absence Alert
  // ============================================================================
  describe('5. Absence Alert', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    test('5.1 Should send absence alert to guardian', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            student_name: 'John Doe',
            guardian_id: 10,
            guardian_name: 'Jane Doe',
            guardian_phone: '+251911234567'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 10, name: 'Jane Doe', phone_number: '+251911234567' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      const result = await notificationService.sendAbsenceAlert(
        1,
        'test_db',
        '2024-03-15'
      );

      expect(result.success).toBe(true);
      expect(pushNotificationService.sendToUser).toHaveBeenCalledWith(
        10,
        'guardian',
        expect.objectContaining({
          title: '⚠️ Absence Alert'
        })
      );
    });

    test('5.2 Should handle student without guardian', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          student_name: 'John Doe',
          guardian_id: null,
          guardian_name: null
        }]
      });

      const result = await notificationService.sendAbsenceAlert(
        1,
        'test_db',
        '2024-03-15'
      );

      expect(result.success).toBe(true);
      expect(pushNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    test('5.3 Should return error when student not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.sendAbsenceAlert(
        999,
        'test_db',
        '2024-03-15'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Student not found');
    });
  });

  // ============================================================================
  // TEST SUITE 6: Exam Published
  // ============================================================================
  describe('6. Exam Published', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    test('6.1 Should send exam notification to all students in class', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ subject: 'Mathematics', duration: 60, total_marks: 100 }]
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, name: 'Student 1' },
            { id: 2, name: 'Student 2' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Student 1', phone_number: '+251911111111' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 2, name: 'Student 2', phone_number: '+251922222222' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      const result = await notificationService.sendExamPublished(
        1,
        10,
        'test_db'
      );

      expect(result.success).toBe(true);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });

    test('6.2 Should return error when exam not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.sendExamPublished(
        999,
        10,
        'test_db'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Exam not found');
    });

    test('6.3 Should handle notification failures gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ subject: 'Mathematics', duration: 60, total_marks: 100 }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Student 1' }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Student 1', phone_number: '+251911111111' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      pushNotificationService.sendToUser.mockResolvedValue(false);

      const result = await notificationService.sendExamPublished(
        1,
        10,
        'test_db'
      );

      expect(result.success).toBe(true);
      expect(result.failed).toBe(1);
    });
  });

  // ============================================================================
  // TEST SUITE 7: Report Card Available
  // ============================================================================
  describe('7. Report Card Available', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    test('7.1 Should send report card notification to student and guardian', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            student_name: 'John Doe',
            guardian_id: 10
          }]
        })
        // Student notification
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', phone_number: '+251911111111' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        // Guardian notification
        .mockResolvedValueOnce({
          rows: [{ id: 10, name: 'Jane Doe', phone_number: '+251922222222' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      const result = await notificationService.sendReportCardAvailable(
        1,
        'test_db',
        'Term 1',
        '2023/2024'
      );

      expect(result.success).toBe(true);
      expect(pushNotificationService.sendToUser).toHaveBeenCalledTimes(2);
    });

    test('7.2 Should send to student only if no guardian', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            student_name: 'John Doe',
            guardian_id: null
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', phone_number: '+251911111111' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      const result = await notificationService.sendReportCardAvailable(
        1,
        'test_db',
        'Term 1',
        '2023/2024'
      );

      expect(result.success).toBe(true);
      expect(pushNotificationService.sendToUser).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // TEST SUITE 8: Exam Repeat Request
  // ============================================================================
  describe('8. Exam Repeat Request', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    test('8.1 Should send repeat request to all admins', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1 },
            { id: 2 }
          ]
        })
        // Admin 1
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Admin 1', phone_number: '+251911111111' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        // Admin 2
        .mockResolvedValueOnce({
          rows: [{ id: 2, name: 'Admin 2', phone_number: '+251922222222' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      const result = await notificationService.sendExamRepeatRequest(
        1,
        'test_db',
        'Teacher Name',
        'Students need more time'
      );

      expect(result.success).toBe(true);
      expect(pushNotificationService.sendToUser).toHaveBeenCalledTimes(2);
    });

    test('8.2 Should include teacher name and reason in message', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Admin', phone_number: '+251911111111' }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValue({ rows: [] });

      await notificationService.sendExamRepeatRequest(
        1,
        'test_db',
        'Mr. Smith',
        'Technical issues'
      );

      expect(pushNotificationService.sendToUser).toHaveBeenCalledWith(
        1,
        'staff',
        expect.objectContaining({
          body: expect.stringContaining('Mr. Smith'),
          data: expect.objectContaining({ reason: 'Technical issues' })
        })
      );
    });
  });

  // ============================================================================
  // TEST SUITE 9: User Preferences
  // ============================================================================
  describe('9. User Preferences', () => {
    test('9.1 Should return default preferences when no custom preferences exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const preferences = await notificationService.getUserPreferences(
        1,
        'student',
        'test_db',
        'general'
      );

      expect(preferences).toEqual({
        push: true,
        telegram: true,
        sms: true,
        email: false
      });
    });

    test('9.2 Should apply custom user preferences', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { channel: 'push', enabled: false },
          { channel: 'telegram', enabled: true },
          { channel: 'sms', enabled: false }
        ]
      });

      const preferences = await notificationService.getUserPreferences(
        1,
        'student',
        'test_db',
        'general'
      );

      expect(preferences).toEqual({
        push: false,
        telegram: true,
        sms: false,
        email: false
      });
    });

    test('9.3 Should return defaults on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const preferences = await notificationService.getUserPreferences(
        1,
        'student',
        'test_db',
        'general'
      );

      expect(preferences).toEqual({
        push: true,
        telegram: true,
        sms: true,
        email: false
      });
    });
  });

  // ============================================================================
  // TEST SUITE 10: Notification Logging
  // ============================================================================
  describe('10. Notification Logging', () => {
    test('10.1 Should log successful notification', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await notificationService.logNotification(
        1,
        'student',
        'test_db',
        'general',
        'push',
        'Test Title',
        'Test Message',
        'sent',
        null
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications_log'),
        expect.arrayContaining([1, 'student', 'general', 'push', 'Test Title', 'Test Message', 'sent', null, expect.any(Date)])
      );
    });

    test('10.2 Should log failed notification with error message', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await notificationService.logNotification(
        1,
        'student',
        'test_db',
        'general',
        'sms',
        'Test Title',
        'Test Message',
        'failed',
        'SMS service unavailable'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications_log'),
        expect.arrayContaining([1, 'student', 'general', 'sms', 'Test Title', 'Test Message', 'failed', 'SMS service unavailable', null])
      );
    });

    test('10.3 Should handle logging errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(
        notificationService.logNotification(
          1,
          'student',
          'test_db',
          'general',
          'push',
          'Test',
          'Test',
          'sent',
          null
        )
      ).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // TEST SUITE 11: Get User Info
  // ============================================================================
  describe('11. Get User Info', () => {
    test('11.1 Should get student info', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'John Doe', phone_number: '+251911234567' }]
      });

      const userInfo = await notificationService.getUserInfo(1, 'student', 'test_db');

      expect(userInfo).toEqual({
        id: 1,
        name: 'John Doe',
        phone_number: '+251911234567'
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id, name, phone_number FROM students WHERE id = $1',
        [1]
      );
    });

    test('11.2 Should get staff info', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Teacher', phone_number: '+251911234567' }]
      });

      const userInfo = await notificationService.getUserInfo(1, 'staff', 'test_db');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id, name, phone_number FROM staff WHERE id = $1',
        [1]
      );
    });

    test('11.3 Should get guardian info', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Guardian', phone_number: '+251911234567' }]
      });

      const userInfo = await notificationService.getUserInfo(1, 'guardian', 'test_db');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id, name, phone_number FROM guardians WHERE id = $1',
        [1]
      );
    });

    test('11.4 Should return null when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const userInfo = await notificationService.getUserInfo(999, 'student', 'test_db');

      expect(userInfo).toBeNull();
    });
  });
});
