@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js が見つかりませんでした。
  echo index.html をダブルクリックしても遊べます（そのときは packs-bundle.js の問題を使います）。
  start "" "index.html"
  pause
  exit /b
)
node tools\serve.mjs
pause
