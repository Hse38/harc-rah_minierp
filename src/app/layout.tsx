import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const LOGO_URL = "https://raw.githubusercontent.com/Hse38/t3logo/main/1.T3%20dikey.png";

export const metadata: Metadata = {
  title: "TAMGA",
  description: "TAMGA Onay ve Ödeme Yönetimi",
  icons: {
    icon: [{ url: LOGO_URL, type: "image/png" }, { url: LOGO_URL, sizes: "32x32", type: "image/png" }],
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
        <ServiceWorkerRegister />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
