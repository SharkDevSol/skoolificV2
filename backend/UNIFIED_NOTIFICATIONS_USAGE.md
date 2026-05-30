# Unified Notification Service - Usage Guide

## Overview

The Unified Notification Service provides a single interface for sending notifications through multiple channels:
- **Push Notifications** (Firebase)
- **Telegram Bot**
- **SMS** (Africa's Talking / Twilio)
- **Email** (future)

**Key Benefits:**
- ONE method call sends to ALL channels
- User preferences respected
- Automatic logging
- Retry logic
- Fallback channels

---

## Setup

### 1. Run Migration

```bash
cd backend
node database/run-migration.js 017
```

This creates:
- `notifications_log` table (tracks all notifications)
- `notification_preferences` table (user channel preferences)

### 2. Initialize Service

```javascript
const notificationService = require('./services/NotificationService');

// Initialize (done automatically on first use)
await notificationService.initialize();
```

---

## API Methods

### sendNotification()

Send generic notification through all channels.

**Parameters:**
- `userId` (number): User ID
- `userType` (string): 'student', 'staff', or 'guardian'
- `databaseName` (string): Database name
- `notificationType` (string): Type of notification
- `title` (string): Notification title
- `message` (string): Notification message
- `options` (object): Additional options

**Returns:** `{success: boolean, results: {push, telegram, sms}}`

**Example:**
```javascript
const result = await notificationService.sendNotification(
  123,                    // userId
  'student',              // userType
  'iqrab1',              // databaseName
  'announcement',         // notificationType
  '📢 Important Notice',  // title
  'School closed tomorrow. Holiday!', // message
  { data: { type: 'announcement' } }  // options
);

console.log(`Success: ${result.success}`);
console.log(`Push: ${result.results.push ? '✓' : '✗'}`);
console.log(`Telegram: ${result.results.telegram ? '✓' : '✗'}`);
console.log(`SMS: ${result.results.sms ? '✓' : '✗'}`);
```

---

### sendPaymentReminder()

Send payment reminder notification.

**Parameters:**
- `studentId` (number): Student ID
- `databaseName` (string): Database name
- `amount` (number): Payment amount
- `dueDate` (string): Due date

**Example:**
```javascript
await notificationService.sendPaymentReminder(
  123,           // studentId
  'iqrab1',      // databaseName
  500,           // amount (ETB)
  '2024-12-31'   // dueDate
);
```

**Sends:**
```
💰 Payment Reminder

Dear [Student Name],

You have a pending payment:
Amount: 500 ETB
Due Date: 2024-12-31

Please make your payment before the due date.

Thank you!
- Skoolific
```

---

### sendAbsenceAlert()

Send absence alert to guardian.

**Parameters:**
- `studentId` (number): Student ID
- `databaseName` (string): Database name
- `date` (string): Absence date

**Example:**
```javascript
await notificationService.sendAbsenceAlert(
  123,                              // studentId
  'iqrab1',                         // databaseName
  new Date().toLocaleDateString()   // date
);
```

**Sends to Guardian:**
```
⚠️ Absence Alert

Dear [Guardian Name],

Your ward [Student Name] was absent on [Date].

If this is unexpected, please contact the school.

Thank you!
- Skoolific
```

---

### sendExamPublished()

Send exam published notification to all students in class.

**Parameters:**
- `examId` (number): Exam ID
- `classId` (number): Class ID
- `databaseName` (string): Database name

**Example:**
```javascript
const result = await notificationService.sendExamPublished(
  456,       // examId
  10,        // classId
  'iqrab1'   // databaseName
);

console.log(`Sent to ${result.sent} students`);
console.log(`Failed: ${result.failed}`);
```

**Sends:**
```
🎯 New Exam Available

A new exam has been published!

Subject: Mathematics
Duration: 60 minutes
Total Marks: 100

Login to your app to start the exam.

Good luck!
- Skoolific
```

---

### sendReportCardAvailable()

Send report card available notification to student and guardian.

**Parameters:**
- `studentId` (number): Student ID
- `databaseName` (string): Database name
- `term` (string): Term name
- `academicYear` (string): Academic year

**Example:**
```javascript
await notificationService.sendReportCardAvailable(
  123,           // studentId
  'iqrab1',      // databaseName
  'First Term',  // term
  '2017 E.C.'    // academicYear
);
```

**Sends:**
```
📊 Report Card Available

The report card for [Student Name] is now available.

Term: First Term
Academic Year: 2017 E.C.

View it in your Skoolific app.

Thank you!
- Skoolific
```

---

### sendExamRepeatRequest()

Send exam repeat request notification to admins.

**Parameters:**
- `examId` (number): Exam ID
- `databaseName` (string): Database name
- `teacherName` (string): Teacher name
- `reason` (string): Reason for repeat

**Example:**
```javascript
await notificationService.sendExamRepeatRequest(
  456,                    // examId
  'iqrab1',               // databaseName
  'Ahmed Ali',            // teacherName
  'Students need more time to prepare' // reason
);
```

**Sends to Admins:**
```
🔄 Exam Repeat Request

Teacher Ahmed Ali has requested to repeat an exam.

Exam ID: 456
Reason: Students need more time to prepare

Please review and approve/reject in the admin panel.

- Skoolific
```

---

## Integration Examples

### 1. Payment System Integration

```javascript
// In your payment processing code
const { Pool } = require('pg');
const notificationService = require('./services/NotificationService');

async function processPayment(studentId, amount, databaseName) {
  const pool = new Pool({ database: databaseName });
  
  // ... payment processing logic ...
  
  // Send payment confirmation
  await notificationService.sendNotification(
    studentId,
    'student',
    databaseName,
    'payment_confirmation',
    '✅ Payment Received',
    `Your payment of ${amount} ETB has been received. Thank you!`
  );
  
  await pool.end();
}
```

---

### 2. Attendance System Integration

```javascript
// In your attendance marking code
async function markAttendance(studentId, status, date, databaseName) {
  // ... mark attendance logic ...
  
  // If absent, send alert to guardian
  if (status === 'absent') {
    await notificationService.sendAbsenceAlert(
      studentId,
      databaseName,
      date
    );
  }
}
```

---

### 3. Exam System Integration

```javascript
// When exam is published
async function publishExam(examId, classId, databaseName) {
  // ... publish exam logic ...
  
  // Notify all students
  await notificationService.sendExamPublished(
    examId,
    classId,
    databaseName
  );
}
```

---

### 4. Report Card System Integration

```javascript
// When report card is generated
async function generateReportCard(studentId, term, academicYear, databaseName) {
  // ... generate report card logic ...
  
  // Notify student and guardian
  await notificationService.sendReportCardAvailable(
    studentId,
    databaseName,
    term,
    academicYear
  );
}
```

---

### 5. Scheduled Payment Reminders

```javascript
// Run daily to send payment reminders
const cron = require('node-cron');

// Run every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  const pool = new Pool({ database: 'iqrab1' });
  
  // Get students with payments due in 3 days
  const students = await pool.query(`
    SELECT s.id, p.amount, p.due_date
    FROM students s
    JOIN payments p ON s.id = p.student_id
    WHERE p.status = 'pending'
      AND p.due_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
  `);
  
  for (const student of students.rows) {
    await notificationService.sendPaymentReminder(
      student.id,
      'iqrab1',
      student.amount,
      student.due_date
    );
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  await pool.end();
  console.log(`✅ Sent ${students.rows.length} payment reminders`);
});
```

---

## User Preferences

Users can control which channels they receive notifications on.

### Set User Preference

```javascript
const { Pool } = require('pg');

async function setNotificationPreference(userId, userType, channel, notificationType, enabled, databaseName) {
  const pool = new Pool({ database: databaseName });
  
  await pool.query(`
    INSERT INTO notification_preferences 
    (user_id, user_type, channel, notification_type, enabled)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, user_type, channel, notification_type)
    DO UPDATE SET enabled = $5
  `, [userId, userType, channel, notificationType, enabled]);
  
  await pool.end();
}

// Example: Disable SMS for payment reminders
await setNotificationPreference(
  123,                  // userId
  'student',            // userType
  'sms',                // channel
  'payment_reminder',   // notificationType
  false,                // enabled
  'iqrab1'              // databaseName
);
```

