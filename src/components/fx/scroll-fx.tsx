"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  hasFinePointer,
  prefersReducedMotion,
  rafThrottle,
  scrollProgress,
  tickerPeriod,
  wrapTickerPosition,
} from "./motion";

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
      update.cancel();
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

/** Measured ticker periods include the seam gap; hidden pages suspend the loop. */
export function TickerFx({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const wrap = ref.current,
      ticker = wrap?.parentElement;
    if (!wrap || !ticker) return;
    let disposed = false;
    const rows = [...wrap.querySelectorAll<HTMLElement>(".ticker-track")].map(
      (el) => ({
        el,
        base: el.classList.contains("rev") ? -42 : 70,
        x: 0,
        period: 0,
      }),
    );
    const measure = () =>
      rows.forEach((r) => {
        const children = [...r.el.children] as HTMLElement[];
        const n = children.length / 4;
        r.period = tickerPeriod(
          children[0]?.offsetLeft ?? 0,
          children[n]?.offsetLeft ?? 0,
        );
      });
    const ro = new ResizeObserver(measure);
    ro.observe(ticker);
    measure();
    document.fonts.ready.then(() => {
      if (!disposed) measure();
    });
    if (prefersReducedMotion())
      return () => {
        disposed = true;
        ro.disconnect();
      };
    let hover = 0,
      hoverTarget = 0,
      boost = 0,
      skew = 0,
      visible = false,
      raf = 0,
      last = 0,
      fling = 0;
    let drag: { x: number; v: number; t: number } | null = null,
      hit: HTMLElement | null = null;
    let lastY = scrollY,
      lastT = performance.now();
    const tick = (t: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min(0.05, (t - last) / 1000 || 1 / 60);
      last = t;
      hover += (hoverTarget - hover) * (1 - Math.exp(-dt * 6));
      boost *= Math.exp(-dt * 3.2);
      fling *= Math.exp(-dt * 2.4);
      skew += (-boost * 0.012 - skew) * (1 - Math.exp(-dt * 10));
      wrap.style.transform = `skewX(${Math.max(-10, Math.min(10, skew)).toFixed(2)}deg)`;
      rows.forEach((r) => {
        if (!drag)
          r.x -=
            (r.base * (1 - hover * 0.88) +
              boost * Math.sign(r.base) * 0.6 +
              fling * Math.sign(r.base)) *
            dt;
        r.x = wrapTickerPosition(r.x, r.period);
        r.el.style.transform = `translate3d(${r.x.toFixed(2)}px,0,0)`;
      });
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf && visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      start();
    });
    io.observe(ticker);
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      start();
    };
    const scroll = () => {
      const now = performance.now();
      const target = Math.max(
        -1600,
        Math.min(1600, ((scrollY - lastY) / Math.max(8, now - lastT)) * 900),
      );
      lastY = scrollY;
      lastT = now;
      if (Math.abs(target) > Math.abs(boost)) boost = target;
    };
    const enter = () => {
      if (!hasFinePointer()) return;
      hoverTarget = 1;
      ticker.classList.add("hov");
    };
    const leave = () => {
      hoverTarget = 0;
      ticker.classList.remove("hov");
      hit?.classList.remove("hit");
      hit = null;
    };
    const move = (e: PointerEvent) => {
      if (drag) {
        const now = performance.now(),
          dx = e.clientX - drag.x;
        drag.v = (dx / Math.max(8, now - drag.t)) * 1000;
        drag.x = e.clientX;
        drag.t = now;
        rows.forEach((r, i) => (r.x += dx * (i ? -0.6 : 1)));
      }
      if (!hasFinePointer()) return;
      const word =
        e.target instanceof Element
          ? e.target.closest<HTMLElement>(".ticker-track span")
          : null;
      if (word !== hit) {
        hit?.classList.remove("hit");
        hit = word;
        hit?.classList.add("hit");
      }
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, v: 0, t: performance.now() };
      ticker.setPointerCapture(e.pointerId);
      ticker.classList.add("drag");
    };
    const end = () => {
      if (!drag) return;
      fling = -Math.max(-2400, Math.min(2400, drag.v));
      drag = null;
      ticker.classList.remove("drag");
    };
    document.addEventListener("visibilitychange", visibility);
    addEventListener("scroll", scroll, { passive: true });
    ticker.addEventListener("pointerenter", enter);
    ticker.addEventListener("pointerleave", leave);
    ticker.addEventListener("pointermove", move);
    ticker.addEventListener("pointerdown", down);
    ticker.addEventListener("pointerup", end);
    ticker.addEventListener("pointercancel", end);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      removeEventListener("scroll", scroll);
      ticker.removeEventListener("pointerenter", enter);
      ticker.removeEventListener("pointerleave", leave);
      ticker.removeEventListener("pointermove", move);
      ticker.removeEventListener("pointerdown", down);
      ticker.removeEventListener("pointerup", end);
      ticker.removeEventListener("pointercancel", end);
      wrap.style.transform = "";
      rows.forEach((r) => (r.el.style.transform = ""));
      ticker.classList.remove("hov", "drag");
      hit?.classList.remove("hit");
    };
  }, []);
  return (
    <div className="ticker-wrap" ref={ref}>
      {children}
    </div>
  );
}
