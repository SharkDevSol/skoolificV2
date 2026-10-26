# App builds — one store for every app (APK + future iOS)

All installable app builds live in **one place on the server**:

```
/var/www/app-downloads/
├── versions.json                     # machine-readable manifest (all schools/apps/platforms)
├── README.txt
├── iqra/
│   ├── staff/android/staff-app.apk           # ONE staff app - serves IQRA **and** BILAL
│   ├── staff/ios/README-ios.md
│   ├── parent/android/iqra-parent-v5.13.apk
│   └── parent/ios/README-ios.md
└── bilal/
    ├── staff/android/staff-app.apk           # same staff build (copy)
    ├── staff/ios/README-ios.md
    ├── parent/android/bilal-parent-v1.0.0.apk
    ├── parent/ios/README-ios.md
    ├── student/android/bilal-student-v1.0.0.apk
    └── student/ios/README-ios.md
```

Rule: **`<school>/<app>/<platform>/<file>`**, latest build only. iOS folders stay empty (with a
README) until an iOS build actually exists.

## Public download URLs (both schools, HTTPS)

| What | URL |
|---|---|
| Manifest | `https://iqra.skoolific.com/apps/versions.json` |
| Staff app (iqra & bilal) | `https://iqra.skoolific.com/apps/iqra/staff/android/staff-app.apk` |
| Iqra parent app | `https://iqra.skoolific.com/apps/iqra/parent/android/iqra-parent-v5.13.apk` |
| Bilal parent app | `https://bilal.skoolific.com/apps/bilal/parent/android/bilal-parent-v1.0.0.apk` |
| Bilal student app | `https://bilal.skoolific.com/apps/bilal/student/android/bilal-student-v1.0.0.apk` |
| Browse everything | `https://<school>.skoolific.com/apps/` |
| In-app staff updater | `https://iqra.skoolific.com/downloads/staff-app/version.json` |

## Current apps

| App | Project | Version | Android | iOS |
|---|---|---|---|---|
| Staff (iqra + bilal, one app) | `flutter-staff-app` | 1.1.2+5 | ✅ | ✅ Codemagic → TestFlight (`com.skoolific.iqraStaff`) |
| Iqra Parent | `flutter-parent-app` | 5.13 | ✅ | ✅ Codemagic → TestFlight (`com.skoolific.iqraParent`) |
| Bilal Parent | `flutter-bilal-parent-app` | 1.0.0 | ✅ | ✅ Codemagic → TestFlight (`com.skoolific.bilalParent`) |
| Bilal Student | `flutter-bilal-student-app` | 1.0.0 | ✅ | ❌ no iOS workflow yet |

### Where the iOS builds live

iOS is built by **Codemagic** (cloud macOS) — root `codemagic.yaml` — because Apple builds
cannot be made on this Linux server. There are three workflows:

| Workflow | App directory | Bundle ID | Publishing |
|---|---|---|---|
| `iqra-staff-ios` | `flutter-staff-app` | `com.skoolific.iqraStaff` | `flutter build ipa` → App Store Connect → **TestFlight** |
| `iqra-parent-ios` | `flutter-parent-app` | `com.skoolific.iqraParent` | TestFlight |
| `bilal-parent-ios` | `flutter-bilal-parent-app` | `com.skoolific.bilalParent` | TestFlight |

- Trigger: push/tag on `main`; uses env group `ios_credentials` + the
  **"OneCo Solutions"** App Store Connect integration.
- The `.ipa` is a Codemagic build artifact (`build/ios/ipa/*.ipa`) — download it from the
  Codemagic build page; it is **not** stored on this server and not in the public App Store
  listing (it is distributed through TestFlight).
- `flutter-bilal-student-app` has **no** iOS workflow (Android only) and there is no IQRA
  student app at all.

## Publishing a new build

1. Build: `flutter build apk --release` (Android) in the app's project.
2. Copy it into the store with a versioned name, e.g.
   `scp build/app/outputs/flutter-apk/app-release.apk iqra-vps:/var/www/app-downloads/iqra/parent/android/iqra-parent-v5.14.apk`
3. Update `/var/www/app-downloads/versions.json` (version, bytes, sha256, built date).
4. For the **staff** app also bump `/var/www/app-downloads/iqra/staff/android/version.json`
   (`version` + `apk_url`) — that is what the in-app updater reads.
5. Delete the previous version file in that folder (latest only).

## iOS (Codemagic)

iOS is already automated for **IQRA Staff, IQRA Parent and Bilal Parent** through
`codemagic.yaml` + the "OneCo Solutions" App Store Connect integration
(`submit_to_testflight: true`). To publish a new iOS build, push to `main` (or a tag) and pick the
workflow in Codemagic; the `.ipa` is under the build's artifacts.

To also ship an iOS build from this single store, download the `.ipa` from Codemagic and place it
in the matching `<school>/<app>/ios/` folder, then add it to `versions.json`.

For a brand-new iOS app (e.g. Bilal Student) you additionally need: an App Store Connect app
record + bundle ID, `ios/Runner/GoogleService-Info.plist` (Firebase push) and APNs key, and a
Codemagic workflow like the three above.

## nginx (already applied to `iqra.skoolific.com` and `bilal-school` vhosts)

```nginx
location /apps/ {
    alias /var/www/app-downloads/;
    autoindex on;
    autoindex_exact_size off;
    add_header Cache-Control "no-cache" always;
}
location /downloads/staff-app/ {
    alias /var/www/app-downloads/iqra/staff/android/;
    add_header Cache-Control "no-cache" always;
}
```

The `apk` MIME type (`application/vnd.android.package-archive`) is registered in
`/etc/nginx/mime.types`.
