@echo off
chcp 65001 >nul
title OshxonaPOS — Restoran Kassa Tizimi

echo ========================================================
echo    🍽️  OshxonaPOS — Restoran Kassa va Boshqaruv Tizimi
echo ========================================================
echo.
echo [1/3] PostgreSQL Baza holati tekshirilmoqda...
net start postgresql-x64-18 >nul 2>&1

echo [2/3] Server va Xizmatlar ishga tushirilmoqda...
start "OshxonaPOS — Backend Server (4000)" cmd /k "pnpm --filter @oshxona/local-server start:dev"
start "OshxonaPOS — Admin Web (3000)" cmd /k "pnpm --filter @oshxona/admin-web dev"
start "OshxonaPOS — Kassa Ekrani (5173)" cmd /k "pnpm --filter @oshxona/pos-desktop dev"

echo [3/3] Tizim tayyorlanmoqda, iltimos kuting...
timeout /t 5 >nul

echo Kassa ekrani brauzerda ochilmoqda...
start http://localhost:5173

echo.
echo ========================================================
echo    ✅ Tizim muvaffaqiyatli ishga tushirildi!
echo    - Kassa Ekrani (Kassir):   http://localhost:5173
echo    - Boshqaruv (Admin Panel): http://localhost:3000/menu
echo ========================================================
echo.
pause
