import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], variable: "--font-dmserif", weight: "400" });

export const metadata: Metadata = {
  title: "Member Area — Meta Romance",
  description: "Pusat akses produk digital & event Meta Romance.",
  robots: { index: false, follow: false },
};

import { ThemeProvider } from "@/components/theme-provider";
import { LangProvider } from "@/components/lang-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${dmSerif.variable}`} suppressHydrationWarning>
      <body className="font-sans min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ToastProvider>
            <LangProvider>{children}</LangProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
