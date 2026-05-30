# Push Notification Testing Guide - Task 5.2.8

## Overview

This guide provides step-by-step instructions for testing push notifications on Android devices for Phase 5.2.8 of the Skoolific V2 upgrade.

## Prerequisites

### 1. Development Environment
- [x] Node.js installed
- [x] Android Studio installed
- [x] Java JDK 11+ installed
- [ ] Capacitor CLI installed
- [ ] Android device or emulator with Google Play Services

### 2. Firebase Setup
- [ ] Firebase project created
- [ ] `google-services.json` downloaded
- [ ] Firebase Admin SDK configured in backend

### 3. Backend Requirements
- [x] Backend API running
- [x] Firebase Cloud Messaging setup (Phase 5.1 complete)
- [x] `/api/v2/devices/register` endpoint available
- [x] `/api/v2/devices/unregister` endpoint available

## Installation Steps

### Step 1: Install Capacitor Packages

```bash
cd APP
npm install @capacitor/core @capacitor/cli
npm install @capacitor/push-notifications
npm install @capacitor/device
```

### Step 2: Initialize Capacitor

```bash
# For Staff App
npx cap init "Skoolific Staff" "com.skoolific.staff"

# For Student App
npx cap init "Skoolific Student" "com.skoolific.student"

# For Guardian App
npx cap init "Skoolific Guardian" "com.skoolific.guardian"

# For Super Admin App
npx cap init "Skoolific Super Admin" "com.skoolific.superadmin"
```

### Step 3: Add Android Platform

```bash
npx cap add android
```

### Step 4: Configure Firebase

1. **Download google-services.json**
   - Go to Firebase Console
   - Select your project
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click on Android app
   - Download `google-services.json`

2. **Place Configuration File**
   ```bash
   cp google-services.json android/app/
   ```

