// Search and AI-answer metadata: titles and descriptions per page, the
// canonical address, and schema.org JSON-LD. Pages show both languages on one
// URL, so titles and descriptions carry both too: Chinese first, then English.

import type { Metadata } from "next";
import { siteUrl } from "./site-url";

export const SITE_NAME = "BuilderSpace";

export const SITE_DESCRIPTION =
  "从 UNSW 起步的中英双语创客社：找队友，一起把项目做上线。A bilingual builders club that started at UNSW. Find teammates and ship your project together.";

/**
 * A page's openGraph replaces the layout's whole rather than merging, so
 * every page that sets one spreads this first.
 */
export const OPEN_GRAPH: NonNullable<Metadata["openGraph"]> = {
  type: "website",
  siteName: SITE_NAME,
  images: ["/og.jpg"],
  locale: "zh_CN",
  alternateLocale: ["en_AU"],
};

/** Title, description, canonical address and og:url for a public page. */
export function pageMeta(
  path: string,
  { title, description }: { title?: string; description?: string } = {},
): Metadata {
  return {
    ...(title && { title }),
    ...(description && { description }),
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH, url: path },
  };
}

/** "中文 · English", or one of them when the two are the same. */
export function bi(zh: string, en: string | null | undefined) {
  const e = en?.trim().replace(/[.。]$/, "");
  return !e || e === zh ? zh : `${zh} · ${e}`;
}

/** Chinese then English, for descriptions. */
export function biText(zh: string, en: string | null | undefined) {
  if (!en || en === zh) return zh;
  return `${/[。！？.!?]$/.test(zh) ? zh : `${zh}。`} ${en}`;
}

const ORG_ID = `${siteUrl}/#org`;
export const orgRef = { "@id": ORG_ID };

const SYDNEY = {
  "@type": "PostalAddress",
  addressLocality: "Sydney",
  addressRegion: "NSW",
  addressCountry: "AU",
};

/** The club and the site, on every page. */
export function siteLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: SITE_NAME,
        alternateName: ["BuilderSpace UNSW", "BuilderSpace 创客社"],
        url: siteUrl,
        logo: `${siteUrl}/mark-240.png`,
        email: "hello@builderspace.dev",
        description: SITE_DESCRIPTION,
        // Search results and AI answers mix the name up with these two.
        disambiguatingDescription:
          "A student-run bilingual (English and Chinese) builders club in Sydney that started at UNSW. Not related to buildspace (buildspace.so) or Builder.io.",
        address: SYDNEY,
        knowsLanguage: ["zh-CN", "en"],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE_NAME,
        inLanguage: ["zh-CN", "en"],
        publisher: orgRef,
      },
    ],
  };
}

/** Home › … › this page; `path` is site-relative. */
export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: SITE_NAME, path: "" }, ...trail].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${siteUrl}${c.path}`,
    })),
  };
}

export function eventLd(e: {
  path: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  location: string;
  free: boolean;
  full: boolean;
}) {
  const url = `${siteUrl}${e.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.name,
    ...(e.description && { description: e.description }),
    url,
    image: `${siteUrl}/og.jpg`,
    startDate: e.startsAt,
    endDate: e.endsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.location, address: SYDNEY },
    organizer: {
      ...orgRef,
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl,
    },
    inLanguage: ["zh-CN", "en"],
    ...(e.free && {
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: 0,
        priceCurrency: "AUD",
        url,
        availability: e.full
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
      },
    }),
  };
}

export function projectLd(p: {
  path: string;
  name: string;
  description: string | null;
  owner: string;
  repoUrl: string | null;
  updatedAt: string;
}) {
  return {
    "@context": "https://schema.org",
    // codeRepository is only defined on SoftwareSourceCode.
    "@type": p.repoUrl ? "SoftwareSourceCode" : "CreativeWork",
    name: p.name,
    ...(p.description && { description: p.description }),
    url: `${siteUrl}${p.path}`,
    ...(p.repoUrl && { codeRepository: p.repoUrl }),
    author: { "@type": "Person", name: p.owner },
    dateModified: p.updatedAt,
    publisher: orgRef,
  };
}

export function personLd(p: {
  path: string;
  name: string;
  description: string;
  sameAs: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    description: p.description,
    url: `${siteUrl}${p.path}`,
    memberOf: orgRef,
    ...(p.sameAs.length && { sameAs: p.sameAs }),
  };
}
