@echo off
echo ===================================================
echo   InvestFlow - Android Release Artifact Builder
echo ===================================================
echo.
echo [1/4] Cleaning previous builds...
cd android
call gradlew.bat clean

echo.
echo [2/4] Building Play Store AAB (bundleRelease)...
echo       This may take 5-10 minutes. Please wait...
call gradlew.bat bundleRelease

echo.
echo [3/4] Building Release APK (optional local install)...
call gradlew.bat assembleRelease

echo.
echo [4/4] Build Complete!
echo.
if exist "app\build\outputs\bundle\release\app-release.aab" (
    echo [SUCCESS] AAB generated successfully!
    echo Location: android\app\build\outputs\bundle\release\app-release.aab

    echo.
    echo Copying AAB to Downloads...
    copy "app\build\outputs\bundle\release\app-release.aab" "%USERPROFILE%\Downloads\InvestFlow_Release.aab"
    echo Copied to: %USERPROFILE%\Downloads\InvestFlow_Release.aab
) else (
    echo [ERROR] AAB file not found. Build may have failed.
    echo Check the output above for errors.
)

echo.
if exist "app\build\outputs\apk\release\app-release.apk" (
    echo [INFO] APK generated successfully!
    echo Location: android\app\build\outputs\apk\release\app-release.apk
    
    echo.
    echo Copying APK to Downloads...
    copy "app\build\outputs\apk\release\app-release.apk" "%USERPROFILE%\Downloads\InvestFlow_Release.apk"
    echo Copied to: %USERPROFILE%\Downloads\InvestFlow_Release.apk
) else (
    echo [WARN] APK file not found.
)

pause
