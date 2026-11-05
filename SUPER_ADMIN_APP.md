# IQRA Super Admin app (APK)

App name: **IQRA Super Admin** · Package: `com.skoolific.superadmin` · Version 2.0.0 (code 7)
Firebase project: **iqra-staff1** (Android app `com.skoolific.superadmin` registered)

## Approach
The app is **fully native Flutter** — it does **not** load the website in a WebView.
The screens, colours, fonts, cards, floating notch navigation, filters and tables are
rebuilt in Flutter to match `https://iqra.skoolific.com/super-admin` on a phone, and
they call the same backend APIs the web page uses.

### Tabs
- **Floating notch tab bar:** Home · Students · Finance · **+**
- Tapping **+** opens a floating sheet with **Attendance · Marks · Faults · SMS · Settings**
- Home: total students hero, attendance rate, collected/pending fees, faults, per-branch cards.
- Students: totals, old/new, added-by-date picker, added-students list, per-branch/class tables.
- Attendance: Monthly / Weekly / Daily Ethiopian calendar views, ring, legend, leaderboards, class table.
- Marks: term / class / search filters, KPIs, highest & lowest ranked students, per-subject top scorers.
- Faults: Ethiopian year/month filters, totals, branch bars, class table.
- Finance: live audit, month filter, KPIs, month performance, fee schedule, per-branch class tables,
  unassigned students, unpaid directory (search/filter/pagination), advance payments, by-class bars,
  and **Download Official PDF Report**.
- SMS: compose & send, recipient picker, counters, by-template breakdown, logs, retry failed.
- Settings: account password/username, branch admin accounts (IQRA2–IQRA5),
  daily report notification (email + push), language, dark mode, **logout**.

### Behaviour
- **Remember me** on the login screen (prefills the saved username).
- Header has a **refresh** button; logout lives in **Settings**.
- **Dark / light mode** across the whole app (persisted).
- Reports load **lazily per tab** and are cached; switching tabs does not refetch.
- Pull-to-refresh on every tab.
- IQRA1 (demo) is filtered out everywhere — only IQRA2–IQRA5 appear.
- PDF is generated on the phone (`pdf` package) and opened in the Android share/save sheet.
- After login the FCM token is registered for the daily report push (08:00 scheduler).
- Languages: English, Somali, Amharic, Arabic (same translations as the web page).

## APK location
```
SERVER: /var/www/app-downloads/iqra/super-admin/android/iqra-super-admin-v2.0.0.apk
URL   : https://iqra.skoolific.com/apps/iqra/super-admin/android/iqra-super-admin-v2.0.0.apk
SHA256: 1eb0e4bebbc7eb4eeb3460dd3a2b12cd7ace3d0ffd30979f23e5110cd8a84b33
```
Listed in `/var/www/app-downloads/versions.json` under `iqra/super-admin`.
Older builds in `iqra/super-admin/android/archive/`.

## Build
```bash
cd /root/build/super-admin-app
/opt/flutter/bin/flutter pub get
/opt/flutter/bin/flutter analyze
/opt/flutter/bin/flutter test
/opt/flutter/bin/flutter build apk --release
cp build/app/outputs/flutter-apk/app-release.apk \
   /var/www/app-downloads/iqra/super-admin/android/iqra-super-admin-v2.0.0.apk
```
Source lives in `flutter-super-admin-app/` (lib/main.dart, api.dart, theme.dart, ui.dart,
login_page.dart, shell.dart, pdf_report.dart, l10n.dart, tabs/*).

## History
- 1.0.0: first build (crashed on open).
- 1.0.1: fixed `MainActivity` package, renamed to IQRA Super Admin, IQRA icon.
- 1.0.2: native tabs (partial parity).
- 1.0.3: native tabs + settings.
- 1.1.0: WebView of the real /super-admin page (rejected — user wants a native app).
- 1.1.1: PDF exports via native share sheet; dark/light, nav, logout and mobile sizing fixed on the web page.
- **2.0.0: fully native rebuild.** All eight tabs (Home, Students, Attendance, Marks, Faults,
  Finance, SMS, Settings), floating notch nav + “+” sheet, remember me, header refresh,
  settings logout, dark/light, per-tab lazy loading/cache, native PDF export, same APIs.
