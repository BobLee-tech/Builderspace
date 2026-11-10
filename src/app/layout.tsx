import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Noto_Sans_SC,
  Outfit,
  Unbounded,
} from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Dock } from "@/components/dock";
import { Boot } from "@/components/fx/boot";
import { fxBootScript } from "@/components/fx/boot-script";
import { FootNext } from "@/components/fx/footer-fx";
import { BgShader } from "@/components/fx/bg-shader";
import { ScrollRail } from "@/components/fx/scroll-rail";
import { SmoothScroll } from "@/components/fx/smooth-scroll";
import { GlobalFx } from "@/components/fx/global-fx";
import { langBootScript } from "@/components/t";
import { JsonLd } from "@/components/json-ld";
import { OPEN_GRAPH, SITE_DESCRIPTION, siteLd } from "@/lib/seo";
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
// The logo's wordmark face (logo v3): only the name next to the mark uses it.
const outfit = Outfit({
  subsets: ["latin"],
  weight: "600",
  variable: "--font-outfit",
});
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
    default: "BuilderSpace · 中英双语创客社 · Bilingual builders club at UNSW",
    template: "%s · BuilderSpace",
  },
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  openGraph: OPEN_GRAPH,
};

export const viewport: Viewport = {
  themeColor: "#050505",
  viewportFit: "cover",
};

export default function RootLayout({ children, sheet }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      // Lets Next switch smooth scrolling off while it changes route.
      data-scroll-behavior="smooth"
      className={`${unbounded.variable} ${geist.variable} ${geistMono.variable} ${outfit.variable} ${notoSc.variable}`}
      // The boot script may set data-lang/lang before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: langBootScript + fxBootScript }}
          // Extensions inject their own <script> at the top of <head>, and
          // React then hydrates this one against theirs.
          suppressHydrationWarning
        />
      </head>
      <body>
        <JsonLd data={siteLd()} />
        <Boot />
        <BgShader />
        <ScrollRail />
        <GlobalFx />
        <Suspense fallback={null}>
          <SmoothScroll />
        </Suspense>
        <SiteHeader />
        <main>{children}</main>
        {/* The pathname streams in on dynamic routes. */}
        <Suspense fallback={null}>
          <FootNext />
        </Suspense>
        <SiteFooter />
        <Dock />
        {/* /me opened over the page from the header (app/@sheet/(.)me). */}
        {sheet}
      </body>
    </html>
  );
}
