@echo off
REM Wrapper to ensure Maven is available and run mvn with passed args.
setlocal enabledelayedexpansion
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-maven.ps1" -MvnArgs %*
exit /b %ERRORLEVEL%
