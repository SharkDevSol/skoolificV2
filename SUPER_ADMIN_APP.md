# IQRA Super Admin app (APK)

App name: **IQRA Super Admin** · Package: `com.skoolific.superadmin` · Version 1.0.1 (code 2)
Firebase project: **iqra-staff1** (Android app `com.skoolific.superadmin` registered)

## APK location
```
SERVER: /var/www/app-downloads/iqra/super-admin/android/iqra-super-admin-v1.0.1.apk
URL   : https://iqra.skoolific.com/apps/iqra/super-admin/android/iqra-super-admin-v1.0.1.apk
```
Listed in `/var/www/app-downloads/versions.json` under `iqra/super-admin`.

## Features
- Login with a **super admin** account (khalif / abdi).
- Dashboard: total students (boys/girls), attendance rate, collected, pending, faults, per-branch cards.
- Students tab: per-branch totals + class breakdown.
- Finance tab: expected / collected / pending + per branch.
- Settings: branch filter (ALL, IQRA2–5), signed-in user, daily notification info, logout.
- **Only IQRA2–5** are shown — IQRA1 (demo) is excluded by the backend.
- **Daily push notification at 08:00** with the latest totals (the app registers its FCM token with
  `POST /api/super-admin/register-device`; the server sends via the iqra-staff1 project).

## Rebuild
On the server (`/root/build/super-admin-app`):
```bash
cd /root/build/super-admin-app
/opt/flutter/bin/flutter build apk --release
cp build/app/outputs/flutter-apk/app-release.apk \
   /var/www/app-downloads/iqra/super-admin/android/iqra-super-admin-v1.0.1.apk
```
`android/key.properties` uses the shared upload keystore.

## Notes
- v1.0.1 fixed the immediate crash on open: `MainActivity` now lives in
  `com.skoolific.superadmin` (it was still `com.skoolific.super_admin_app`).
- The daily email (Super Admin → Settings → Daily Report Notification) still needs real SMTP
  credentials in the backend `.env` (`SMTP_USER` / `SMTP_PASS` are placeholders today).
- The push works without SMTP: it only needs the app installed and logged in once.
