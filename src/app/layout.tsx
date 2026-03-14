import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harcırah Yönetim Sistemi",
  description: "Deneyap Teknoloji Atölyesi Harcırah Onay ve Ödeme Yönetimi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
