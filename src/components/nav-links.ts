export const NAV_LINKS = [
  { href: "/", zh: "首页", en: "Home", ico: "home" },
  { href: "/events", zh: "活动", en: "Events", ico: "events" },
  { href: "/projects", zh: "项目广场", en: "Projects", ico: "projects" },
  { href: "/learn", zh: "资源", en: "Resources", ico: "learn" },
  { href: "/people", zh: "成员", en: "People", ico: "people" },
] as const;

/**
 * The home page's prerender on Vercel doesn't see "/" from usePathname(), so
 * Home wasn't highlighted and the footer counter differed from the browser's
 * (a hydration error on every visit).
 */
export const cleanPath = (pathname: string) =>
  pathname.replace(/\/index$/, "") || "/";

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
