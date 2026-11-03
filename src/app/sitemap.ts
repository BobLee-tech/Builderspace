import type { MetadataRoute } from "next";
import { getEvents, getProjects, getTeam } from "@/lib/data";
import { allEventMaterials } from "@/lib/event-materials";
import { FOUNDER_PROFILES } from "@/lib/founder-profiles";
import { siteUrl } from "@/lib/site-url";

const PAGES = [
  "",
  "/events",
  "/projects",
  "/learn",
  "/people",
  "/join",
  "/core-team",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, events, team] = await Promise.all([
    getProjects(),
    getEvents(),
    getTeam(),
  ]);
  return [
    ...PAGES.map((p) => ({ url: `${siteUrl}${p}` })),
    ...events.map((e) => ({ url: `${siteUrl}/events/${e.slug}` })),
    ...allEventMaterials()
      .filter(([slug]) => events.some((e) => e.slug === slug))
      .map(([slug]) => ({ url: `${siteUrl}/learn/${slug}` })),
    ...projects.map((p) => ({
      url: `${siteUrl}/projects/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    // Founders with a profile page (the rest of /people has none).
    ...team
      .filter(
        (p) =>
          p.team === "founder" &&
          p.profileSlug &&
          FOUNDER_PROFILES[p.profileSlug],
      )
      .map((p) => ({ url: `${siteUrl}/people/${p.profileSlug}` })),
  ];
}
