# Android Bare Migration - Phase 2 (Implemented)

## Completed
- Switched app bootstrap to React Native `AppRegistry` (`main`) in `index.js`.
- Added deterministic API configuration support for bare/native and Expo compatibility.
- Added native migration scripts in `package.json`.
- Generated native Android project with `expo prebuild --platform android`.
- Enabled Git tracking of `android/` by removing `/android` from `.gitignore`.

## New Scripts
- `npm run start:metro`
- `npm run prebuild:android`
- `npm run prebuild:android:clean`
- `npm run android:native`
- `npm run android:bundle:release`
- `npm run android:apk:release`

## Working Notes
- `expo-doctor` reports one expected check once native folders are committed with Expo prebuild config in `app.json`.
- Keep `expo prebuild` in your sync workflow whenever Expo config changes (icons, splash, plugins, Android/iOS config).

## Suggested Next Phase
1. Move notification and file-sharing services to explicit native-ready interfaces.
2. Establish release signing and Play Store AAB pipeline.
3. Lock debug/staging/release backend URLs by build variant.
