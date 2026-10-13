import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_SC, Unbounded } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Dock } from "@/components/dock";
import { MascotStage } from "@/components/mascot-stage";
import { Boot } from "@/components/fx/boot";
import { fxBootScript } from "@/components/fx/boot-script";
import { FootNext } from "@/components/fx/footer-fx";
import { GlobalFx } from "@/components/fx/global-fx";
import { langBootScript } from "@/components/t";
import { siteUrl } from "@/lib/site-url";
import { Suspense } from "react";
import "./globals.css";
import "./motion.css";

// next/font self-hosts these, so visitors in mainland China never hit Google Fonts.
const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
});
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
const notoSc = Noto_Sans_SC({
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-sc",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BuilderSpace · Bring an idea. Leave with something that works.",
    template: "%s · BuilderSpace",
  },
  description:
    "一个从 UNSW 起步的中英双语创客社团：学 Vibe Coding、找队友、每周一起把项目做出来。",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    siteName: "BuilderSpace",
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      className={`${unbounded.variable} ${geist.variable} ${geistMono.variable} ${notoSc.variable}`}
      // The boot script may set data-lang/lang before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: langBootScript + fxBootScript }}
        />
      </head>
      <body>
        <Boot />
        <div className="backdrop" aria-hidden />
        <GlobalFx />
        <SiteHeader />
        <main>{children}</main>
        {/* The pathname streams in on dynamic routes. */}
        <Suspense fallback={null}>
          <FootNext />
        </Suspense>
        <MascotStage />
        <SiteFooter />
        <Dock />
      </body>
    </html>
  );
}
