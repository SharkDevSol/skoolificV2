# SMS Service - Usage Guide

## Overview

The SMS Service provides a unified interface for sending SMS messages through multiple providers:
- **Africa's Talking** (recommended for Ethiopia)
- **Twilio** (international)

---

## Setup

### Option 1: Africa's Talking (Recommended for Ethiopia)

#### 1. Sign Up
Visit: https://africastalking.com

#### 2. Get Credentials
- **Username:** Your Africa's Talking username (use `sandbox` for testing)
- **API Key:** Get from dashboard → Settings → API Key

#### 3. Configure .env
```env
SMS_PROVIDER=africastalking
AFRICASTALKING_USERNAME=sandbox
AFRICASTALKING_API_KEY=your_api_key_here
AFRICASTALKING_SENDER_ID=
```

#### 4. Testing (Sandbox)
- Sandbox is FREE for testing
- Register test phone numbers in dashboard
- SMS only sent to registered numbers in sandbox mode

#### 5. Production
- Add credits to your account
- Change username from `sandbox` to your actual username
- SMS sent to any number

---

### Option 2: Twilio (International)

#### 1. Sign Up
Visit: https://www.twilio.com

#### 2. Get Credentials
- **Account SID:** From console dashboard
- **Auth Token:** From console dashboard
- **From Number:** Your Twilio phone number

#### 3. Configure .env
```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

---

## API Methods

### sendSMS()

Send SMS to a single recipient.

**Parameters:**
- `phoneNumber` (string): Recipient phone number
- `message` (string): SMS message content (max 160 chars for single SMS)
- `options` (object): Optional settings

**Returns:** `{success: boolean, messageId: string, error: string}`

**Example:**
```javascript
const smsService = require('./services/SMSService');

// Initialize service
await smsService.initialize();

// Send SMS
const result = await smsService.sendSMS(
  '+251912345678',
  'Your exam is ready! Check your app.'
);

