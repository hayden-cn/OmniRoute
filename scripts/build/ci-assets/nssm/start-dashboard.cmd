@echo off
setlocal
set "STANDALONE=%~dp0.."
if "%DATA_DIR%"=="" set "DATA_DIR=D:\omniroute-data"
set "PORT=20129"

where nssm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] nssm not found on PATH. Install via: scoop install nssm
  exit /b 1
)

set "NODE_EXE="
for /f "delims=" %%i in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"
if not defined NODE_EXE (
  echo [ERROR] node not found on PATH.
  exit /b 1
)

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%DATA_DIR%\logs" mkdir "%DATA_DIR%\logs"

sc query omniroute-dashboard >nul 2>nul
if errorlevel 1 (
  echo [INFO] installing omniroute-dashboard service...
  nssm install omniroute-dashboard "%NODE_EXE%" "dev\run-standalone.mjs"
  nssm set omniroute-dashboard AppDirectory "%STANDALONE%"
  nssm set omniroute-dashboard AppEnvironmentExtra "DATA_DIR=%DATA_DIR%" "PORT=%PORT%"
  nssm set omniroute-dashboard Start SERVICE_MANUAL
  nssm set omniroute-dashboard AppExit Default Restart
  nssm set omniroute-dashboard AppStdout "%DATA_DIR%\logs\dashboard-stdout.log"
  nssm set omniroute-dashboard AppStderr "%DATA_DIR%\logs\dashboard-stderr.log"
  nssm set omniroute-dashboard AppRotateFiles 1
  nssm set omniroute-dashboard AppRotateBytes 10485760
)

echo [OK] starting omniroute-dashboard...
nssm start omniroute-dashboard
