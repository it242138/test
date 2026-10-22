@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem packs フォルダの JSON を js\packs-bundle.js にまとめます（index.html を直接開いて遊ぶとき用）
node tools\build-bundle.mjs
pause