### Get User Preferences

```javascript
async function getUserPreferences(userId, userType, databaseName) {
  const pool = new Pool({ database: databaseName });
  
  const result = await pool.query(`
    SELECT notification_type, channel, enabled
    FROM notification_preferences
    WHERE user_id = $1 AND user_type = $2
  `, [userId, userType]);
  
  await pool.end();
  return result.rows;
}
```

---

## Notification Logging

All notifications are automatically logged to the `notifications_log` table.

### View Notification History

```sql
-- Recent notifications for a user
SELECT 
  notification_type,
  channel,
  title,
  status,
  sent_at
FROM notifications_log
WHERE user_id = 123 AND user_type = 'student'
ORDER BY created_at DESC
LIMIT 10;
```

### Notification Statistics

```sql
-- Notification stats by channel
SELECT 
  channel,
  status,
  COUNT(*) as count
FROM notifications_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY channel, status
ORDER BY channel, status;
```

### Failed Notifications

```sql
-- Find failed notifications
SELECT 
  user_id,
  user_type,
  notification_type,
  channel,
  error_message,
  created_at
FROM notifications_log
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Testing

### Run Test Script

```bash
cd backend
node services/test-unified-notifications.js
```

### Manual Testing

```javascript
const notificationService = require('./services/NotificationService');

