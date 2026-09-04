import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ConditionalCrmChrome } from "@/components/layout/conditional-crm-chrome";
import { AppProvider } from "@/lib/store";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-auth-sans",
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  variable: "--font-auth-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "TIVONIX Partners — Partner CRM",
  description: "TIVONIX Partners panel for managing partner clients",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/images/favikon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/images/favikon.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
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
      className={`${interTight.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AppProvider>
          <ConditionalCrmChrome>{children}</ConditionalCrmChrome>
        </AppProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
