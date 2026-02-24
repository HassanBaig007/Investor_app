# Windows Native Build Path-Length Fix

## Problem
On long workspace paths, Android native builds can fail in `react-native-worklets` with warnings like:
- `The object file directory ... has 209 characters`
- `ninja: error: manifest 'build.ninja' still dirty after 100 tries`

## Implemented Fix
Use a temporary mapped drive (`R:`) so Gradle/CMake run from a shorter root path.

## Commands
From `Investor_app`:
- `npm run android:clean:win`
- `npm run android:debug:win`
- `npm run android:bundle:release:win`

## Notes
- This does not change app code behavior; it only shortens build paths for Windows native toolchains.
- Keep using normal scripts on CI/macOS/Linux.
