import type { Metadata } from "next";
import { Inter, Space_Grotesk, Geist } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aventix - Philippines' #1 Ticketing Platform | Discover & Book Live Music",
  description:
    "From sold-out arena concerts to underground gigs and festivals — find your next unforgettable night out and secure your ticket in seconds across the Philippines.",
  keywords: [
    "Aventix",
    "concert tickets Philippines",
    "live music Manila",
    "Mall of Asia Arena tickets",
    "concerts",
    "festivals",
    "gigs",
  ],
};

import ButtonClickEffect from "@/components/shared/ButtonClickEffect";
import SessionMutationBoundary from "@/components/auth/SessionMutationBoundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${geist.variable}`}>
      <body className="font-sans bg-[#0b0c10] text-slate-100 antialiased selection:bg-[#66fcf1] selection:text-[#0b0c10]">
        <ButtonClickEffect />
        <a href="#main-content" className="sr-only z-[100] rounded bg-[#66fcf1] p-3 text-[#0b0c10] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
        <SessionMutationBoundary>{children}</SessionMutationBoundary>
      </body>
    </html>
  );
}
