import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CALL OF DUTY: MOBILE — Main Menu",
  description: "Landscape main menu UI recreation of Call of Duty: Mobile.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d0f12",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Teko:wght@400;500;600;700&display=swap"
        />
        {/*
          アイコンフォントは display=block が正: swap/optional だとリガチャ名の生テキスト
          (例: "backpack") が一瞬表示されてしまうため、意図的に block を指定している。
        */}
        {/* eslint-disable @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          // biome-ignore lint/suspicious/useGoogleFontDisplay: アイコンフォントは block が正(上記コメント参照)
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200&display=block"
        />
        {/* eslint-enable @next/next/no-page-custom-font, @next/next/google-font-display */}
      </head>
      <body className="bg-steel-950 text-white antialiased">{children}</body>
    </html>
  );
}
