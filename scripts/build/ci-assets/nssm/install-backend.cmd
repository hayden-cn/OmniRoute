@echo off
setlocal
set "STANDALONE=%~dp0.."
if "%DATA_DIR%"=="" set "DATA_DIR=D:\omniroute-data"
set "PORT=20128"

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

if not exist "%STANDALONE%\dev\run-standalone.mjs" (
  echo [ERROR] run-standalone.mjs not found under %STANDALONE%
  exit /b 1
)

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%DATA_DIR%\logs" mkdir "%DATA_DIR%\logs"

nssm install omniroute-backend "%NODE_EXE%" "dev\run-standalone.mjs"
nssm set omniroute-backend AppDirectory "%STANDALONE%"
nssm set omniroute-backend AppEnvironmentExtra "DATA_DIR=%DATA_DIR%" "PORT=%PORT%"
nssm set omniroute-backend Start SERVICE_AUTO_START
nssm set omniroute-backend AppExit Default Restart
nssm set omniroute-backend AppStdout "%DATA_DIR%\logs\backend-stdout.log"
nssm set omniroute-backend AppStderr "%DATA_DIR%\logs\backend-stderr.log"
nssm set omniroute-backend AppRotateFiles 1
nssm set omniroute-backend AppRotateBytes 10485760

echo [OK] omniroute-backend installed. Starting...
nssm start omniroute-backend
