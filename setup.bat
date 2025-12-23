@echo off
chcp 65001 >nul
echo ==================================
echo 조직도 관리 프로그램 설치 스크립트
echo ==================================
echo.

REM Node.js 버전 확인
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X] Node.js가 설치되어 있지 않습니다.
    echo Node.js 18 이상을 설치해주세요: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js 버전: %NODE_VERSION%
echo.

REM npm 패키지 설치
echo [..] 의존성 패키지를 설치합니다...
call npm install

if %ERRORLEVEL% equ 0 (
    echo.
    echo [OK] 설치가 완료되었습니다!
    echo.
    echo 실행 방법:
    echo   run_dev.bat     - 개발 서버 실행
    echo   npm run build   - 프로덕션 빌드
    echo.
) else (
    echo [X] 패키지 설치 중 오류가 발생했습니다.
    pause
    exit /b 1
)

pause
