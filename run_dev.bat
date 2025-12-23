@echo off
chcp 65001 >nul
echo ==================================
echo 조직도 관리 프로그램 개발 서버
echo ==================================
echo.

REM node_modules 확인
if not exist "node_modules" (
    echo [..] 의존성 패키지가 설치되어 있지 않습니다.
    echo 먼저 setup.bat를 실행해주세요.
    pause
    exit /b 1
)

echo [..] 개발 서버를 시작합니다...
echo 브라우저에서 http://localhost:3000 을 열어주세요.
echo.
echo 종료: Ctrl + C
echo.

call npm run dev
