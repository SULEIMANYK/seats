import type { Metadata } from "next";
import { Anton, Outfit, Geist_Mono } from "next/font/google";
import { SITE } from "@/lib/config";
import "./theme.css";

// Anton carries every heading; Outfit carries everything else. Anton ships
// one weight only — asking for others silently falls back, which is what
// made the headings look thin in the mock.
const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"], display: "swap" });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // Also emitted as <meta name="color-scheme">, so the page still declares
  // itself light even if the stylesheet hasn't arrived yet.
  other: { "color-scheme": "light" },
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
      <head>
        <script
          // Runs before paint. Without it a visitor who chose dark sees a
          // flash of cream on every navigation.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
      </head>
      <body className={`${anton.variable} ${outfit.variable} ${geistMono.variable} min-h-screen font-sans`}>
        {children}
      </body>
    </html>
  );
}
