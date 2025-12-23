@echo off
echo ==================================
echo Organization Chart Manager Setup
echo ==================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X] Node.js is not installed.
    echo Please install Node.js 18 or higher: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js version: %NODE_VERSION%
echo.

REM Install npm packages
echo [..] Installing dependencies...
call npm install

if %ERRORLEVEL% equ 0 (
    echo.
    echo [OK] Installation completed!
    echo.
    echo How to run:
    echo   run_dev.bat     - Start development server
    echo   npm run build   - Production build
    echo.
) else (
    echo [X] Error occurred during package installation.
    pause
    exit /b 1
)

pause
