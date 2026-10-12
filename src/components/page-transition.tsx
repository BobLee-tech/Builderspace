import { ViewTransition, type ReactNode } from "react";

/**
 * Wraps a page so in-site navigation fades the old page out and lifts the new
 * one in (CSS: `.page-in` / `.page-out` in globals.css). Only links tagged with
 * NAV_TRANSITION animate; first load, refresh and browser back stay instant.
 * Goes in each page, not the layout: layouts persist across navigations, so
 * enter and exit never fire there.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ nav: "page-in", default: "none" }}
      exit={{ nav: "page-out", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
