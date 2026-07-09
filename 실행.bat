@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 데이터 업데이트 중...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update-all-data.ps1"
if errorlevel 1 (
    echo.
    echo 일부 데이터 처리에 실패했습니다. 위 메시지를 확인해주세요.
    pause
    exit /b 1
)

echo.
echo 완료. PM 페이지를 엽니다.
start "" "%~dp0index.html"
exit /b 0
