@echo off
echo ==================================
echo Organization Chart Manager - Dev Server
echo ==================================
echo.

REM Check node_modules
if not exist "node_modules" (
    echo [..] Dependencies not installed.
    echo Please run setup.bat first.
    pause
    exit /b 1
)

echo [..] Starting development server...
echo Open http://localhost:3000 in your browser.
echo.
echo Press Ctrl + C to stop.
echo.

call npm run dev
