import type { Metadata } from "next";
import "./globals.css";
import "./features.css";
import "./fixes.css";

export const metadata: Metadata = {
  title: "小讀芽｜閱讀出題室",
  description: "上傳文章，依孩子的程度製作閱讀理解、心智圖與開放題學習單。",
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
