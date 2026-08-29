import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nhịp Tin — Hiểu ngày mới",
  description: "Tin tức nổi bật tại Việt Nam và thế giới, ngắn gọn và có bối cảnh.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
