@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Warning Blackspot - one-click launcher

rem ---------------------------------------------------------------------------
rem  Warning Blackspot - one-click launcher
rem
rem  Double-click this file to:
rem    1. install dependencies (first run only)
rem    2. start the field-reports API   (http://localhost:8787)
rem    3. start the dashboard web app   (http://localhost:5173)
rem    4. connect a USB phone to the API (adb reverse) and keep it connected
rem    5. open the dashboard in your browser
rem
rem  Usage:
rem    start-blackspot.cmd             API + dashboard + USB phone link
rem    start-blackspot.cmd mobile      also start the Expo mobile dev server
rem    start-blackspot.cmd nousb       skip the USB phone link
rem    start-blackspot.cmd mobile nousb
rem
rem  Why the USB link: campus and corporate Wi-Fi usually enable client
rem  isolation, so a phone cannot reach this PC over the network. adb reverse
rem  tunnels the phone's localhost:8787 to this PC over the USB cable instead.
rem  The built APK already tries http://localhost:8787 first.
rem
rem  Leave the spawned windows open while you work.
rem ---------------------------------------------------------------------------

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "DASH=%ROOT%\connectivity-dashboard1"
set "MOBILE=%ROOT%\mobile"
set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
set "WATCHER=%ROOT%\scripts\usb-tunnel-watch.cmd"
set "PORT=8787"

rem --- argument parsing (order independent) ------------------------------------
set "WITH_MOBILE="
set "WITH_USB=1"
for %%A in (%*) do (
  if /i "%%~A"=="mobile" set "WITH_MOBILE=mobile"
  if /i "%%~A"=="nousb"  set "WITH_USB="
)

echo ============================================================
echo   Warning Blackspot - dashboard + field reports API
echo ============================================================
echo.

if not exist "%DASH%\server\index.mjs" (
  echo [X] Could not find connectivity-dashboard1\server\index.mjs
  echo     Put this file in the repository root next to connectivity-dashboard1.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js was not found on your PATH.
  echo     Install Node.js 22 or newer from https://nodejs.org and try again.
  echo.
  pause
  exit /b 1
)

rem --- 1. dashboard dependencies -------------------------------------------------
if exist "%DASH%\node_modules" (
  echo [1/5] Dashboard dependencies already installed.
) else (
  echo [1/5] Installing dashboard dependencies ^(this can take a minute^)...
  pushd "%DASH%"
  call npm install
  if errorlevel 1 (
    echo [X] npm install failed. See the output above.
    popd
    pause
    exit /b 1
  )
  popd
)

rem --- 2. reports API ------------------------------------------------------------
echo [2/5] Starting the field-reports API on http://localhost:%PORT% ...
start "Blackspot API" /D "%DASH%" cmd /k node server\index.mjs

rem --- 3. dashboard --------------------------------------------------------------
echo [3/5] Starting the dashboard on http://localhost:5173 ...
start "Blackspot Dashboard" /D "%DASH%" cmd /k npm run dev

rem --- 4. USB phone link ---------------------------------------------------------
if not defined WITH_USB (
  echo [4/5] Skipping the USB phone link ^(nousb^).
  goto :after_usb
)

if not exist "%ADB%" (
  echo [4/5] adb not found at %ADB% - skipping the USB phone link.
  echo       Connect over normal Wi-Fi instead, or install Android SDK platform-tools.
  goto :after_usb
)

"%ADB%" get-state >nul 2>nul
if errorlevel 1 (
  echo [4/5] No USB phone detected yet.
  echo       Enable USB debugging on the phone, plug it in, then tap "Allow".
  echo       The phone link will be retried automatically for the next few minutes.
) else (
  echo [4/5] USB phone detected - linking its localhost:%PORT% to this PC.
)

rem The watcher keeps the tunnel alive across replugs, reboots and first-fix.
if exist "%WATCHER%" (
  start "Blackspot USB link" /D "%ROOT%" cmd /k "%WATCHER%"
) else (
  "%ADB%" reverse tcp:%PORT% tcp:%PORT% >nul 2>nul
  echo       Tunnel applied once ^(watcher script not found^).
)

:after_usb

rem --- 5. optional mobile dev server --------------------------------------------
if /i "%WITH_MOBILE%"=="mobile" (
  if exist "%MOBILE%\node_modules" (
    echo [5/5] Mobile dependencies already installed.
  ) else (
    echo [5/5] Installing mobile dependencies ^(this can take a few minutes^)...
    pushd "%MOBILE%"
    call npm install
    if errorlevel 1 (
      echo [X] npm install failed in the mobile folder.
      popd
      pause
      exit /b 1
    )
    popd
  )
  echo       Starting the Expo mobile dev server ^(scan the QR code with Expo Go^)...
  start "Blackspot Mobile" /D "%MOBILE%" cmd /k npx expo start
) else (
  echo [5/5] Skipping the mobile dev server. Add "mobile" to include it.
)

rem --- open the dashboard --------------------------------------------------------
echo.
echo Opening http://localhost:5173/ ...
timeout /t 4 /nobreak >nul
start "" http://localhost:5173/

echo.
echo ============================================================
echo   Running now (leave these windows open):
echo     - Blackspot API        http://localhost:%PORT%
echo     - Blackspot Dashboard  http://localhost:5173
if defined WITH_USB     echo     - Blackspot USB link   phone localhost:%PORT% to this PC
if /i "%WITH_MOBILE%"=="mobile" echo     - Blackspot Mobile     Expo dev server / QR code
echo ============================================================
echo.
echo   Phone reports arrive when a USB phone is linked OR the phone is on
echo   the same Wi-Fi with inbound TCP %PORT% allowed:
echo     netsh advfirewall firewall add rule name="Blackspot reports API" dir=in action=allow protocol=TCP localport=%PORT%
echo.
pause
endlocal
