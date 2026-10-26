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
| Staff (iqra + bilal, one app) | `flutter-staff-app` | 1.1.2+5 | ✅ | ❌ |
| Iqra Parent | `flutter-parent-app` | 5.13 | ✅ | ❌ |
| Bilal Parent | `flutter-bilal-parent-app` | 1.0.0 | ✅ | ❌ |
| Bilal Student | `flutter-bilal-student-app` | 1.0.0 | ✅ | ❌ |

There is **no iOS build for any app**. All Flutter projects have an `ios/` folder, but none is
configured (`ios/Podfile` and `ios/Runner/GoogleService-Info.plist` are missing) and no `.ipa`
was ever built.

## Publishing a new build

1. Build: `flutter build apk --release` (Android) in the app's project.
2. Copy it into the store with a versioned name, e.g.
   `scp build/app/outputs/flutter-apk/app-release.apk iqra-vps:/var/www/app-downloads/iqra/parent/android/iqra-parent-v5.14.apk`
3. Update `/var/www/app-downloads/versions.json` (version, bytes, sha256, built date).
4. For the **staff** app also bump `/var/www/app-downloads/iqra/staff/android/version.json`
   (`version` + `apk_url`) — that is what the in-app updater reads.
5. Delete the previous version file in that folder (latest only).

## iOS (when you are ready)

Requires **macOS + Xcode**, then per project:
`flutter create .` (adds `ios/Podfile`), `cd ios && pod install`, add
`ios/Runner/GoogleService-Info.plist` from Firebase + APNs key, an Apple Developer Program
account ($99/yr) with a signing certificate/provisioning profile, then
`flutter build ios --release` and distribute via TestFlight/App Store. Put the `.ipa` into the
same `<school>/<app>/ios/` folder and add it to `versions.json`.

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
