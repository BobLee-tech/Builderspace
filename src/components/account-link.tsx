"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 我的: a client-side hop to /me, which app/@sheet/(.)me catches and opens as
 * a sheet over the current page. On /me and the studio there is nothing to lay
 * a sheet over, so it is a plain link to the full page.
 */
export function AccountLink({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const props = {
    href: "/me",
    className: "btn solid sm acct",
    "aria-label": "我的卡片 / My card",
  };
  return pathname.startsWith("/me") ? (
    <a {...props}>{children}</a>
  ) : (
    <Link {...props}>{children}</Link>
  );
}
