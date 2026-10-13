"use client";

import { useEffect, useRef } from "react";
import { hasFinePointer, prefersReducedMotion } from "./motion";

const LETTERS = [..."BUILDERSPACE"];

/**
 * Giant footer wordmark on the variable-weight display face: letters swell
 * toward the pointer; with no pointer, a slow wave rolls across them.
 */
export function Wordmark() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wm = ref.current;
    const stage = wm?.parentElement;
    if (!wm || !stage) return;
    const reduce = prefersReducedMotion();
    const letters = [...wm.children] as HTMLElement[];
    const ks = letters.map(() => 0);
    let px = -9999,
      py = -9999,
      raf = 0,
      visible = false;
    const t0 = performance.now();

    const paint = (now: number) => {
      if (!visible) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(paint);
      const t = (now - t0) / 1000;
      // Read every rect first, then write: one layout per frame.
      const rects = letters.map((el) => el.getBoundingClientRect());
      letters.forEach((el, i) => {
        const r = rects[i];
        const cx = r.left + r.width / 2,
          cy = r.top + r.height / 2;
        const target =
          px > -9000
            ? Math.exp(-Math.pow(Math.hypot(px - cx, (py - cy) * 0.6) / 190, 2))
            : reduce
              ? 0
              : Math.pow(0.5 + 0.5 * Math.sin(t * 1.4 - i * 0.55), 6);
        const next = ks[i] + (target - ks[i]) * 0.14;
        if (Math.abs(next - ks[i]) > 0.002 || target === 0) {
          ks[i] = next;
          el.style.setProperty("--k", next.toFixed(3));
        }
      });
    };

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(paint);
    });
    io.observe(wm);

    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
    };
    const leave = () => {
      px = py = -9999;
    };
    if (hasFinePointer()) {
      stage.addEventListener("pointermove", move, { passive: true });
      stage.addEventListener("pointerleave", leave);
    }
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div className="wordmark" ref={ref} aria-hidden>
      {LETTERS.map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </div>
  );
}
