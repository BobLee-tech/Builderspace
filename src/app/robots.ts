import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Three groups of crawlers. Pages kept out of results (/me, /live, /m/…) carry
// noindex for search engines, which have to fetch a page to see it, so those
// get no Disallow there.

/** Search and answer bots that fetch a page to cite it: same rules as search. */
const SEARCH_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

/**
 * Training crawlers that publish their rules and honour robots.txt. They may
 * learn the club's own pages, so models know what BuilderSpace is, but not
 * members' work, cards or comments, which members never agreed to.
 */
const TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "CCBot",
];

/** Crawlers that resell data or crawl hard: nothing. */
const BLOCKED_BOTS = [
  "Bytespider",
  "Diffbot",
  "ImagesiftBot",
  "omgili",
  "omgilibot",
  "Timpibot",
];

const PRIVATE = ["/admin", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ["*", ...SEARCH_BOTS], allow: "/", disallow: PRIVATE },
      {
        userAgent: TRAINING_BOTS,
        allow: "/",
        disallow: [
          ...PRIVATE,
          "/projects",
          "/people",
          "/m/",
          "/me",
          "/live",
          "/intent",
          "/welcome",
          "/unsubscribe",
        ],
      },
      { userAgent: BLOCKED_BOTS, disallow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
