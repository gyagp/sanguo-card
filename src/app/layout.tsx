import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "三国卡牌 - 三国题材策略卡牌游戏",
  description:
    "一款以三国时代为背景的策略卡牌游戏。组建卡组、召唤英雄、与对手对战。",
  keywords: ["卡牌游戏", "三国", "策略", "三国卡牌", "CCG"],
  openGraph: {
    title: "三国卡牌 - 三国题材策略卡牌游戏",
    description:
      "组建卡组、召唤英雄、与对手对战。一款三国题材的收集式卡牌游戏。",
    type: "website",
    locale: "zh_CN",
    siteName: "三国卡牌",
  },
  twitter: {
    card: "summary",
    title: "三国卡牌 - 三国题材策略卡牌游戏",
    description:
      "组建卡组、召唤英雄、与对手对战。一款三国题材的收集式卡牌游戏。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
