import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import "@/app/globals.css";
import { auth } from "@/auth";
import { Providers } from "@/app/providers";
import { resolveUiLanguage } from "@/lib/i18n";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "Neolytics",
  description: "Steam-first studio ERP and market operating system for research, projects, finance, contracts, and company operations.",
  icons: {
    icon: [
      { url: "/neolytics-icon.png", type: "image/png" }
    ],
    apple: [
      { url: "/neolytics-icon.png", type: "image/png" }
    ],
    shortcut: ["/neolytics-icon.png"]
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const language = resolveUiLanguage(session?.user?.preferredLanguage);

  return (
    <html lang={language} suppressHydrationWarning>
      <body className={spaceGrotesk.variable}>
        <Providers language={language}>{children}</Providers>
      </body>
    </html>
  );
}