if (result.success) {
  console.log(`SMS sent! ID: ${result.messageId}`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

---

### sendBulkSMS()

Send SMS to multiple recipients.

**Parameters:**
- `phoneNumbers` (array): Array of phone numbers
- `message` (string): SMS message content
- `options` (object): Optional settings

**Returns:** `{sent: number, failed: number, results: array}`

**Example:**
```javascript
const phoneNumbers = [
  '+251912345678',
  '+251923456789',
  '+251934567890'
];

const result = await smsService.sendBulkSMS(
  phoneNumbers,
  'School closed tomorrow. Holiday! 🎉'
);

console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
```

---

### normalizePhoneNumber()

Normalize phone number to E.164 format.

**Parameters:**
- `phoneNumber` (string): Phone number in any format

**Returns:** `string` - Normalized phone number

**Example:**
```javascript
smsService.normalizePhoneNumber('0912345678');    // +251912345678
smsService.normalizePhoneNumber('912345678');     // +251912345678
smsService.normalizePhoneNumber('+251912345678'); // +251912345678
```

---

### checkBalance()

Check account balance (Africa's Talking only).

**Returns:** `{balance: string, currency: string}`

**Example:**
```javascript
const balance = await smsService.checkBalance();
console.log(`Balance: ${balance.balance} ${balance.currency}`);
```

---

## Integration Examples

### 1. Payment Reminder

```javascript
const { Pool } = require('pg');
const smsService = require('./services/SMSService');

async function sendPaymentReminders(databaseName) {
  const pool = new Pool({ database: databaseName });
  
  // Get students with pending payments
  const students = await pool.query(`
    SELECT s.phone_number, s.name, p.amount, p.due_date
    FROM students s
    JOIN payments p ON s.id = p.student_id
    WHERE p.status = 'pending' 
      AND p.due_date < NOW() + INTERVAL '3 days'
      AND s.phone_number IS NOT NULL
  `);

  for (const student of students.rows) {
    const message = `
Dear ${student.name},

Payment reminder:
Amount: ${student.amount} ETB
Due: ${new Date(student.due_date).toLocaleDateString()}

Please pay before the due date.

- Skoolific
    `.trim();

    await smsService.sendSMS(student.phone_number, message);
    
    // Add small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  await pool.end();
  console.log(`✅ Sent ${students.rows.length} payment reminders`);
}
```

---

### 2. Exam Published Notification

```javascript
async function notifyExamPublished(examId, classId, databaseName) {
  const pool = new Pool({ database: databaseName });
  
  // Get exam details
  const exam = await pool.query(
    'SELECT subject, duration FROM ai_exams WHERE id = $1',
    [examId]
  );

  // Get all students in class
  const students = await pool.query(
    'SELECT phone_number, name FROM students WHERE class_id = $1 AND phone_number IS NOT NULL',
    [classId]
  );

  const phoneNumbers = students.rows.map(s => s.phone_number);
  
  const message = `
New exam available!

Subject: ${exam.rows[0].subject}
Duration: ${exam.rows[0].duration} min

Login to start your exam.

Good luck!
- Skoolific
  `.trim();

  const result = await smsService.sendBulkSMS(phoneNumbers, message);
  
  await pool.end();
  console.log(`✅ Notified ${result.sent} students`);
}
```

---

### 3. Absence Alert to Guardian

```javascript
async function sendAbsenceAlert(studentId, databaseName) {
  const pool = new Pool({ database: databaseName });
  
  // Get student and guardian info
  const result = await pool.query(`
    SELECT 
      s.name as student_name,
      g.phone_number as guardian_phone,
      g.name as guardian_name
    FROM students s
    JOIN guardians g ON s.guardian_id = g.id
    WHERE s.id = $1 AND g.phone_number IS NOT NULL
  `, [studentId]);

  if (result.rows.length > 0) {
    const { student_name, guardian_phone, guardian_name } = result.rows[0];

    const message = `
Dear ${guardian_name},

Your ward ${student_name} was absent today.

Date: ${new Date().toLocaleDateString()}

If unexpected, please contact the school.

- Skoolific
    `.trim();

    await smsService.sendSMS(guardian_phone, message);
  }

  await pool.end();
}
```

---

### 4. Report Card Available

```javascript
async function notifyReportCardAvailable(studentId, term, databaseName) {
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
Report card available!

Student: ${student_name}
Term: ${term}

View in your Skoolific app.

- Skoolific
    `.trim();

    // Send to student
    if (student_phone) {
      await smsService.sendSMS(student_phone, message);
    }

    // Send to guardian
    if (guardian_phone) {
      await smsService.sendSMS(guardian_phone, message);
    }
  }

  await pool.end();
}
```

---

### 5. Bulk Announcement

```javascript
async function sendBulkAnnouncement(databaseName, announcement) {
  const pool = new Pool({ database: databaseName });
  
  // Get all active students with phone numbers
  const students = await pool.query(`
    SELECT phone_number 
    FROM students 
    WHERE status = 'active' 
      AND phone_number IS NOT NULL
  `);

  const phoneNumbers = students.rows.map(s => s.phone_number);
  
  const message = `
ANNOUNCEMENT

${announcement}

- Skoolific
  `.trim();

  // Send in batches of 100
  const batchSize = 100;
  let totalSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < phoneNumbers.length; i += batchSize) {
    const batch = phoneNumbers.slice(i, i + batchSize);
    const result = await smsService.sendBulkSMS(batch, message);
    
    totalSent += result.sent;
    totalFailed += result.failed;
    
    // Wait between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await pool.end();
  console.log(`✅ Announcement sent: ${totalSent} delivered, ${totalFailed} failed`);
}
```

---

## Phone Number Formats

The service automatically normalizes phone numbers to E.164 format.

### Supported Formats (Ethiopian):
- `+251912345678` → `+251912345678`
- `0912345678` → `+251912345678`
- `912345678` → `+251912345678`
- `+251 91 234 5678` → `+251912345678`
- `09-12-34-56-78` → `+251912345678`

### International Numbers:
- Already in E.164 format: `+1234567890`
- Will be normalized automatically

---

## Message Length

### Single SMS:
- **160 characters** for plain text
- **70 characters** for Unicode (Amharic, Arabic, etc.)

### Concatenated SMS:
- Messages longer than 160 chars are split
- Each part costs as separate SMS
- Recommended: Keep messages under 160 chars

### Tips:
- Use abbreviations
- Avoid special characters
- Test message length before sending

---

## Cost Estimation

### Africa's Talking (Ethiopia):
- **~0.80 ETB per SMS** (standard rate)
- Bulk discounts available
- No setup fees
- Pay as you go

### Twilio (International):
- **~$0.0075 per SMS** (varies by country)
- Monthly fees may apply
- Check pricing: https://www.twilio.com/sms/pricing

### Cost Calculation:
```javascript
// Example: 1000 students, 1 SMS each
const students = 1000;
const smsPerStudent = 1;
const costPerSMS = 0.80; // ETB

const totalCost = students * smsPerStudent * costPerSMS;
console.log(`Total cost: ${totalCost} ETB`); // 800 ETB
```

---

## Testing

### Test SMS Sending

```bash
cd backend
node services/test-sms.js
```

**Before testing:**
1. Update `testPhone` variable with your phone number
2. Configure SMS provider credentials in `.env`
3. For Africa's Talking sandbox: Register test number in dashboard
4. Check your phone to verify SMS received

---

## Error Handling

### Common Errors:

#### 1. Invalid Credentials
```
Error: Africa's Talking credentials not configured
```
**Solution:** Check `.env` file has correct credentials

#### 2. Insufficient Balance
```
Error: Insufficient balance
```
**Solution:** Add credits to your account

#### 3. Invalid Phone Number
```
Error: Invalid phone number format
```
**Solution:** Use E.164 format (+251912345678)

#### 4. Rate Limiting
```
Error: Too many requests
```
**Solution:** Add delays between bulk sends

---

## Best Practices

### 1. Message Content
- ✅ Keep messages short and clear
- ✅ Include sender name (Skoolific)
- ✅ Add call-to-action
- ❌ Don't use all caps
- ❌ Don't include sensitive data

### 2. Timing
- ✅ Send during business hours (8 AM - 8 PM)
- ✅ Avoid weekends for non-urgent messages
- ❌ Don't send late at night

### 3. Frequency
- ✅ Limit to important notifications
- ✅ Combine multiple updates into one message
- ❌ Don't spam users

### 4. Opt-Out
- ✅ Provide opt-out mechanism
- ✅ Respect user preferences
- ✅ Store opt-out status in database

### 5. Testing
- ✅ Always test with sandbox first
- ✅ Verify message content
- ✅ Check phone number format
- ✅ Monitor delivery rates

---

## Troubleshooting

### SMS Not Received

**Check:**
1. Phone number is correct
2. Phone number is in E.164 format
3. SMS provider has credits
4. For sandbox: Phone number is registered
5. Check spam/blocked messages on phone

### High Failure Rate

**Possible causes:**
1. Invalid phone numbers
2. Network issues
3. Blocked sender ID
4. Insufficient credits

**Solution:**
- Validate phone numbers before sending
- Use verified sender ID
- Monitor delivery reports

### Slow Delivery

**Possible causes:**
1. Network congestion
2. Bulk sending without delays
3. Provider rate limits

**Solution:**
- Add delays between messages
- Send in smaller batches
- Use priority sending (if available)

---

## Security Considerations

### 1. API Credentials
- Keep credentials in `.env` file
- Don't commit to Git
- Use environment variables in production

### 2. Phone Numbers
- Validate before storing
- Encrypt in database (optional)
- Don't expose in logs

### 3. Message Content
- Sanitize user input
- Don't include passwords
- Don't include sensitive data

### 4. Rate Limiting
- Implement sending limits
- Monitor usage
- Prevent abuse

---

## Monitoring

### Track Metrics:
- Total SMS sent
- Delivery rate
- Failed messages
- Cost per message
- Response time

### Log Important Events:
```javascript
// Log SMS sent
console.log(`SMS sent to ${phoneNumber} (ID: ${messageId})`);

// Log failures
console.error(`Failed to send SMS to ${phoneNumber}: ${error}`);

// Log bulk results
console.log(`Bulk SMS: ${sent} sent, ${failed} failed`);
```

---

## Summary

✅ **SMS Service ready to use**  
✅ **Supports Africa's Talking and Twilio**  
✅ **Single and bulk SMS**  
✅ **Phone number normalization**  
✅ **Error handling**  
✅ **Integration examples**  

**Next Steps:**
1. Configure SMS provider credentials
2. Test SMS sending
3. Integrate with your notification triggers
4. Monitor delivery rates

---

**Status:** ✅ READY TO USE  
**Documentation:** ✅ COMPLETE  
**Testing:** ⏳ PENDING (run test script)
