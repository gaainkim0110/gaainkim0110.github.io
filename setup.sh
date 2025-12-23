#!/bin/bash

echo "=================================="
echo "조직도 관리 프로그램 설치 스크립트"
echo "=================================="
echo ""

# Node.js 버전 확인
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다."
    echo "Node.js 18 이상을 설치해주세요: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18 이상이 필요합니다. 현재 버전: $(node -v)"
    exit 1
fi

echo "✅ Node.js 버전: $(node -v)"
echo ""

# npm 패키지 설치
echo "📦 의존성 패키지를 설치합니다..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 설치가 완료되었습니다!"
    echo ""
    echo "실행 방법:"
    echo "  ./run_dev.sh    - 개발 서버 실행"
    echo "  npm run build   - 프로덕션 빌드"
    echo ""
else
    echo "❌ 패키지 설치 중 오류가 발생했습니다."
    exit 1
fi
