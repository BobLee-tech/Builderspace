import type { MetadataRoute } from "next";
import { getEvents, getProjects } from "@/lib/data";
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
  const [projects, events] = await Promise.all([getProjects(), getEvents()]);
  return [
    ...PAGES.map((p) => ({ url: `${siteUrl}${p}` })),
    ...events.map((e) => ({ url: `${siteUrl}/events/${e.slug}` })),
    ...projects.map((p) => ({ url: `${siteUrl}/projects/${p.slug}` })),
  ];
}
