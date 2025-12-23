#!/bin/bash

echo "=================================="
echo "조직도 관리 프로그램 개발 서버"
echo "=================================="
echo ""

# node_modules 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 패키지가 설치되어 있지 않습니다."
    echo "먼저 ./setup.sh를 실행해주세요."
    exit 1
fi

echo "🚀 개발 서버를 시작합니다..."
echo "브라우저에서 http://localhost:3000 을 열어주세요."
echo ""
echo "종료: Ctrl + C"
echo ""

npm run dev
