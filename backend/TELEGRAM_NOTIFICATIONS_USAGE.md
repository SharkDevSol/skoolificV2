# Telegram Bot Notifications - Usage Guide

## Overview

The Telegram bot can now send proactive notifications to users (students, staff, guardians) who have used the bot to retrieve their credentials.

---

## How It Works

### 1. User Registration
When a user uses the bot to get their credentials:
1. User opens bot: https://t.me/skoolific_credentials_bot
2. User selects school → branch → user type
3. Bot matches phone number and sends credentials
4. **Bot automatically saves user's Telegram chat ID to database**

### 2. Sending Notifications
Once a user's chat ID is saved, the system can send notifications:
- Exam published notifications
- Payment reminders
- Absence alerts
- Report card available
- General announcements

---

## API Methods

### sendNotification()

Send notification to a single user.

**Parameters:**
- `phoneNumber` (string): User's phone number
- `userType` (string): 'student', 'staff', or 'guardian'
- `databaseName` (string): Database name (e.g., 'iqrab1', 'almarkaz_main')
- `message` (string): Notification message (supports Markdown)
- `options` (object): Optional settings

**Returns:** `boolean` - Success status

**Example:**
```javascript
const telegramBotService = require('./services/TelegramBotService');

// Initialize bot
await telegramBotService.initialize(process.env.TELEGRAM_BOT_TOKEN);

// Send notification
const success = await telegramBotService.sendNotification(
  '+251912345678',
  'student',
  'iqrab1',
  `
🎯 *Exam Published*

Your Mathematics exam is now available.

*Details:*
- Duration: 60 minutes
- Questions: 20
- Deadline: Tomorrow 5:00 PM

Good luck! 💪
  `
);

if (success) {
  console.log('Notification sent!');
} else {
  console.log('User has not used the bot yet');
}
```

---

### sendBulkNotification()

Send notification to multiple users.

**Parameters:**
- `users` (array): Array of user objects
  - `phoneNumber` (string)
  - `userType` (string)
  - `databaseName` (string)
- `message` (string): Notification message
- `options` (object): Optional settings

**Returns:** `{sent: number, failed: number}`

**Example:**
```javascript
const users = [
  { phoneNumber: '+251912345678', userType: 'student', databaseName: 'iqrab1' },
  { phoneNumber: '+251923456789', userType: 'student', databaseName: 'iqrab1' },
  { phoneNumber: '+251934567890', userType: 'student', databaseName: 'iqrab1' }
];

const result = await telegramBotService.sendBulkNotification(
  users,
  `
📢 *School Announcement*

Tomorrow is a holiday. No classes.

Enjoy your day! 🎉
  `
);

console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
```

---

### getChatIdByPhone()

Get user's Telegram chat ID by phone number.

**Parameters:**
- `phoneNumber` (string): User's phone number
- `userType` (string): 'student', 'staff', or 'guardian'
- `databaseName` (string): Database name

**Returns:** `number|null` - Chat ID or null if not found

**Example:**
```javascript
const chatId = await telegramBotService.getChatIdByPhone(
  '+251912345678',
  'student',
  'iqrab1'
);

if (chatId) {
  console.log(`Chat ID: ${chatId}`);
} else {
  console.log('User has not used the bot yet');
}
```

---

## Integration Examples

### 1. Exam Published Notification

```javascript
// In your exam publishing code
const { Pool } = require('pg');
const telegramBotService = require('./services/TelegramBotService');

async function publishExam(examId, classId) {
  // ... your exam publishing logic ...

  // Get all students in the class
  const pool = new Pool({ database: 'iqrab1' });
  const students = await pool.query(
    'SELECT phone_number FROM students WHERE class_id = $1',
    [classId]
  );

  // Send notifications
  const users = students.rows.map(s => ({
    phoneNumber: s.phone_number,
    userType: 'student',
    databaseName: 'iqrab1'
  }));

  await telegramBotService.sendBulkNotification(
    users,
    `
🎯 *New Exam Available*

Your Mathematics exam has been published.

*Details:*
- Duration: 60 minutes
- Questions: 20
- Deadline: Tomorrow 5:00 PM

