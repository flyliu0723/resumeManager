@echo off
setlocal

echo [热重载] 监听文件变化...
echo 按 Ctrl+C 停止服务
echo.

:loop
  cls
  echo [热重载] 重启服务中...
  node index.js
  
  if errorlevel 1 (
    echo.
    echo [错误] 服务启动失败，按任意键重试...
    pause >nul
  ) else (
    echo.
    echo [停止] 服务已停止
  )
  
goto loop

endlocal
