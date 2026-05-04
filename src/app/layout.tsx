import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Navigation from '@/components/Navigation';
import OpenClawEntryButton from '@/components/business/OpenClawEntryButton';
import './globals.css';

const offlineFontVars = {
  '--font-geist-sans': '"Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  '--font-geist-mono': '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
} as CSSProperties;

export const metadata: Metadata = {
  title: 'ID Claw Studio | 商品规划&设计',
  description: '鞋类产品企划与设计开发平台，从趋势洞察到商品企划，从设计开发到上市复盘。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased" style={offlineFontVars} suppressHydrationWarning>
        <Navigation />
        {children}
        <OpenClawEntryButton />
      </body>
    </html>
  );
}
