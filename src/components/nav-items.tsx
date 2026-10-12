"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { NAV_LINKS, isActive, NAV_TRANSITION } from "./nav-links";
import { T } from "./t";

/**
 * The pathname is runtime data on dynamic routes, so the highlighted links
 * stream in; the prerendered shell shows the same links without highlight.
 */
export function NavItems({ withIcons = false }: { withIcons?: boolean }) {
  return (
    <Suspense fallback={<Items pathname={null} withIcons={withIcons} />}>
      <ActiveItems withIcons={withIcons} />
    </Suspense>
  );
}

function ActiveItems({ withIcons }: { withIcons: boolean }) {
  return <Items pathname={usePathname()} withIcons={withIcons} />;
}

function Items({
  pathname,
  withIcons,
}: {
  pathname: string | null;
  withIcons: boolean;
}) {
  return NAV_LINKS.map((link) => (
    <Link
      transitionTypes={NAV_TRANSITION}
      key={link.href}
      href={link.href}
      aria-current={
        pathname && isActive(pathname, link.href) ? "page" : undefined
      }
    >
      {withIcons && (
        <span className="ico" aria-hidden>
          {link.ico}
        </span>
      )}
      <T zh={link.zh} en={link.en} />
    </Link>
  ));
}
