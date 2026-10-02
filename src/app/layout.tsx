import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="font-sans bg-[#0b0f15] text-slate-100 antialiased selection:bg-[#00e5be] selection:text-[#0b0f15]">
        {children}
      </body>
    </html>
  );
}
