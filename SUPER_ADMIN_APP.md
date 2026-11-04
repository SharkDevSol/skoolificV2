# IQRA Super Admin app (APK)

App name: **IQRA Super Admin** · Package: `com.skoolific.superadmin` · Version 1.0.2 (code 3)
Firebase project: **iqra-staff1** (Android app `com.skoolific.superadmin` registered)

## APK location
```
SERVER: /var/www/app-downloads/iqra/super-admin/android/iqra-super-admin-v1.0.2.apk
URL   : https://iqra.skoolific.com/apps/iqra/super-admin/android/iqra-super-admin-v1.0.2.apk
```
Listed in `/var/www/app-downloads/versions.json` under `iqra/super-admin`.
Previous build archived in `iqra/super-admin/android/archive/`.

## Features (same content as the web /super-admin)
Tabs: **Home, Students, Attendance, Marks, Faults, Finance, Settings**.
- Home: total students (boys/girls), attendance rate, collected, pending, faults, per-branch cards.
- Students: per-branch totals + class breakdown.
- Attendance: rate, records, present/absent/late/permission + per branch.
- Marks: average score, graded students, subjects, per branch.
- Faults: totals per branch/class.
- Finance: expected, collected, pending, collection rate + per branch.
- Settings: branch filter (ALL, IQRA2–5), signed-in user, daily notification info, logout.
- **Only IQRA2–5** — IQRA1 (demo) is excluded by the backend.
- **Daily push at 08:00** with the latest totals (FCM via iqra-staff1).

## Speed
- Each tab loads **only its own report** (lazy), not all reports at startup.
- Results are cached per branch for 3 minutes; pull-to-refresh forces a reload.
- Requests run in parallel per tab.

## Rebuild
```bash
cd /root/build/super-admin-app
/opt/flutter/bin/flutter build apk --release
cp build/app/outputs/flutter-apk/app-release.apk \
   /var/www/app-downloads/iqra/super-admin/android/iqra-super-admin-v1.0.2.apk
```
`android/key.properties` uses the shared upload keystore.

## History
- 1.0.0: first build (crashed on open).
- 1.0.1: fixed `MainActivity` package, renamed to IQRA Super Admin, IQRA icon.
- 1.0.2: full web parity (all tabs) + per-tab lazy loading/cache.
