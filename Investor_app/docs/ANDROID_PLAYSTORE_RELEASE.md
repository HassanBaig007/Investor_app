# Android Play Store Release (Bare / Prebuild)

## 1) Create upload keystore (one-time)
From `Investor_app` root:

```bash
keytool -genkeypair -v -storetype JKS -keystore keystore/splitflow-upload-key.jks -alias splitflow-upload -keyalg RSA -keysize 2048 -validity 10000
```

## 2) Configure signing secrets
- Copy `android/keystore.properties.example` to `android/keystore.properties`.
- Fill:
  - `SPLITFLOW_UPLOAD_STORE_FILE`
  - `SPLITFLOW_UPLOAD_STORE_PASSWORD`
  - `SPLITFLOW_UPLOAD_KEY_ALIAS`
  - `SPLITFLOW_UPLOAD_KEY_PASSWORD`

`android/keystore.properties` is ignored by git.

## 3) Build release artifacts
- Play Store AAB (required):
  - `npm run android:bundle:release`
- Optional local APK:
  - `npm run android:apk:release`

Or run helper batch script:
- `generate_apk.bat` (builds AAB first, then APK)

## 4) Upload to Play Console
- Use `app-release.aab` from:
  - `android/app/build/outputs/bundle/release/app-release.aab`

## 5) Important safeguards
- Release build now fails if signing values are missing.
- For local non-production testing only, you may set:
  - `SPLITFLOW_ALLOW_DEBUG_RELEASE_SIGNING=true`
- Never upload debug-signed artifacts to Play Store.

## 6) Native-only workflow note
This project now runs as pure React Native Android (no Expo prebuild step).
Use these commands for local build verification:
- `npm run android:clean:win`
- `npm run android:debug:win`
