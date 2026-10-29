# App builds — one store for every app (APK + future iOS)

All installable app builds live in **one place on the server**:

```
/var/www/app-downloads/
├── versions.json                     # machine-readable manifest (all schools/apps/platforms)
├── README.txt                        # the written rule (read this before adding a build)
├── iqra/
│   ├── staff/android/staff-app.apk           # ONE staff app - serves IQRA **and** BILAL
│   ├── staff/android/version.json            # staff in-app updater
│   ├── staff/ios/README-ios.md
│   ├── parent/android/iqra-parent-v5.13.apk
│   ├── parent/android/archive/               # old iqra parent builds (5.6 - 5.12)
│   └── parent/ios/README-ios.md
├── bilal/
│   ├── staff/android/staff-app.apk           # symlink -> iqra/staff/android/staff-app.apk
│   ├── staff/ios/README-ios.md
│   ├── parent/android/bilal-parent-v1.0.2.apk
│   ├── parent/android/bilal-parent-v1.0.2-play.aab    # Google Play upload bundle
│   ├── parent/android/archive/               # 1.0.0, 1.0.1
│   ├── parent/ios/README-ios.md
│   ├── student/android/bilal-student-v1.0.0.apk
│   └── student/ios/README-ios.md
└── shared/
    └── stock/android/iki-stock-app.apk       # IKI stock app (not school-specific)
```

Rule: **`<school>/<app>/<platform>/<file>`**, latest build only; old versions go to
`<app>/android/archive/`. iOS folders stay empty (with a README) until an iOS build exists.
This is the **only** place builds are kept — nothing outside `/var/www/app-downloads/`.

## Public download URLs (both schools, HTTPS)

| What | URL |
|---|---|
| Manifest | `https://iqra.skoolific.com/apps/versions.json` |
| Staff app (iqra & bilal) | `https://iqra.skoolific.com/apps/iqra/staff/android/staff-app.apk` |
| Iqra parent app | `https://iqra.skoolific.com/apps/iqra/parent/android/iqra-parent-v5.13.apk` |
| Bilal parent app (APK) | `https://bilal.skoolific.com/apps/bilal/parent/android/bilal-parent-v1.0.2.apk` |
| Bilal parent app (Play AAB) | `https://bilal.skoolific.com/apps/bilal/parent/android/bilal-parent-v1.0.2-play.aab` |
| Bilal student app | `https://bilal.skoolific.com/apps/bilal/student/android/bilal-student-v1.0.0.apk` |
| Stock app | `https://iqra.skoolific.com/apps/shared/stock/android/iki-stock-app.apk` |
| Browse everything | `https://<school>.skoolific.com/apps/` |
| In-app staff updater | `https://iqra.skoolific.com/downloads/staff-app/version.json` |

## Current apps

| App | Project | Version | Android | iOS |
|---|---|---|---|---|
| Staff (iqra + bilal, one app) | `flutter-staff-app` | 1.1.2+5 | ✅ | ✅ Codemagic → TestFlight (`com.skoolific.iqraStaff`) |
| Iqra Parent | `flutter-parent-app` | 5.13 | ✅ | ✅ Codemagic → TestFlight (`com.skoolific.iqraParent`) |
| Bilal Parent | `flutter-bilal-parent-app` | 1.0.2 (code 3) | ✅ APK + **Play AAB** | ✅ Codemagic → TestFlight (`com.skoolific.bilalParent`) |
| Bilal Student | `flutter-bilal-student-app` | 1.0.0 | ✅ | ✅ Codemagic → TestFlight (`com.skoolific.bilalStudent`) |

### Where the iOS builds live

iOS is built by **Codemagic** (cloud macOS) — root `codemagic.yaml` — because Apple builds
cannot be made on this Linux server. There are four workflows:

| Workflow | App directory | Bundle ID | Publishing |
|---|---|---|---|
| `iqra-staff-ios` | `flutter-staff-app` | `com.skoolific.iqraStaff` | `flutter build ipa` → App Store Connect → **TestFlight** |
| `iqra-parent-ios` | `flutter-parent-app` | `com.skoolific.iqraParent` | TestFlight |
| `bilal-parent-ios` | `flutter-bilal-parent-app` | `com.skoolific.bilalParent` | TestFlight |
| `bilal-student-ios` | `flutter-bilal-student-app` | `com.skoolific.bilalStudent` | TestFlight |

- Trigger: push/tag on `main`; uses env group `ios_credentials` + the
  **"OneCo Solutions"** App Store Connect integration.
- The `.ipa` is a Codemagic build artifact (`build/ios/ipa/*.ipa`) — download it from the
  Codemagic build page or let it go to TestFlight; copy it into
  `/var/www/app-downloads/<school>/<app>/ios/` to keep it in the single app store.
- Each iOS project now has a `Podfile` and `ios/Runner/GoogleService-Info.plist`
  (Firebase iOS apps registered: iqra-parent → `com.skoolific.iqraParent` +
  `com.skoolific.bilalStudent`, bilal-parent → `com.skoolific.bilalParent`,
  iqra-staff1 → `com.skoolific.iqraStaff`). The workflow adds the plist to the Xcode
  project automatically. Push on iOS still needs an **APNs auth key** uploaded to Firebase.
- There is **no separate Bilal Staff app**: `flutter-staff-app` is one app used by both schools.

## Publishing a new build

**Everything goes in `/var/www/app-downloads/` — this is the only location.**

1. Build:
   - Android APK: `flutter build apk --release`
   - Google Play: `flutter build appbundle --release` → `build/app/outputs/bundle/release/app-release.aab`
2. Copy it into the store with a versioned name:
   `scp <file> iqra-vps:/var/www/app-downloads/<school>/<app>/android/<app>-v<version>.apk`
   `scp app-release.aab iqra-vps:/var/www/app-downloads/<school>/<app>/android/<app>-v<version>-play.aab`
3. Move the **previous** version into `<school>/<app>/android/archive/` (latest stays on top).
4. Update `/var/www/app-downloads/versions.json` (version, bytes, sha256, built, aab entry).
5. For the **staff** app also bump `/var/www/app-downloads/iqra/staff/android/version.json`
   (`version` + `apk_url`) — that is what the in-app updater reads.
6. Play uploads: keep `versionCode` higher than the last one uploaded to the Console.

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
