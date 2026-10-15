"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
import { setSmoothScroller } from "@/lib/smooth-scroll";
import { hasFinePointer } from "./motion";
import { useScrollAnimations } from "./use-scroll-animations";

/** One layout-level Lenis, driven by GSAP's ticker; touch/reduced motion use native scroll. */
export function SmoothScroll() {
  const pathname = usePathname();
  useScrollAnimations(pathname);
  useEffect(() => {
    let cancelled = false,
      version = 0,
      dispose = () => {};
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 761px)");
    const setup = async () => {
      const run = ++version;
      dispose();
      dispose = () => {};
      if (reduce.matches || !desktop.matches || !hasFinePointer()) return;
      const [{ default: Lenis }, { gsap }] = await Promise.all([
        import("lenis"),
        import("gsap"),
      ]);
      if (cancelled || run !== version) return;
      document.documentElement.classList.add("has-smooth-scroll");
      const lenis: Lenis = new Lenis({
        // Each step closes 24% of the gap: wheel steps are smoothed, but the
        // glide after a flick is ~0.18s (0.1 gave ~0.5s, which felt slippery,
        // most of all on trackpads that already have their own inertia).
        lerp: 0.24,
        anchors: { offset: -80 },
        // Otherwise a scroll still easing out when a link is clicked carries
        // on into the next page and drags it down past the top.
        stopInertiaOnNavigate: true,
        autoRaf: false,
      });
      const clear = setSmoothScroller(lenis);
      const tick = (seconds: number) => lenis.raf(seconds * 1000);
      gsap.ticker.add(tick);
      const visibility = () => {
        if (document.hidden) gsap.ticker.remove(tick);
        else gsap.ticker.add(tick);
      };
      document.addEventListener("visibilitychange", visibility);
      dispose = () => {
        document.removeEventListener("visibilitychange", visibility);
        gsap.ticker.remove(tick);
        clear();
        lenis.destroy();
        document.documentElement.classList.remove("has-smooth-scroll");
      };
    };
    desktop.addEventListener("change", setup);
    reduce.addEventListener("change", setup);
    void setup();
    return () => {
      cancelled = true;
      version++;
      desktop.removeEventListener("change", setup);
      reduce.removeEventListener("change", setup);
      dispose();
    };
  }, []);
  return null;
}
