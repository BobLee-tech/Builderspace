import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/data";
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
  const projects = await getProjects();
  return [
    ...PAGES.map((p) => ({ url: `${siteUrl}${p}` })),
    ...projects.map((p) => ({ url: `${siteUrl}/projects/${p.slug}` })),
  ];
}
