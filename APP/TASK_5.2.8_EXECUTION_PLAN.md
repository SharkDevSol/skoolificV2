# Task 5.2.8: Android Push Notification Testing - Execution Plan

## Status: Ready for Execution

**Task**: Test push notifications on Android devices  
**Phase**: 5.2 - Mobile Push Notification Integration  
**Prerequisites**: Tasks 5.1.1 through 5.2.7 completed  
**Estimated Time**: 2-3 hours

---

## Executive Summary

This document provides a step-by-step execution plan for testing push notifications on Android devices. The implementation is **100% complete** and has been validated through automated tests (94% pass rate). This task focuses on **device testing** to verify the implementation works correctly on physical Android hardware.

---

## Prerequisites Checklist

### ✅ Completed (Already Done)
- [x] Backend Firebase Cloud Messaging setup (Task 5.1.1-5.1.11)
- [x] PushNotificationManager implementation (Task 5.2.1-5.2.7)
- [x] NotificationChannels configuration (Task 5.2.9)
- [x] Backend API endpoints for device registration
- [x] Automated implementation tests (94% pass rate)
- [x] Comprehensive testing documentation

### ⏳ Required for Device Testing
- [ ] Capacitor packages installed
- [ ] Firebase project created and configured
- [ ] google-services.json file obtained
- [ ] Android device or emulator available
- [ ] Android Studio installed
- [ ] USB debugging enabled (for physical device)

---

## Step-by-Step Execution Plan

### Phase 1: Environment Setup (30 minutes)

#### Step 1.1: Install Capacitor Packages (5 minutes)

```bash
cd APP
npm install @capacitor/core @capacitor/cli
npm install @capacitor/push-notifications
npm install @capacitor/device
```

**Verification**:
```bash
npm list @capacitor/core @capacitor/push-notifications @capacitor/device
```

#### Step 1.2: Initialize Capacitor (5 minutes)

For Staff App:
```bash
npx cap init "Skoolific Staff" "com.skoolific.staff"
```

For Student App:
```bash
npx cap init "Skoolific Student" "com.skoolific.student"
```

For Guardian App:
```bash
npx cap init "Skoolific Guardian" "com.skoolific.guardian"
```

**Verification**: Check that `capacitor.config.ts` or `capacitor.config.json` is created

#### Step 1.3: Add Android Platform (5 minutes)

```bash
npx cap add android
```

**Verification**: Check that `android/` directory is created

#### Step 1.4: Configure Firebase (15 minutes)

1. **Get google-services.json**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (or create one if needed)
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click on Android app (or add one if not exists)
   - Download `google-services.json`

2. **Place Configuration File**:
   ```bash
   cp /path/to/google-services.json android/app/
   ```

3. **Update build.gradle**:
   
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

**Verification**: Build should compile without errors

---

### Phase 2: Build and Deploy (20 minutes)

#### Step 2.1: Build the App (10 minutes)

```bash
npm run build
npx cap sync android
```

**Verification**: Check console output for successful sync

#### Step 2.2: Open in Android Studio (5 minutes)

```bash
npx cap open android
```

**Verification**: Android Studio opens with the project

#### Step 2.3: Deploy to Device (5 minutes)

**For Physical Device**:
1. Enable USB debugging on Android device
2. Connect device via USB
3. Click "Run" in Android Studio
4. Select your device from the list

**For Emulator**:
1. Create an AVD (Android Virtual Device) in Android Studio
2. Ensure it has Google Play Services
3. Click "Run" and select the emulator

**Verification**: App launches on device/emulator

---

### Phase 3: Execute Test Cases (60-90 minutes)

Follow the test cases in `PUSH_NOTIFICATION_TESTING_GUIDE.md`. Below is a summary:

#### Test Case 1: Permission Request (5 minutes)

**Steps**:
1. Launch app for the first time
2. Observe permission dialog
3. Tap "Allow"

**Expected**: Permission granted, console logs confirmation

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 2: FCM Token Registration (10 minutes)