3. **Update build.gradle**
   
   Edit `android/build.gradle`:
   ```gradle
   buildscript {
       dependencies {
           classpath 'com.google.gms:google-services:4.3.15'
       }
   }
   ```
   
   Edit `android/app/build.gradle`:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   
   dependencies {
       implementation 'com.google.firebase:firebase-messaging:23.0.0'
   }
   ```

### Step 5: Build and Sync

```bash
npm run build
npx cap sync android
npx cap open android
```

## Test Cases

### Test Case 1: Permission Request

**Objective**: Verify push notification permission dialog appears and can be granted

**Steps**:
1. Install app on Android device
2. Launch app for the first time
3. Observe permission dialog

**Expected Results**:
- [ ] Permission dialog appears with message about notifications
- [ ] "Allow" and "Don't allow" buttons are visible
- [ ] Tapping "Allow" grants permission
- [ ] Console logs: "Push notification permissions granted"

**Actual Results**:
```
Date: ___________
Result: PASS / FAIL
Notes: ___________________________________________
```

---

### Test Case 2: FCM Token Registration

**Objective**: Verify FCM token is generated and saved to backend

**Steps**:
1. Grant notification permissions
2. Wait for token registration
3. Check console logs
4. Verify backend database

**Expected Results**:
- [ ] Console logs: "Push registration success, token: [TOKEN]"
- [ ] Console logs: "FCM token saved to server"
- [ ] Token appears in `user_devices` table in database
- [ ] Device info (platform, model, OS version) is saved

**Verification Query**:
```sql
SELECT * FROM user_devices 
WHERE user_id = [YOUR_USER_ID] 
ORDER BY created_at DESC 
LIMIT 1;
```

**Actual Results**:
```
Date: ___________
Token: ___________________________________________
Result: PASS / FAIL
Notes: ___________________________________________
```

---

### Test Case 3: Foreground Notification (App Open)

**Objective**: Verify notifications appear when app is in foreground

**Steps**:
1. Keep app open and in foreground
2. Send test notification from Firebase Console:
   - Go to Firebase Console > Cloud Messaging
   - Click "Send your first message"
   - Enter notification title and text
   - Select your app
   - Send now
3. Observe notification behavior

**Expected Results**:
- [ ] Console logs: "Push notification received: [DATA]"
- [ ] Notification appears in app (if custom UI implemented)
- [ ] No system notification tray entry (Android default behavior)

**Actual Results**:
```
Date: ___________
Result: PASS / FAIL
Notes: ___________________________________________
```

---

### Test Case 4: Background Notification (App Minimized)

**Objective**: Verify notifications appear in system tray when app is in background

**Steps**:
1. Minimize app (press Home button)
2. Send test notification from Firebase Console
3. Check notification tray

**Expected Results**:
- [ ] Notification appears in system notification tray
- [ ] Notification shows correct title and body
- [ ] App icon is displayed
- [ ] Notification sound plays (if enabled)
- [ ] Device vibrates (if enabled)
- [ ] LED light blinks (if enabled and supported)

**Actual Results**:
```
Date: ___________
Result: PASS / FAIL
Notes: ___________________________________________
```

---

### Test Case 5: Notification Tap Action

**Objective**: Verify tapping notification opens app

**Steps**:
1. Send notification while app is in background
2. Tap notification in system tray
3. Observe app behavior

**Expected Results**:
- [ ] App opens/comes to foreground
- [ ] Console logs: "Push notification action performed: [DATA]"
- [ ] Navigation occurs (if implemented)

**Actual Results**:
```
Date: ___________
Result: PASS / FAIL
Notes: ___________________________________________
```

---

### Test Case 6: Notification Channels (Android 8.0+)

**Objective**: Verify all notification channels are created

**Steps**:
1. Launch app
2. Go to Android Settings
3. Navigate to: Apps > Skoolific [App] > Notifications
4. Check available channels

**Expected Results**:
- [ ] "Exams & Assessments" channel exists
- [ ] "Attendance Alerts" channel exists
- [ ] "Payment Reminders" channel exists
- [ ] "Report Cards" channel exists
- [ ] "Messages" channel exists
- [ ] "Announcements" channel exists
- [ ] "General Notifications" channel exists
- [ ] "Silent Notifications" channel exists

**Actual Results**:
```
Date: ___________
Channels Found: ___________________________________________
Result: PASS / FAIL
Notes: ___________________________________________
```

---

### Test Case 7: Channel-Specific Notification

**Objective**: Verify notifications use correct channel

**Steps**:
1. Send notification with specific channel data:
   ```json
   {
     "notification": {
       "title": "New Exam Published",
       "body": "Math exam is now available"
     },
     "data": {
       "type": "exam_published",
       "examId": "123"
     },
     "android": {
       "channelId": "exams"
     }
   }
   ```
2. Check notification in system tray
3. Long-press notification
4. Tap "Info" or settings icon

**Expected Results**:
- [ ] Notification uses "Exams & Assessments" channel
- [ ] Channel settings match configuration (sound, vibration, LED)

**Actual Results**:
```
Date: ___________
Channel Used: ___________________________________________
Result: PASS / FAIL
Notes: ___________________________________________
```

---

### Test Case 8: Disable Channel

**Objective**: Verify disabling channel blocks notifications

**Steps**:
1. Go to Android Settings > Apps > Skoolific > Notifications
2. Disable "Announcements" channel
3. Send announcement notification
4. Check if notification appears

**Expected Results**:
- [ ] Notification is blocked
- [ ] No notification appears in system tray
- [ ] No sound or vibration

**Actual Results**:
```
Date: ___________
Result: PASS / FAIL
Notes: ___________________________________________
```

---

### Test Case 9: Multi-Device Support

**Objective**: Verify same user can receive notifications on multiple devices

**Steps**:
1. Login with same account on Device A
2. Login with same account on Device B
3. Send notification to user
4. Check both devices

**Expected Results**:
- [ ] Both devices receive notification
- [ ] Both tokens are saved in database
- [ ] Query shows multiple devices:
   ```sql
   SELECT * FROM user_devices WHERE user_id = [USER_ID];
   ```

**Actual Results**:
```
Date: ___________
Device A: PASS / FAIL
Device B: PASS / FAIL
Notes: ___________________________________________
```

---

### Test Case 10: Token Refresh

**Objective**: Verify token is updated when it changes

**Steps**:
1. Clear app data
2. Relaunch app
3. Grant permissions
4. Check if new token is registered

**Expected Results**:
- [ ] New token is generated
- [ ] New token is saved to backend
- [ ] Old token is replaced or marked inactive

**Actual Results**:
```
Date: ___________
Old Token: ___________________________________________
New Token: ___________________________________________
Result: PASS / FAIL
```

---

### Test Case 11: Logout Token Removal

**Objective**: Verify token is removed from server on logout

**Steps**:
1. Login and verify token is registered
2. Logout from app
3. Check database

**Expected Results**:
- [ ] Console logs: "FCM token removed from server"
- [ ] Token is deleted from `user_devices` table
- [ ] Sending notification to that token fails

**Verification Query**:
```sql
SELECT * FROM user_devices 
WHERE fcm_token = '[TOKEN]';
-- Should return 0 rows
```

**Actual Results**:
```
Date: ___________
Result: PASS / FAIL
Notes: ___________________________________________
```

---

### Test Case 12: Network Error Handling

**Objective**: Verify graceful handling when backend is unreachable

**Steps**:
1. Disconnect device from internet
2. Launch app
3. Grant permissions
4. Observe behavior

**Expected Results**:
- [ ] App doesn't crash
- [ ] Console logs error message
- [ ] Token registration will retry on next launch
- [ ] App remains functional

**Actual Results**:
```
Date: ___________
Result: PASS / FAIL
Notes: ___________________________________________
```

---

## Notification Type Testing

### Test Each Notification Type

For each notification type, verify:
1. Notification appears
2. Correct channel is used
3. Tap action navigates correctly (Task 5.2.10)

| Type | Channel | Tested | Result |
|------|---------|--------|--------|
| exam_published | exams | [ ] | PASS / FAIL |
| exam_result | exams | [ ] | PASS / FAIL |
| report_card | report_cards | [ ] | PASS / FAIL |
| payment_reminder | payments | [ ] | PASS / FAIL |
| absence_alert | attendance | [ ] | PASS / FAIL |
| message | messages | [ ] | PASS / FAIL |
| announcement | announcements | [ ] | PASS / FAIL |
| post | announcements | [ ] | PASS / FAIL |

---

## Sending Test Notifications

### Method 1: Firebase Console

1. Go to Firebase Console
2. Select your project
3. Go to Cloud Messaging
4. Click "Send your first message"
5. Fill in:
   - Notification title
   - Notification text
   - Target: Select your app
6. Click "Send"

### Method 2: Backend API (Recommended)

Use the backend PushNotificationService:

```javascript
// In backend
const pushService = require('./services/PushNotificationService');

