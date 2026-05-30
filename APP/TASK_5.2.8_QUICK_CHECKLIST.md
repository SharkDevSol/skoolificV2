# Task 5.2.8: Android Push Notification Testing - Quick Checklist

## 🚀 Quick Start (Copy & Paste Commands)

### 1. Install Capacitor (5 minutes)
```bash
cd APP
npm install @capacitor/core @capacitor/cli @capacitor/push-notifications @capacitor/device
```

### 2. Initialize Capacitor (5 minutes)
```bash
# Choose one app to test first (Staff, Student, or Guardian)
npx cap init "Skoolific Staff" "com.skoolific.staff"
npx cap add android
```

### 3. Configure Firebase (10 minutes)
```bash
# 1. Download google-services.json from Firebase Console
# 2. Copy to android/app/
cp /path/to/google-services.json android/app/

# 3. Edit android/build.gradle - add this to buildscript dependencies:
#    classpath 'com.google.gms:google-services:4.3.15'

# 4. Edit android/app/build.gradle - add at bottom:
#    apply plugin: 'com.google.gms.google-services'
#    implementation 'com.google.firebase:firebase-messaging:23.0.0'
```

### 4. Build and Deploy (10 minutes)
```bash
npm run build
npx cap sync android
npx cap open android

# In Android Studio: Click "Run" button
```

---

## ✅ Test Checklist (Check off as you complete)

### Core Functionality Tests

- [ ] **TC1: Permission Request** (5 min)
  - Launch app → Permission dialog appears → Tap "Allow" → Permission granted

- [ ] **TC2: Token Registration** (10 min)
  - Token generated → Saved to backend → Verify in database

- [ ] **TC3: Foreground Notification** (10 min)
  - App open → Send test notification → Notification received

- [ ] **TC4: Background Notification** (10 min)
  - App minimized → Send notification → Appears in system tray

- [ ] **TC5: Notification Tap** (5 min)
  - Tap notification → App opens → Navigation works

- [ ] **TC6: Notification Channels** (10 min)
  - Check Settings → All 8 channels exist

- [ ] **TC7: Channel-Specific** (10 min)
  - Send with channel → Verify correct channel used

- [ ] **TC8: Disable Channel** (5 min)
  - Disable channel → Send notification → Blocked

- [ ] **TC9: Multi-Device** (10 min)
  - Login on 2 devices → Send notification → Both receive

- [ ] **TC10: Token Refresh** (5 min)
  - Clear app data → Relaunch → New token generated

- [ ] **TC11: Logout Removal** (5 min)
  - Logout → Token removed from database

- [ ] **TC12: Network Error** (5 min)
  - Disconnect internet → Launch app → No crash

### Notification Type Tests

- [ ] **exam_published** → exams channel
- [ ] **exam_result** → exams channel
- [ ] **report_card** → report_cards channel
- [ ] **payment_reminder** → payments channel
- [ ] **absence_alert** → attendance channel
- [ ] **message** → messages channel
- [ ] **announcement** → announcements channel
- [ ] **post** → announcements channel

---

## 📱 Send Test Notification (Choose One Method)

### Method A: Backend Script (Easiest)
```bash
cd backend
node services/test-push-notifications.js
```

### Method B: Firebase Console
1. Go to https://console.firebase.google.com/
2. Cloud Messaging → Send your first message
3. Fill in title/body → Select app → Send

### Method C: cURL Command
```bash
# Replace YOUR_USER_ID and YOUR_TOKEN
curl -X POST http://localhost:3000/api/v2/test/send-test-notification \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": YOUR_USER_ID,
    "userType": "student",
    "title": "Test Notification",
    "body": "This is a test",
    "type": "exam_published"
  }'
```

---

## 🐛 Quick Debugging

### View Logs
```bash
adb logcat | grep -i firebase
adb logcat | grep -i skoolific
```

### Check Token in Database
```sql
SELECT * FROM user_devices 
WHERE user_id = YOUR_USER_ID 
ORDER BY created_at DESC;
```

### Common Fixes
- **No permission dialog**: Check Android version (13+ needs runtime permission)
- **No token**: Verify google-services.json in android/app/
- **No notifications**: Check channel not disabled, battery optimization off
- **App crashes**: Run `adb logcat` and check errors

---

## 📊 Quick Test Report

```
Date: _______________
Device: _______________
Android Version: _______________

Results:
✅ Passed: ___ / 12
❌ Failed: ___ / 12
Pass Rate: ___%

Issues Found:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

Status: ✅ COMPLETE / ❌ INCOMPLETE
```

---

## ⏱️ Time Tracker

- [ ] Setup (30 min): _____ actual
- [ ] Build (20 min): _____ actual
- [ ] Testing (90 min): _____ actual
- [ ] Documentation (20 min): _____ actual
- **Total**: _____ actual (target: 2.5-3 hours)

---

## ✅ Completion Criteria

Task is COMPLETE when:
- [x] All 12 test cases executed
- [x] At least 10/12 pass (83%+)
- [x] All 8 notification types tested
- [x] Test report filled out
- [x] No critical issues (or documented)
- [x] Task marked complete in tasks.md

---

## 📚 Full Documentation

For detailed instructions, see:
- `TASK_5.2.8_EXECUTION_PLAN.md` - Complete step-by-step guide
- `PUSH_NOTIFICATION_TESTING_GUIDE.md` - Detailed test cases
- `src/services/PUSH_NOTIFICATIONS_INTEGRATION_GUIDE.md` - Integration guide

---

**Quick Status Check**:
```bash
# Run automated tests
node test-push-notifications.js

# Should show: 47 passed, 3 warnings (Capacitor packages)
```