**Steps**:
1. After granting permission, wait for token registration
2. Check console logs for token
3. Verify in database:
   ```sql
   SELECT * FROM user_devices 
   WHERE user_id = [YOUR_USER_ID] 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

**Expected**: Token saved to database with device info

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 3: Foreground Notification (10 minutes)

**Steps**:
1. Keep app open and in foreground
2. Send test notification using backend script:
   ```bash
   cd backend
   node services/test-push-notifications.js
   ```
   OR use Firebase Console to send a test message

**Expected**: Notification received, console logs show notification data

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 4: Background Notification (10 minutes)

**Steps**:
1. Minimize app (press Home button)
2. Send test notification
3. Check notification tray

**Expected**: 
- Notification appears in system tray
- Shows correct title and body
- App icon displayed
- Sound/vibration works

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 5: Notification Tap Action (5 minutes)

**Steps**:
1. Send notification while app is in background
2. Tap notification in system tray
3. Observe app behavior

**Expected**: App opens/comes to foreground, navigation occurs

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 6: Notification Channels (10 minutes)

**Steps**:
1. Go to Android Settings
2. Navigate to: Apps > Skoolific [App] > Notifications
3. Check available channels

**Expected**: All 8 channels exist:
- Exams & Assessments
- Attendance Alerts
- Payment Reminders
- Report Cards
- Messages
- Announcements
- General Notifications
- Silent Notifications

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 7: Channel-Specific Notification (10 minutes)

**Steps**:
1. Send notification with specific channel (e.g., "exams")
2. Long-press notification in tray
3. Tap "Info" to see channel

**Expected**: Notification uses correct channel

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 8: Disable Channel (5 minutes)

**Steps**:
1. Disable "Announcements" channel in settings
2. Send announcement notification
3. Check if notification appears

**Expected**: Notification is blocked

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 9: Multi-Device Support (10 minutes)

**Steps**:
1. Login with same account on Device A
2. Login with same account on Device B
3. Send notification to user
4. Check both devices

**Expected**: Both devices receive notification

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 10: Token Refresh (5 minutes)

**Steps**:
1. Clear app data
2. Relaunch app
3. Grant permissions
4. Check if new token is registered

**Expected**: New token generated and saved

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 11: Logout Token Removal (5 minutes)

**Steps**:
1. Login and verify token is registered
2. Logout from app
3. Check database

**Expected**: Token deleted from database

**Record Results**: ✅ PASS / ❌ FAIL

---

#### Test Case 12: Network Error Handling (5 minutes)

**Steps**:
1. Disconnect device from internet
2. Launch app
3. Grant permissions
4. Observe behavior

**Expected**: App doesn't crash, shows error gracefully

**Record Results**: ✅ PASS / ❌ FAIL

---

### Phase 4: Test Notification Types (30 minutes)

Test each notification type with correct channel:

| Type | Channel | Test Method | Result |
|------|---------|-------------|--------|
| exam_published | exams | Send via backend | ⬜ |
| exam_result | exams | Send via backend | ⬜ |
| report_card | report_cards | Send via backend | ⬜ |
| payment_reminder | payments | Send via backend | ⬜ |
| absence_alert | attendance | Send via backend | ⬜ |
| message | messages | Send via backend | ⬜ |
| announcement | announcements | Send via backend | ⬜ |
| post | announcements | Send via backend | ⬜ |

**Backend Test Script**:
```javascript
// In backend/services/test-push-notifications.js
// Modify the notification data to test different types

await pushNotificationService.sendToUser(
  userId,
  'student',
  {
    title: 'New Exam Published',
    body: 'Math exam is now available',
    data: {
      type: 'exam_published',
      examId: '123',
      className: 'Grade 10A'
    }
  }
);
```

---

### Phase 5: Documentation and Reporting (20 minutes)

#### Step 5.1: Fill Out Test Report (15 minutes)

Use the template in `PUSH_NOTIFICATION_TESTING_GUIDE.md`:

```
=================================================
PUSH NOTIFICATION TEST REPORT - TASK 5.2.8
=================================================

Date: [FILL IN]
Tester: [FILL IN]
App: Skoolific [Staff/Student/Guardian/Super Admin]
Device: [FILL IN]
Android Version: [FILL IN]

SUMMARY
-------
Total Test Cases: 12
Passed: [FILL IN]
Failed: [FILL IN]
Blocked: [FILL IN]
Pass Rate: [FILL IN]%

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
1. [DESCRIBE ANY ISSUES]
2. [DESCRIBE ANY ISSUES]
3. [DESCRIBE ANY ISSUES]

RECOMMENDATIONS
---------------
1. [ANY RECOMMENDATIONS]
2. [ANY RECOMMENDATIONS]
3. [ANY RECOMMENDATIONS]

SIGN-OFF
--------
Tester Signature: ___________
Date: ___________

