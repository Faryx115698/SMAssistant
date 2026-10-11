@echo off
title SMAssistant Development Server
echo ========================================================
echo   Starting Smart Assistant (Barangay Talimundoc)
echo ========================================================
echo.

rem Check if MySQL is running
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MySQL is running.
) else (
    echo [NOTICE] MySQL is not detected.
    echo If you need database features, make sure MySQL is started in XAMPP.
    echo.
)

echo Starting PHP built-in server on http://localhost:8000 ...
echo Press Ctrl+C in this window to stop the server.
echo.

start "" "http://localhost:8000/"
"C:\xampp\php\php.exe" -S localhost:8000
pause
