import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${SITE.domain} — ${SITE.tagline}`,
  description: SITE.description,
  openGraph: {
    title: SITE.domain,
    description: SITE.description,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: SITE.domain, description: SITE.description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans`}>
        {children}
      </body>
    </html>
  );
}
