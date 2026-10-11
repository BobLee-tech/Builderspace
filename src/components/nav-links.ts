export const NAV_LINKS = [
  { href: "/", label: "首页", ico: "◎" },
  { href: "/events", label: "活动", ico: "▦" },
  { href: "/projects", label: "项目广场", ico: "◫" },
  { href: "/learn", label: "教程资料", ico: "≡" },
  { href: "/join", label: "加入", ico: "+" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
