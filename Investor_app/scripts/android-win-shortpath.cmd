@echo off
setlocal

REM Ensure this script runs from Investor_app root regardless of invocation location
set "APP_ROOT=%~dp0.."
pushd "%APP_ROOT%" >nul

set "DRIVE=R:"
for %%I in ("%CD%") do set "APP_DIR_NAME=%%~nxI"
for %%I in ("%CD%\..") do set "TARGET=%%~fI"
set "SHORT_APP_PATH=%DRIVE%\%APP_DIR_NAME%"
set "GRADLE_ARGS=%*"
if "%GRADLE_ARGS%"=="" set "GRADLE_ARGS=installDebug"
set "APP_ID=com.lohithms.investflow"
set "MAIN_ACTIVITY=.MainActivity"

subst %DRIVE% "%TARGET%" >nul 2>&1
if errorlevel 1 (
  echo Failed to create subst drive %DRIVE% for "%TARGET%".
  popd >nul
  exit /b 1
)

pushd %SHORT_APP_PATH%\android >nul
call gradlew.bat %GRADLE_ARGS%
if errorlevel 1 goto :cleanup_fail
popd >nul

if /I "%GRADLE_ARGS%"=="installDebug" (
  adb start-server >nul 2>&1
  adb reverse tcp:8081 tcp:8081 >nul 2>&1
  adb reverse tcp:3000 tcp:3000 >nul 2>&1
  adb shell am start -n %APP_ID%/%MAIN_ACTIVITY% >nul 2>&1
)

subst %DRIVE% /d >nul 2>&1
popd >nul
endlocal
exit /b 0

:cleanup_fail
set "ERR=%ERRORLEVEL%"
popd >nul
subst %DRIVE% /d >nul 2>&1
popd >nul
endlocal
exit /b %ERR%
