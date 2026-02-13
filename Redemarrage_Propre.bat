@echo off
echo ========================================
echo Nettoyage complet des caches...
echo ========================================

cd /d "%~dp0"

echo.
echo [1/4] Suppression du cache Next.js (.next)...
if exist .next (
    rmdir /s /q .next
    echo Cache Next.js supprime.
) else (
    echo Pas de cache Next.js a supprimer.
)

echo.
echo [2/4] Suppression du cache node_modules...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo Cache node_modules supprime.
) else (
    echo Pas de cache node_modules a supprimer.
)

echo.
echo [3/4] Regeneration du client Prisma...
powershell -ExecutionPolicy Bypass -Command "npx prisma generate"

echo.
echo [4/4] Demarrage du serveur...
echo Le navigateur s'ouvrira dans 5 secondes sur http://localhost:3000
echo.
start /min cmd /c "timeout /t 5 /nobreak && start http://localhost:3000"
npm run dev

pause
