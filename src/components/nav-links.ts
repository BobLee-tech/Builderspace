export const NAV_LINKS = [
  { href: "/", zh: "首页", en: "Home", ico: "◎" },
  { href: "/events", zh: "活动", en: "Events", ico: "▦" },
  { href: "/projects", zh: "项目广场", en: "Projects", ico: "◫" },
  { href: "/learn", zh: "教程资料", en: "Learn", ico: "≡" },
  { href: "/join", zh: "加入", en: "Join", ico: "+" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
