@echo off
where nssm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] nssm not found on PATH. Install via: scoop install nssm
  exit /b 1
)
nssm stop omniroute-dashboard
echo [OK] omniroute-dashboard stopped.