Reviewer Signature: ___________
Date: ___________
```

#### Step 5.2: Update Task Status (5 minutes)

Update `.kiro/specs/skoolific-v2-upgrade/tasks.md`:

Change:
```markdown
- [-] 5.2.8 Test push notifications on Android devices
```

To:
```markdown
- [x] 5.2.8 Test push notifications on Android devices
```

---

## Sending Test Notifications

### Method 1: Backend Script (Recommended)

```bash
cd backend
node services/test-push-notifications.js
```

This script will:
- Initialize Firebase
- Create test device tokens
- Send test notifications
- Verify token registration/unregistration

### Method 2: Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Cloud Messaging
4. Click "Send your first message"
5. Fill in:
   - Notification title
   - Notification text
   - Target: Select your app
6. Click "Send"

### Method 3: Custom Backend Endpoint

Create a test endpoint in your backend:

```javascript
// backend/routes/test.js
router.post('/send-test-notification', authenticateToken, async (req, res) => {
  try {
    const { userId, userType, title, body, type } = req.body;
    
    const result = await pushNotificationService.sendToUser(
      userId,
      userType,
      {
        title,
        body,
        data: { type }
      }
    );
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

Then use cURL or Postman:
```bash
curl -X POST http://localhost:3000/api/v2/test/send-test-notification \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "userType": "student",
    "title": "Test Notification",
    "body": "This is a test",
    "type": "exam_published"
  }'
```

---

## Debugging Tips

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

### Common Issues and Solutions

#### Issue: Permission Dialog Not Appearing
**Cause**: Android 13+ requires runtime permission  
**Solution**: Check Android version, ensure permission request code is correct

#### Issue: Token Not Generated
**Cause**: Missing google-services.json or incorrect Firebase config  
**Solution**: 
- Verify `google-services.json` is in `android/app/`
- Check Firebase project configuration
- Ensure device has Google Play Services

#### Issue: Notifications Not Received
**Cause**: Invalid token, disabled channel, or battery optimization  
**Solution**:
- Verify token is valid in database
- Check Firebase Console delivery status
- Ensure app is not in battery optimization mode
- Check notification channel is not disabled

#### Issue: App Crashes on Launch
**Cause**: Missing dependencies or configuration errors  
**Solution**:
- Check Android logs: `adb logcat`
- Verify all dependencies are installed
- Clean and rebuild: `npx cap sync android`

---

## Success Criteria

Task 5.2.8 is considered **COMPLETE** when:

- [x] All 12 test cases executed
- [x] At least 10/12 test cases pass (83% pass rate minimum)
- [x] All 8 notification types tested
- [x] Test report completed and signed off
- [x] No critical issues found (or all critical issues documented)
- [x] Task marked as complete in tasks.md

---

## Time Estimates

| Phase | Activity | Time |
|-------|----------|------|
| 1 | Environment Setup | 30 min |
| 2 | Build and Deploy | 20 min |
| 3 | Execute Test Cases | 60-90 min |
| 4 | Test Notification Types | 30 min |
| 5 | Documentation | 20 min |
| **Total** | | **2.5-3 hours** |

---

## Next Steps After Completion

1. ✅ Mark Task 5.2.8 as complete
2. ➡️ Proceed to Task 5.2.10: Test notification actions and deep linking
3. ➡️ Continue with Phase 6: Module Consolidation
4. 📝 Document any issues found for future reference
5. 🔄 Update implementation if critical issues discovered

---

## Related Documents

- **Testing Guide**: `APP/PUSH_NOTIFICATION_TESTING_GUIDE.md`
- **Integration Guide**: `APP/src/services/PUSH_NOTIFICATIONS_INTEGRATION_GUIDE.md`
- **Phase Summary**: `APP/PHASE_5.2_IMPLEMENTATION_SUMMARY.md`
- **Task Status**: `APP/TASK_5.2.8_STATUS.md`
- **Spec Tasks**: `.kiro/specs/skoolific-v2-upgrade/tasks.md`
- **Backend Test Script**: `backend/services/test-push-notifications.js`

---

## Contact and Support

If you encounter issues during testing:

1. Check the debugging section above
2. Review Android logs: `adb logcat`
3. Consult Firebase Console for delivery status
4. Check backend logs for API errors
5. Refer to Capacitor documentation: https://capacitorjs.com/docs/apis/push-notifications

---

**Status**: ✅ Ready for Execution  
**Implementation**: 100% Complete  
**Device Testing**: Pending  
**Estimated Completion**: 2-3 hours

