# IQRA Super Admin app (APK)

App name: **IQRA Super Admin** · Package: `com.skoolific.superadmin` · Version 1.1.1 (code 6)
Firebase project: **iqra-staff1** (Android app `com.skoolific.superadmin` registered)

## Approach
The app **opens the real web page** `https://iqra.skoolific.com/super-admin` in a native
WebView shell — so the design, tabs and data are exactly the same as the website
(Home, Students, Attendance, Marks, Faults, Finance, Settings), with nothing missing.
It keeps the IQRA Super Admin name, IQRA icon, and the daily push notification:
after login inside the app, the token is read from the page and this device is
registered for the 08:00 push.

## APK location
```
SERVER: /var/www/app-downloads/iqra/super-admin/android/iqra-super-admin-v1.1.1.apk
URL   : https://iqra.skoolific.com/apps/iqra/super-admin/android/iqra-super-admin-v1.1.1.apk
```
Listed in `/var/www/app-downloads/versions.json` under `iqra/super-admin`.
Older builds in `iqra/super-admin/android/archive/`.

## Build
```bash
cd /root/build/super-admin-app
/opt/flutter/bin/flutter build apk --release
cp build/app/outputs/flutter-apk/app-release.apk \
   /var/www/app-downloads/iqra/super-admin/android/iqra-super-admin-v1.1.1.apk
```

## History
- 1.0.0: first build (crashed on open).
- 1.0.1: fixed `MainActivity` package, renamed to IQRA Super Admin, IQRA icon.
- 1.0.2: native tabs (partial parity).
- 1.0.3: native tabs + settings.
- 1.1.1: PDF exports via native share sheet; dark/light, nav, logout and mobile sizing fixed on the web page.\n- 1.1.0: **WebView of the real /super-admin page** — 100% parity with the web design/data,
  plus daily push registration.
