@echo off
chcp 65001 >nul
echo ============================================
echo 正在下载 qwen2.5:1.5b 模型...
echo ============================================
echo.
"%USERPROFILE%\AppData\Local\Programs\Ollama\ollama\ollama.exe" pull qwen2.5:1.5b
echo.
echo ============================================
echo 下载完成!
echo ============================================
echo.
echo 现在请在新终端运行:
echo   cd D:\练手\resume1\server\parser
echo   python ResumeParserAPI.py
echo.
pause
