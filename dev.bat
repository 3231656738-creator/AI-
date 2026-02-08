@echo off
chcp 65001 >nul
echo [AI Debate Arena] Syncing files...

:: Sync source files to English-path copy (avoids Vite Chinese path issue)
robocopy "%~dp0src" "C:\Users\Lenovo\Desktop\ai-debate\src" /E /NFL /NDL /NJH /NJS /nc /ns /np /purge >nul
robocopy "%~dp0public" "C:\Users\Lenovo\Desktop\ai-debate\public" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul
copy /y "%~dp0index.html" "C:\Users\Lenovo\Desktop\ai-debate\index.html" >nul
copy /y "%~dp0vite.config.ts" "C:\Users\Lenovo\Desktop\ai-debate\vite.config.ts" >nul
copy /y "%~dp0tailwind.config.js" "C:\Users\Lenovo\Desktop\ai-debate\tailwind.config.js" >nul
copy /y "%~dp0postcss.config.js" "C:\Users\Lenovo\Desktop\ai-debate\postcss.config.js" >nul
copy /y "%~dp0tsconfig.json" "C:\Users\Lenovo\Desktop\ai-debate\tsconfig.json" >nul
copy /y "%~dp0tsconfig.app.json" "C:\Users\Lenovo\Desktop\ai-debate\tsconfig.app.json" >nul
copy /y "%~dp0package.json" "C:\Users\Lenovo\Desktop\ai-debate\package.json" >nul

echo [AI Debate Arena] Starting dev server...
cd /d "C:\Users\Lenovo\Desktop\ai-debate"
npx vite --host --port 3000
