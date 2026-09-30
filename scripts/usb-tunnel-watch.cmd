@echo off
setlocal EnableExtensions
title Warning Blackspot - USB link (keep alive)

rem ---------------------------------------------------------------------------
rem  Keeps `adb reverse tcp:8787 tcp:8787` applied for as long as this window
rem  is open.
rem
rem  adb reverse is dropped when the cable is unplugged or the phone reboots,
rem  so this polls every few seconds and re-applies the tunnel. It also waits
rem  for the first phone to appear, so it is safe to start before plugging in.
rem
rem  Close this window to stop managing the tunnel.
rem ---------------------------------------------------------------------------

set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
set "PORT=8787"

if not exist "%ADB%" (
  echo [X] adb not found at %ADB%
  echo     Install Android SDK platform-tools and try again.
  echo.
  pause
  exit /b 1
)

echo ============================================================
echo   Warning Blackspot - USB link
echo ============================================================
echo.
echo   Waiting for a USB phone and keeping its localhost:%PORT%
echo   forwarded to this PC. Close this window to stop.
echo.

set "LAST="

:loop
set "STATE="
for /f "delims=" %%S in ('"%ADB%" get-state 2^>nul') do set "STATE=%%S"

if /i "%STATE%"=="device" (
  rem Only re-apply when the link is missing, so we do not churn the tunnel.
  rem `adb reverse --list` writes to stderr, hence the 2^>^&1.
  set "HAS="
  for /f "delims=" %%L in ('"%ADB%" reverse --list 2^>^&1') do (
    echo %%L | findstr /c:"tcp:%PORT%" >nul 2>nul && set "HAS=1"
  )

  if defined HAS (
    if not "%LAST%"=="ok" echo [%TIME:~0,8%] Tunnel active.
    set "LAST=ok"
  ) else (
    "%ADB%" reverse tcp:%PORT% tcp:%PORT% >nul 2>nul
    if errorlevel 1 (
      echo [%TIME:~0,8%] Could not apply the tunnel; will retry.
      set "LAST=retry"
    ) else (
      echo [%TIME:~0,8%] Phone connected - tunnel applied ^(phone localhost:%PORT% -^> this PC^).
      set "LAST=ok"
    )
  )
) else (
  if not "%LAST%"=="wait" echo [%TIME:~0,8%] No phone detected - waiting for a USB device.
  set "LAST=wait"
)

rem ~5 second poll without relying on timeout's exit code.
ping -n 6 127.0.0.1 >nul 2>nul
goto :loop
