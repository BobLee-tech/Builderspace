import type Lenis from "lenis";
let active: Lenis | null = null;

export function setSmoothScroller(scroller: Lenis) {
  active = scroller;
  return () => {
    if (active === scroller) active = null;
  };
}
export function getSmoothScroller() {
  return active;
}

export function scrollToTop() {
  if (!active) return false;
  active.scrollTo(0, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  return true;
}