Click here to start: [Start Exam](https://skoolific.com/exams/${examId})

Good luck! 💪
    `
  );

  await pool.end();
}
```

---

### 2. Payment Reminder

```javascript
async function sendPaymentReminders(databaseName) {
  const pool = new Pool({ database: databaseName });
  
  // Get students with pending payments
  const students = await pool.query(`
    SELECT s.phone_number, s.name, p.amount, p.due_date
    FROM students s
    JOIN payments p ON s.id = p.student_id
    WHERE p.status = 'pending' AND p.due_date < NOW() + INTERVAL '3 days'
  `);

  for (const student of students.rows) {
    await telegramBotService.sendNotification(
      student.phone_number,
      'student',
      databaseName,
      `
💰 *Payment Reminder*

Dear ${student.name},

You have a pending payment due soon.

*Details:*
- Amount: ${student.amount} ETB
- Due Date: ${new Date(student.due_date).toLocaleDateString()}

Please make your payment before the due date.

Thank you! 🙏
      `
    );
  }

  await pool.end();
}
```

---

### 3. Absence Alert to Guardian

```javascript
async function sendAbsenceAlert(studentId, databaseName) {
  const pool = new Pool({ database: databaseName });
  
  // Get student and guardian info
  const result = await pool.query(`
    SELECT s.name as student_name, g.phone_number as guardian_phone
    FROM students s
    JOIN guardians g ON s.guardian_id = g.id
    WHERE s.id = $1
  `, [studentId]);

  if (result.rows.length > 0) {
    const { student_name, guardian_phone } = result.rows[0];

    await telegramBotService.sendNotification(
      guardian_phone,
      'guardian',
      databaseName,
      `
⚠️ *Absence Alert*

Your ward ${student_name} was absent today.

*Date:* ${new Date().toLocaleDateString()}

If this is unexpected, please contact the school.

Thank you! 🙏
      `
    );
  }

  await pool.end();
}
```

---

### 4. Report Card Available

```javascript
async function notifyReportCardAvailable(studentId, databaseName) {
  const pool = new Pool({ database: databaseName });
  
  // Get student and guardian info
  const result = await pool.query(`
    SELECT 
      s.name as student_name,
      s.phone_number as student_phone,
      g.phone_number as guardian_phone
    FROM students s
    LEFT JOIN guardians g ON s.guardian_id = g.id
    WHERE s.id = $1
  `, [studentId]);

  if (result.rows.length > 0) {
    const { student_name, student_phone, guardian_phone } = result.rows[0];

    const message = `
📊 *Report Card Available*

The report card for ${student_name} is now available.

*Term:* First Term
*Academic Year:* 2017 E.C.

You can view it in your app.

Thank you! 🎓
    `;

    // Send to student
    if (student_phone) {
      await telegramBotService.sendNotification(
        student_phone,
        'student',
        databaseName,
        message
      );
    }

    // Send to guardian
    if (guardian_phone) {
      await telegramBotService.sendNotification(
        guardian_phone,
        'guardian',
        databaseName,
        message
      );
    }
  }

  await pool.end();
}
```

---

## Message Formatting

The bot supports Markdown formatting:

### Bold Text
```
*Bold Text*
```

### Italic Text
```
_Italic Text_
```

### Links
```
[Link Text](https://example.com)
```

### Code
```
`inline code`
```

### Lists
```
• Item 1
• Item 2
• Item 3
```

### Example Formatted Message
```javascript
const message = `
🎯 *Exam Notification*

Dear Student,

Your *Mathematics* exam is now available.

*Details:*
• Duration: 60 minutes
• Questions: 20
• Deadline: Tomorrow 5:00 PM

_Good luck!_ 💪

[Start Exam](https://skoolific.com/exams/123)
`;
```

---

## Testing

### Test Notification Sending

```bash
cd backend
node services/test-telegram-notifications.js
```

**Before testing:**
1. Update `testPhone` variable with a real phone number
2. Make sure the user has used the bot to get credentials
3. Check Telegram to verify messages are received

---

## Database Schema

### telegram_chat_id Column

Added to three tables:
- `students.telegram_chat_id` (BIGINT)
- `staff.telegram_chat_id` (BIGINT)
- `guardians.telegram_chat_id` (BIGINT)

**Migration:** `016_add_telegram_chat_id.sql`

**Run migration:**
```bash
cd backend
node database/run-migration.js 016
```

---

## Important Notes

### 1. User Must Use Bot First
- Users must use the bot to get credentials before receiving notifications
- Chat ID is automatically saved when user retrieves credentials
- If chat ID is null, notification will fail silently

### 2. Phone Number Matching
- Bot matches last 9 digits of phone number
- Handles different formats: +251912345678, 0912345678, 912345678
- Case-insensitive matching

### 3. Rate Limiting
- Telegram has rate limits (30 messages per second)
- Bulk notifications include 100ms delay between messages
- For large batches, consider queuing system

### 4. Error Handling
- Failed notifications return false (don't throw errors)
- Check return value to handle failures
- Log errors for debugging

### 5. Privacy
- Chat IDs are sensitive data
- Store securely in database
- Don't expose in logs or API responses

---

## Troubleshooting

### Notification Not Received

**Check:**
1. User has used the bot to get credentials
2. Chat ID is saved in database:
   ```sql
   SELECT telegram_chat_id FROM students WHERE phone_number = '+251912345678';
   ```
3. Phone number format is correct
4. Bot is running
5. Check bot logs for errors

### Chat ID Not Saved

**Possible causes:**
1. Migration 016 not run
2. Database connection error
3. User didn't complete credential retrieval flow

**Solution:**
```bash
# Run migration
node database/run-migration.js 016

# Check if column exists
psql -U postgres -d iqrab1 -c "\d students"
```

### Bot Not Responding

**Check:**
1. Bot token is correct in `.env`
2. Bot is running: `node services/start-telegram-bot.js`
3. Master database is set up
4. Network connection is working

---

## Security Considerations

### 1. Bot Token
- Keep bot token secret
- Store in `.env` file (not in code)
- Don't commit to Git

### 2. Chat IDs
- Treat as sensitive data
- Don't expose in API responses
- Log only for debugging

### 3. Message Content
- Sanitize user input before sending
- Don't include sensitive data (passwords, etc.)
- Use Markdown carefully (escape special characters)

### 4. Rate Limiting
- Implement queuing for large batches
- Monitor Telegram API limits
- Handle rate limit errors gracefully

---

## Summary

✅ **Bot can now send notifications**  
✅ **Chat IDs automatically saved**  
✅ **Supports single and bulk notifications**  
✅ **Markdown formatting supported**  
✅ **Phone number matching works**  

**Next Steps:**
1. Run migration 016 on all databases
2. Test notification sending
3. Integrate with your notification triggers
4. Monitor bot logs for errors

---

**Status:** ✅ READY TO USE  
**Documentation:** ✅ COMPLETE  
**Testing:** ⏳ PENDING (run test script)
