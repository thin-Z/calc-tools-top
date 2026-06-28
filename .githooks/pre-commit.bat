@echo off
REM Pre-commit hook: validate HTML files for U+FFFD encoding corruption
setlocal enabledelayedexpansion
set BAD_FILES=

for /f "tokens=*" %%%%f in ('git diff --cached --name-only --diff-filter=ACMR') do (
    echo %%%%f | findstr /i "\.html$" >nul
    if !errorlevel! equ 0 (
        call :check_file "%%%%f"
    )
)

if not "%BAD_FILES%"=="" (
    echo.
    echo [REJECTED] Encoding corruption detected!
    echo The following staged files contain U+FFFD replacement characters:
    echo %BAD_FILES%
    echo Fix with: powershell -ExecutionPolicy Bypass -File scripts\validate-encoding.ps1 -Fix
    echo.
    exit /b 1
)
exit /b 0

:check_file
set "file=%~1"
set "fullpath=%~dp0..\%file%"
if not exist "%fullpath%" exit /b 0
powershell -NoProfile -Command "=[System.IO.File]::ReadAllBytes('%fullpath:\=\\%');for(=0; -lt .Length-2;++){if([]-eq 239 -and [+1]-eq 191 -and [+2]-eq 189){exit 1}}exit 0"
if errorlevel 1 set BAD_FILES=!BAD_FILES!  - %file%
exit /b 0
