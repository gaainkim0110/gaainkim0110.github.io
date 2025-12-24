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
    echo   1. https://git-scm.com/download/win 에서 Git을 다운로드하세요
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
    echo [오류] 원격 저장소(origin)가 설정되어 있지 않습니다.
    echo.
    echo 해결 방법:
    echo   git remote add origin https://github.com/사용자명/저장소명.git
    echo.
    pause
    exit /b 1
)

echo [2/3] 최신 코드 가져오는 중...
echo.

:: Git pull 실행 및 결과 캡처
git pull origin main 2>&1
set PULL_RESULT=%errorlevel%

echo.

if %PULL_RESULT% equ 0 (
    echo ========================================
    echo   업데이트 완료!
    echo ========================================
    echo.
    echo [3/3] 의존성 설치 중...
    call npm install
    echo.
    echo 모든 업데이트가 완료되었습니다.
    echo 'start.bat'을 실행하여 프로그램을 시작하세요.
    echo.
) else (
    echo ========================================
    echo   업데이트 실패 - 문제 해결 안내
    echo ========================================
    echo.

    :: 인증 오류 확인
    git pull origin main 2>&1 | findstr /i "Authentication\|403\|401\|credential\|denied" >nul
    if !errorlevel! equ 0 (
        echo [인증 오류] GitHub 계정 인증에 실패했습니다.
        echo.
        echo 해결 방법 1: Personal Access Token 사용
        echo   1. GitHub.com 로그인 후 Settings ^> Developer settings ^> Personal access tokens
        echo   2. 'Generate new token' 클릭
        echo   3. 'repo' 권한 선택 후 토큰 생성
        echo   4. 다음 명령어 실행:
        echo      git config --global credential.helper store
        echo   5. 다시 git pull 실행 시 비밀번호 대신 토큰 입력
        echo.
        echo 해결 방법 2: SSH 키 사용
        echo   1. ssh-keygen -t ed25519 -C "your_email@example.com"
        echo   2. GitHub.com ^> Settings ^> SSH and GPG keys ^> New SSH key
        echo   3. 원격 저장소 URL을 SSH로 변경:
        echo      git remote set-url origin git@github.com:사용자명/저장소명.git
        echo.
        goto :end_error
    )

    :: 충돌 오류 확인
    git pull origin main 2>&1 | findstr /i "conflict\|CONFLICT\|Merge" >nul
    if !errorlevel! equ 0 (
        echo [충돌 오류] 로컬 변경사항과 원격 저장소가 충돌합니다.
        echo.
        echo 해결 방법 1: 로컬 변경사항 유지하고 병합
        echo   1. git stash          (로컬 변경사항 임시 저장)
        echo   2. git pull origin main
        echo   3. git stash pop      (저장한 변경사항 복원)
        echo.
        echo 해결 방법 2: 로컬 변경사항 버리고 원격 코드로 덮어쓰기
        echo   git reset --hard origin/main
        echo   (주의: 로컬 변경사항이 모두 삭제됩니다!)
        echo.
        goto :end_error
    )

    :: 네트워크 오류 확인
    git pull origin main 2>&1 | findstr /i "Could not resolve\|Connection\|timeout\|network" >nul
    if !errorlevel! equ 0 (
        echo [네트워크 오류] 인터넷 연결을 확인해주세요.
        echo.
        echo 해결 방법:
        echo   1. 인터넷 연결 상태 확인
        echo   2. 방화벽/프록시 설정 확인
        echo   3. VPN 사용 중이라면 일시 해제 후 재시도
        echo.
        goto :end_error
    )

    :: 권한 오류 확인
    git pull origin main 2>&1 | findstr /i "Permission\|permission\|access" >nul
    if !errorlevel! equ 0 (
        echo [권한 오류] 저장소 접근 권한이 없습니다.
        echo.
        echo 해결 방법:
        echo   1. 저장소 소유자에게 Collaborator 권한 요청
        echo   2. 또는 저장소를 Fork하여 사용
        echo.
        goto :end_error
    )

    :: 기타 오류
    echo [알 수 없는 오류] 업데이트에 실패했습니다.
    echo.
    echo 다음 명령어로 상세 오류를 확인하세요:
    echo   git pull origin main
    echo.
    echo 또는 관리자에게 문의하세요.
    echo.
)

:end_error
pause
