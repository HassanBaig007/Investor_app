# Native E2E (Detox)

These tests target native Android flows (not Expo Go / Selenium).

## Prerequisites

- Android SDK + emulator available
- AVD name matching `DETOX_AVD_NAME` (default: `Pixel_6_API_34`)
- React Native Android toolchain working (`gradlew.bat assembleDebug`)

## Commands

- Build app + test APK:
  - `npm run test:e2e:native:build`
- Run native E2E tests:
  - `npm run test:e2e:native`

## Scope

- Launch/login shell smoke
- Login <-> signup navigation
- User/Admin mode toggle on login screen
