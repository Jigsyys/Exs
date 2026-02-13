@echo off
echo Fermeture de tous les serveurs Node.js et terminaux...
echo.

taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✓ Processus Node.js arretes
) else (
    echo ℹ Aucun processus Node.js en cours
)

taskkill /F /IM cmd.exe /FI "WINDOWTITLE ne Fermer*" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Terminaux caches fermes
) else (
    echo ℹ Aucun terminal cache
)

echo.
echo Tous les serveurs ont ete arretes.
timeout /t 3
