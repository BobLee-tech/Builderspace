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

/** Brings `el` to just under the fixed header, smoothly when Lenis runs. */
export function revealElement(el: HTMLElement, offset = -96) {
  const top = Math.max(0, el.getBoundingClientRect().top + scrollY + offset);
  if (active) {
    // When content just got shorter the browser has already clamped the
    // scroll; Lenis hasn't heard yet and would ease from the stale position.
    active.resize();
    active.scrollTo(scrollY, { immediate: true, force: true });
    active.scrollTo(top, { duration: 0.9, force: true });
    return;
  }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}
