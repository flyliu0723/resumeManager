@echo off
chcp 65001 >nul

echo ============================================
echo Ollama 服务启动器
echo ============================================
echo.

REM 设置 Ollama 路径
set OLLAMA_PATH=%USERPROFILE%\AppData\Local\Programs\Ollama\ollama\ollama.exe

if not exist "%OLLAMA_PATH%" (
    echo [错误] 未找到 Ollama.exe
    echo 请确保已安装 Ollama: https://ollama.com/download
    pause
    exit /b 1
)

echo 找到 Ollama: %OLLAMA_PATH%
echo.

REM 添加到 PATH
set PATH=%USERPROFILE%\AppData\Local\Programs\Ollama;%PATH%

echo 正在检查模型列表...
ollama list
echo.

REM 检查 qwen 模型
ollama list | findstr /i "qwen" >nul
if errorlevel 1 (
    echo [提示] 未找到 qwen 模型，正在下载...
    echo 这可能需要5-10分钟
    echo.
    ollama pull qwen2.5:1.5b
) else (
    echo [OK] qwen 模型已存在
)

echo.
echo ============================================
echo 请保持此窗口打开
echo ============================================
echo.
echo 在新终端中运行:
echo   cd D:\练手\resume1\server\parser
echo   python ResumeParserAPI.py
echo.
echo 访问 http://localhost:5001 进行测试
echo.
pause
