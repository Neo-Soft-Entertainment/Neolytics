import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/app/globals.css";
import { Providers } from "@/app/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "Neolytics",
  description: "Steam market intelligence for studios, publishers, and investors.",
  icons: {
    icon: [
      { url: "/icon.jpg", type: "image/jpeg" },
      { url: "/neolytics-logo.jpg", type: "image/jpeg" }
    ],
    apple: [
      { url: "/apple-icon.jpg", type: "image/jpeg" }
    ],
    shortcut: ["/icon.jpg"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
