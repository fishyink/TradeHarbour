@echo off
echo ===============================================
echo   Trade Harbour - White Screen Fix
echo ===============================================
echo.
echo If Trade Harbour shows a white screen, this will
echo install the most common fix: Visual C++ Redistributable
echo.
echo Common causes of white screen:
echo 1. Missing Visual C++ Redistributable (most common)
echo 2. Antivirus software blocking the app
echo 3. Running from a restricted network location
echo 4. Missing Windows updates
echo.
pause

echo.
echo Downloading Microsoft Visual C++ Redistributable...

rem Create temp directory
if not exist "%TEMP%\TradeHarbour" mkdir "%TEMP%\TradeHarbour"
cd "%TEMP%\TradeHarbour"

rem Download and install VC++ Redistributable
powershell -Command "& {Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile 'vc_redist.x64.exe'}"

if exist "vc_redist.x64.exe" (
    echo.
    echo Installing... Please wait...
    vc_redist.x64.exe /install /quiet /norestart
    echo.
    echo ✓ Installation completed!
    echo.
    echo Try running TradeHarbour-portable.exe again.
    del "vc_redist.x64.exe"
) else (
    echo.
    echo ✗ Download failed. Please check your internet connection.
    echo Manual download: https://aka.ms/vs/17/release/vc_redist.x64.exe
)

cd "%~dp0"
echo.
pause