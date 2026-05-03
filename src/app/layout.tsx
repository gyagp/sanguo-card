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
  title: "Sanguo Card - Three Kingdoms Card Game",
  description:
    "A strategic card game inspired by the Three Kingdoms era. Build decks, summon heroes, and battle opponents in this Chinese-themed collectible card game.",
  keywords: ["card game", "Three Kingdoms", "strategy", "sanguo", "CCG"],
  openGraph: {
    title: "Sanguo Card - Three Kingdoms Card Game",
    description:
      "Build decks, summon heroes, and battle opponents in this Chinese-themed collectible card game.",
    type: "website",
    locale: "en_US",
    siteName: "Sanguo Card",
  },
  twitter: {
    card: "summary",
    title: "Sanguo Card - Three Kingdoms Card Game",
    description:
      "Build decks, summon heroes, and battle opponents in this Chinese-themed collectible card game.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
