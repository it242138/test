@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem AI に問題パックを作ってもらいます。API キーは環境変数 GEMINI_API_KEY か ANTHROPIC_API_KEY に入れておいてね
set /p TOPIC=テーマを入れてね（例：宇宙、恐竜、江戸時代）： 
if "%TOPIC%"=="" exit /b
node tools\ai-pack.mjs --topic "%TOPIC%"
node tools\build-bundle.mjs
pause
