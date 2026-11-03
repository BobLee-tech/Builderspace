import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Search and AI crawlers are named so the policy is explicit: the club wants
// to be found and cited. Pages kept out of results (/me, /live, /m/…) carry
// noindex instead of a Disallow, since a crawler has to fetch a page to see it.
const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: ["*", ...AI_CRAWLERS],
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
