@echo off
echo ===============================================
echo   Trade Harbour - Dependency Installer
echo ===============================================
echo.
echo This will install required dependencies for Trade Harbour.
echo Please make sure you have an internet connection.
echo.
pause

echo.
echo Checking system...
echo OS: %OS%
echo Processor: %PROCESSOR_ARCHITECTURE%
echo.

echo ===============================================
echo Installing Microsoft Visual C++ Redistributable
echo ===============================================
echo.
echo Downloading Visual C++ Redistributable (x64)...

rem Create temp directory
if not exist "%TEMP%\TradeHarbour" mkdir "%TEMP%\TradeHarbour"
cd "%TEMP%\TradeHarbour"

rem Download VC++ Redistributable
echo Downloading from Microsoft...
powershell -Command "& {Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile 'vc_redist.x64.exe'}"

if exist "vc_redist.x64.exe" (
    echo Download successful!
    echo.
    echo Installing Visual C++ Redistributable...
    echo Please wait and follow any prompts...
    vc_redist.x64.exe /install /quiet /norestart
    echo Installation completed!
) else (
    echo Download failed. Please manually download from:
    echo https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist
)

echo.
echo ===============================================
echo Checking Windows Updates
echo ===============================================
echo.
echo Checking if Windows Update service is running...
sc query wuauserv | find "RUNNING" >nul
if %errorlevel% == 0 (
    echo Windows Update service is running.
    echo Please make sure Windows is up to date through Settings.
) else (
    echo Windows Update service is not running.
    echo Please enable Windows Update in Settings.
)

echo.
echo ===============================================
echo Setup Complete!
echo ===============================================
echo.
echo Dependencies have been installed.
echo You can now try running TradeHarbour-portable.exe again.
echo.
echo If you still have issues:
echo 1. Restart your computer
echo 2. Run TradeHarbour as Administrator
echo 3. Check antivirus exceptions
echo 4. Visit: https://github.com/fishyink/TradeHarbour/issues
echo.

rem Clean up
del "vc_redist.x64.exe" 2>nul
cd "%~dp0"

echo Press any key to exit...
pause >nul