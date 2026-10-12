export const NAV_LINKS = [
  { href: "/", zh: "首页", en: "Home", ico: "◎" },
  { href: "/events", zh: "活动", en: "Events", ico: "▦" },
  { href: "/projects", zh: "项目广场", en: "Projects", ico: "◫" },
  { href: "/learn", zh: "资源", en: "Resources", ico: "≡" },
  { href: "/people", zh: "成员", en: "People", ico: "∷" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Transition type for in-site links. Pages animate in and out only for
 * navigations that carry it (see page-transition.tsx), never on first load.
 */
export const NAV_TRANSITION = ["nav"];
