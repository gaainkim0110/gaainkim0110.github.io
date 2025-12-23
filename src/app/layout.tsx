import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '조직도 관리 프로그램',
  description: 'Hierarchy 구조의 조직도를 시각화하고, 엑셀 파일을 통한 데이터 Import/Export 및 실시간 편집이 가능한 웹 애플리케이션',
  keywords: ['조직도', '조직 관리', '엑셀', 'Organization Chart'],
  authors: [{ name: 'Organization Chart Manager' }],
  icons: {
    icon: '/favicon-32.png',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
