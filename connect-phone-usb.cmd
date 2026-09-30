@echo off
setlocal EnableExtensions
title Warning Blackspot - connect phone over USB

rem ---------------------------------------------------------------------------
rem  Sets up the USB link between this PC and a USB-connected Android phone.
rem
rem  Campus / corporate Wi-Fi often blocks phone-to-PC traffic (client
rem  isolation), so the app cannot reach the reports API over the network.
rem  adb reverse tunnels the phone's localhost to this PC instead, which works
rem  over the USB cable with no firewall or Wi-Fi requirements.
rem
rem  Double-click this, then open the app on the phone and tap "Sync again now".
rem  Keep this window open while you use the app.
rem ---------------------------------------------------------------------------

set "SDK=%LOCALAPPDATA%\Android\Sdk"
set "ADB=%SDK%\platform-tools\adb.exe"
set "PORT=8787"

echo ============================================================
echo   Warning Blackspot - USB link setup
echo ============================================================
echo.

if not exist "%ADB%" (
  echo [X] adb was not found at:
  echo     %ADB%
  echo     Install Android SDK Platform-Tools, or connect over normal Wi-Fi.
  echo.
  pause
  exit /b 1
)

echo Checking for a USB-connected device...
"%ADB%" devices
echo.

"%ADB%" get-state >nul 2>nul
if errorlevel 1 (
  echo [X] No phone detected.
  echo     1. Enable Developer options on the phone.
  echo     2. Turn on "USB debugging" in Developer options.
  echo     3. Reconnect the cable and tap "Allow" on the phone prompt.
  echo.
  pause
  exit /b 1
)

echo Device found. Forwarding phone's localhost:%PORT% to this PC...
"%ADB%" reverse --remove-all >nul 2>nul
"%ADB%" reverse tcp:%PORT% tcp:%PORT%
if errorlevel 1 (
  echo [X] adb reverse failed. Try unplugging and reconnecting the cable.
  echo.
  pause
  exit /b 1
)

echo.
echo Current port-forwards:
"%ADB%" reverse --list
echo.
echo ============================================================
echo   Ready.
echo.
echo   1. Open the Warning Blackspot app on the phone.
echo   2. Go to the Queue tab and tap "Sync again now",
echo      or submit a new hazard report.
echo   3. It should now show as synced and appear on the dashboard.
echo.
echo   Keep this window open. Re-run this file after replugging
echo   the cable or restarting the phone.
echo ============================================================
echo.

echo Verifying the link from the phone side...
"%ADB%" shell "curl -s -m 5 http://localhost:%PORT%/api/health || echo (no curl on device - this is fine)"
echo.
pause
endlocal
