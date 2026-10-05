# IQRA Parent

Flutter mobile app for IQRA school guardians/parents (`com.skoolific.guardian`).
Current version: **0.0.2+29** (see `pubspec.yaml`).

## 1. Source code location

Full Flutter source code:

```
C:\Users\hp\Desktop\v.2\SCHOOLS\SCHOOLS\FlutterIQRA\
```

Key subfolders: `lib/` (Dart source), `assets/` (images), `android/`, `ios/`, `APKs/` (release builds).

## 2. Built APK files (ready to install)

All compiled release builds are organized in the `APKs/` folder:

```
C:\Users\hp\Desktop\v.2\SCHOOLS\SCHOOLS\FlutterIQRA\APKs\
```

- 30 `.apk` files and 9 `.aab` files (Play Store bundles)
- Naming: `iqra-parent-v<version>.apk` / `.aab`

Latest builds (by date):

| File | Built |
|------|-------|
| iqra-parent-v0.0.2.apk (+ .aab) | 2026-10-01 |
| iqra-parent-v0.0.1.apk (+ .aab) | 2026-09-30 |
| iqra-parent-v5.13.4.apk (+ .aab) | 2026-09-30 |

Older builds: v4.0 – v5.13.3 (September 2026).

## 3. Standard Flutter build output

Fresh local builds land here:

```
FlutterIQRA\build\app\outputs\apk\release\app-release.apk
```

(`app-release.apk` is overwritten on every `flutter build apk --release`; copy it
into `APKs/` with the versioned name to keep it.)

## Build commands

```bash
flutter pub get
flutter build apk --release          # -> build\app\outputs\apk\release\app-release.apk
flutter build appbundle --release    # -> build\app\outputs\bundle\release\app-release.aab
```
