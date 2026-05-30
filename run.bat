@echo off
title AuraScope Startup Wizard
echo ======================================================================
echo   AURASCOPE: MULTI-SMELL DETECTOR & REFACTORING ENGINE
echo   Muhammad Soman Saeed (FA23-BSE-A-138)
echo ======================================================================
echo.

:: Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in system PATH.
    echo Please install Node.js (v18+) and try again.
    pause
    exit /b 1
)

:: Check Python installation
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in system PATH.
    echo Please install Python 3 and try again.
    pause
    exit /b 1
)

echo [1/3] Installing workspace dependencies...
call npm install --no-audit --no-fund

echo.
echo [2/3] Installing backend and frontend dependencies...
call npm run install-all

echo.
echo [3/3] Launching AuraScope application...
echo --------------------------------------------------
echo  - Backend Service:  http://localhost:5000
echo  - Frontend Web UI:  http://localhost:5173
echo --------------------------------------------------
echo.
call npm run start

pause
