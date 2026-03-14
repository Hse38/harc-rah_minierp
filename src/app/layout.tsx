import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const LOGO_URL = "https://raw.githubusercontent.com/Hse38/t3logo/main/1.T3%20dikey.png";

export const metadata: Metadata = {
  title: "tamga-erp Yönetim Sistemi",
  description: "tamga-erp Onay ve Ödeme Yönetimi",
  icons: {
    icon: LOGO_URL,
    apple: LOGO_URL,
  },
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
