@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ========================================
echo   조직도 관리 프로그램 업데이트
echo ========================================
echo.

:: Git 설치 확인
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [오류] Git이 설치되어 있지 않습니다.
    echo.
    echo 해결 방법:
    echo   1. https://git-scm.com/download/win 에서 Git 다운로드
    echo   2. 설치 후 이 스크립트를 다시 실행하세요
    echo.
    pause
    exit /b 1
)

:: 현재 디렉토리가 Git 저장소인지 확인
if not exist ".git" (
    echo [오류] 현재 디렉토리가 Git 저장소가 아닙니다.
    echo.
    echo 현재 경로: %cd%
    echo.
    pause
    exit /b 1
)

echo [1/3] 원격 저장소 연결 확인 중...
git remote -v 2>nul | findstr "origin" >nul
if %errorlevel% neq 0 (
    echo [오류] 원격 저장소 origin 이 설정되어 있지 않습니다.
    echo.
    echo 해결 방법:
    echo   git remote add origin [저장소URL]
    echo.
    pause
    exit /b 1
)

echo [2/3] 최신 코드 가져오는 중...
echo.

:: Git pull 실행
git pull origin main 2> pull_error.tmp
set PULL_RESULT=%errorlevel%

if %PULL_RESULT% equ 0 (
    del pull_error.tmp 2>nul
    echo.
    echo ========================================
    echo   업데이트 완료!
    echo ========================================
    echo.
    echo [3/3] 의존성 설치 중...
    call npm install
    echo.
    echo 모든 업데이트가 완료되었습니다.
    echo start.bat 을 실행하여 프로그램을 시작하세요.
    echo.
    pause
    exit /b 0
)

:: 오류 발생 시
echo.
echo ========================================
echo   업데이트 실패 - 문제 해결 안내
echo ========================================
echo.

:: 오류 내용 확인
set "ERROR_TYPE=unknown"
findstr /i "Authentication 403 401 credential denied" pull_error.tmp >nul 2>nul && set "ERROR_TYPE=auth"
findstr /i "conflict CONFLICT Merge" pull_error.tmp >nul 2>nul && set "ERROR_TYPE=conflict"
findstr /i "resolve Connection timeout network" pull_error.tmp >nul 2>nul && set "ERROR_TYPE=network"
findstr /i "Permission permission access" pull_error.tmp >nul 2>nul && set "ERROR_TYPE=permission"

if "%ERROR_TYPE%"=="auth" (
    echo [인증 오류] GitHub 계정 인증에 실패했습니다.
    echo.
    echo 해결 방법 - Personal Access Token 사용:
    echo   1. GitHub.com 로그인
    echo   2. Settings - Developer settings - Personal access tokens
    echo   3. Generate new token 클릭, repo 권한 선택
    echo   4. 명령어 실행: git config --global credential.helper store
    echo   5. 다시 git pull 실행, 비밀번호 대신 토큰 입력
    echo.
    goto :cleanup
)

if "%ERROR_TYPE%"=="conflict" (
    echo [충돌 오류] 로컬 변경사항과 원격 저장소가 충돌합니다.
    echo.
    echo 해결 방법 1 - 로컬 변경사항 임시 저장 후 병합:
    echo   git stash
    echo   git pull origin main
    echo   git stash pop
    echo.
    echo 해결 방법 2 - 로컬 변경사항 버리기 (주의!):
    echo   git reset --hard origin/main
    echo.
    goto :cleanup
)

if "%ERROR_TYPE%"=="network" (
    echo [네트워크 오류] 인터넷 연결을 확인해주세요.
    echo.
    echo 확인 사항:
    echo   1. 인터넷 연결 상태
    echo   2. 방화벽 또는 프록시 설정
    echo   3. VPN 사용 중이면 일시 해제
    echo.
    goto :cleanup
)

if "%ERROR_TYPE%"=="permission" (
    echo [권한 오류] 저장소 접근 권한이 없습니다.
    echo.
    echo 해결 방법:
    echo   1. 저장소 소유자에게 Collaborator 권한 요청
    echo   2. 또는 저장소를 Fork하여 사용
    echo.
    goto :cleanup
)

:: 기타 오류
echo [알 수 없는 오류] 업데이트에 실패했습니다.
echo.
echo 오류 내용:
type pull_error.tmp
echo.
echo 다음 명령어로 직접 시도해보세요:
echo   git pull origin main
echo.

:cleanup
del pull_error.tmp 2>nul
pause
