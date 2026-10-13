"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion, rafThrottle, scrollProgress } from "./motion";

function useScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
  onProgress: (p: number, el: HTMLElement) => void,
  range: () => [number, number, "top" | "bottom"],
) {
  const cb = useRef(onProgress);
  const rg = useRef(range);
  useEffect(() => {
    cb.current = onProgress;
    rg.current = range;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = rafThrottle(() =>
      cb.current(scrollProgress(el, ...rg.current()), el),
    );
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    return () => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, [ref]);
}

/** Project timeline: a bright line traces the updates as you read down. */
export function TimelineFx({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);
  useScrollProgress(
    ref,
    (p, el) => el.style.setProperty("--p", p.toFixed(3)),
    () => [0.7, 0.6, "bottom"],
  );
  return (
    <ol className="timeline" ref={ref}>
      {children}
    </ol>
  );
}

/** Marquee rows that lean into fast scrolling, then settle back upright. */
export function TickerFx({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let skew = 0,
      lastY = scrollY,
      lastT = performance.now(),
      raf = 0;
    const settle = () => {
      skew *= 0.9;
      el.style.transform = `skewX(${skew.toFixed(2)}deg)`;
      if (Math.abs(skew) > 0.05) raf = requestAnimationFrame(settle);
      else {
        el.style.transform = "";
        raf = 0;
      }
    };
    const onScroll = () => {
      const now = performance.now();
      const v = (scrollY - lastY) / Math.max(1, now - lastT);
      lastY = scrollY;
      lastT = now;
      const target = Math.max(-12, Math.min(12, -v * 4));
      if (Math.abs(target) > Math.abs(skew)) skew = target;
      if (!raf) raf = requestAnimationFrame(settle);
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      // Hidden mid-lean (page kept by <Activity>): come back upright.
      el.style.transform = "";
    };
  }, []);

  return (
    <div className="ticker-wrap" ref={ref}>
      {children}
    </div>
  );
}
