import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE } from "@/lib/config";
import "./theme.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
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
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans`}>
        {children}
      </body>
    </html>
  );
}
