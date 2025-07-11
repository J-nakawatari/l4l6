import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
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
  title: "ナンバーズ4予想システム | AI統計解析で次回当選番号を予想",
  description: "ナンバーズ4の過去100回分のデータをAIが統計解析。ベイジアン統計、機械学習、フーリエ解析など4つの独自アルゴリズムで次回の当選番号を予想します。",
  keywords: "ナンバーズ4,予想,AI,統計解析,当選番号,宝くじ,ロト,numbers4",
  authors: [{ name: "Numbers4 AI予想" }],
  openGraph: {
    title: "ナンバーズ4予想システム | AI統計解析で次回当選番号を予想",
    description: "過去100回分のデータをAIが解析。4つの独自アルゴリズムで次回の当選番号を予想",
    url: "https://l4l6.com",
    siteName: "Numbers4 AI予想",
    images: [
      {
        url: "https://l4l6.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Numbers4 AI予想システム",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ナンバーズ4予想システム | AI統計解析",
    description: "過去100回分のデータをAIが解析。次回の当選番号を予想",
    images: ["https://l4l6.com/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "verification-code", // Google Search Console
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
