/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  // 개발 모드에서는 API 라우트 사용을 위해 output: 'export'와 trailingSlash를 비활성화
  // 빌드시에만 정적 export 사용
  ...(isProd ? { output: 'export', trailingSlash: true } : {}),
  images: {
    unoptimized: true,
  },
  basePath: '',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
