import type { Metadata } from "next";
import "./globals.css";
import "./features.css";
import "./fixes.css";
import "./read-aloud.css";

export const metadata: Metadata = {
  title: "每一頁，都算數｜閱讀學習單",
  description: "讀的每一頁，都算數。依孩子的程度製作閱讀理解、心智圖、開放題與小文章。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
