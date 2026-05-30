@echo off
echo y | plink -pw "V@gSWi)Po712@TaWR3r9" root@76.13.48.245 "exit"
timeout /t 2 /nobreak >nul
pscp -pw "V@gSWi)Po712@TaWR3r9" APP\dist\index.html root@76.13.48.245:/var/www/skoolific/iqrab3/APP/dist/index.html
plink -pw "V@gSWi)Po712@TaWR3r9" root@76.13.48.245 "systemctl reload nginx"
echo.
echo ============================================================
echo DEPLOYMENT COMPLETE!
echo ============================================================
echo.
echo User must now:
echo 1. Clear browser cache (Ctrl+Shift+Delete)
echo 2. Close ALL tabs for iqrab3.skoolific.com
echo 3. Restart browser completely
echo 4. Open iqrab3.skoolific.com in fresh tab
echo 5. Check console for: Students with existing marks:
echo 6. Test: Fill marks, Save, Refresh - Should stay locked
echo.
pause