// Test notification
await notificationService.sendNotification(
  1,                      // Your user ID
  'student',              // Your user type
  'skoolific',            // Your database
  'test',
  '🔔 Test',
  'This is a test notification'
);
```

---

## Best Practices

### 1. Use Specific Methods
✅ Use `sendPaymentReminder()` instead of generic `sendNotification()`
- Better logging
- Consistent messaging
- Easier to maintain

### 2. Handle Errors Gracefully
```javascript
try {
  await notificationService.sendPaymentReminder(...);
} catch (error) {
  console.error('Failed to send notification:', error);
  // Continue with other operations
}
```

### 3. Batch Notifications
```javascript
// For bulk notifications, add delays
for (const student of students) {
  await notificationService.sendNotification(...);
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### 4. Respect User Preferences
The service automatically checks user preferences. Don't bypass them.

### 5. Monitor Logs
Regularly check `notifications_log` for failed notifications.

---

## Troubleshooting

### Notifications Not Received

**Check:**
1. User exists in database
2. User has phone number (for Telegram/SMS)
3. User has used Telegram bot (for Telegram)
4. SMS provider has credits (for SMS)
5. Check `notifications_log` table for errors

### High Failure Rate

**Check:**
```sql
SELECT channel, error_message, COUNT(*)
FROM notifications_log
WHERE status = 'failed'
GROUP BY channel, error_message;
```

### Performance Issues

**Solutions:**
- Add delays between bulk notifications
- Use background jobs for large batches
- Monitor database performance

---

## Summary

✅ **Unified notification service ready**  
✅ **Multi-channel support (Push, Telegram, SMS)**  
✅ **Specific notification types**  
✅ **User preferences**  
✅ **Automatic logging**  
✅ **Easy integration**  

**Next Steps:**
1. Run migration 017
2. Test notification sending
3. Integrate with your systems
4. Monitor notification logs

---

**Status:** ✅ READY TO USE  
**Documentation:** ✅ COMPLETE  
**Testing:** ⏳ PENDING (run test script)