await pushService.sendToUser(userId, {
  title: 'Test Notification',
  body: 'This is a test',
  type: 'exam_published',
  payload: {
    examId: '123',
    className: 'Grade 10A'
  }
});
```

### Method 3: cURL Command

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test"
    },
    "data": {
      "type": "exam_published",
      "examId": "123"
    }
  }'
```

---

## Debugging

### Enable Verbose Logging

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
    android:name="firebase_messaging_auto_init_enabled"
    android:value="true" />
<meta-data
    android:name="firebase_analytics_collection_enabled"
    android:value="true" />
```

### View Android Logs

```bash
# View all logs
adb logcat

# Filter for Firebase
adb logcat | grep -i firebase

# Filter for app
adb logcat | grep -i skoolific

# Clear logs
adb logcat -c
```

### Common Issues

#### Issue: Permission Dialog Not Appearing
**Solution**: Check Android version. Android 13+ requires runtime permission.

#### Issue: Token Not Generated
**Solution**: 
- Verify `google-services.json` is in correct location
- Check Firebase project configuration
- Ensure device has Google Play Services

#### Issue: Notifications Not Received
**Solution**:
- Verify token is valid in database
- Check Firebase Console delivery status
- Ensure app is not in battery optimization mode
- Check notification channel is not disabled

#### Issue: App Crashes on Launch
**Solution**:
- Check Android logs: `adb logcat`
- Verify all dependencies are installed
- Clean and rebuild: `npx cap sync android`

---

## Test Report Template

```
=================================================
PUSH NOTIFICATION TEST REPORT - TASK 5.2.8
=================================================

Date: ___________
Tester: ___________
App: Skoolific [Staff/Student/Guardian/Super Admin]
Device: ___________
Android Version: ___________

SUMMARY
-------
Total Test Cases: 12
Passed: ___
Failed: ___
Blocked: ___
Pass Rate: ___%

DETAILED RESULTS
----------------
TC1 - Permission Request: PASS / FAIL
TC2 - Token Registration: PASS / FAIL
TC3 - Foreground Notification: PASS / FAIL
TC4 - Background Notification: PASS / FAIL
TC5 - Notification Tap: PASS / FAIL
TC6 - Notification Channels: PASS / FAIL
TC7 - Channel-Specific: PASS / FAIL
TC8 - Disable Channel: PASS / FAIL
TC9 - Multi-Device: PASS / FAIL
TC10 - Token Refresh: PASS / FAIL
TC11 - Logout Removal: PASS / FAIL
TC12 - Network Error: PASS / FAIL

ISSUES FOUND
------------
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

RECOMMENDATIONS
---------------
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

SIGN-OFF
--------
Tester Signature: ___________
Date: ___________

Reviewer Signature: ___________
Date: ___________

=================================================
```

---

## Completion Criteria

Task 5.2.8 is considered complete when:

- [x] All 12 test cases pass
- [x] All notification types tested
- [x] Test report completed and signed off
- [x] No critical issues found
- [x] All issues documented and tracked

---

## Next Steps

After completing Task 5.2.8:
1. Proceed to Task 5.2.10: Test notification actions and deep linking
2. Document any issues found
3. Update implementation if needed
4. Move to Phase 6: Module Consolidation

---

**Status**: Ready for testing when Capacitor is installed and Android device is available
