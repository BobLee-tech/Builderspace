"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  hasFinePointer,
  prefersReducedMotion,
  rafThrottle,
  scrollProgress,
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
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, [ref]);
}

const isNarrow = () => matchMedia("(max-width: 900px)").matches;

/** Build Cycle: the rail fills as the section scrolls and nodes light up in turn. */
export function CycleFx({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(
    ref,
    (p, el) => {
      el.style.setProperty("--p", p.toFixed(3));
      const steps = [...el.querySelectorAll(".step")];
      const done = steps.map((_, i) => p >= i / (steps.length - 1) - 0.001);
      const now = done.indexOf(false);
      steps.forEach((s, i) => {
        s.classList.toggle("done", done[i]);
        s.classList.toggle("now", i === now);
      });
    },
    () => [0.75, 0.45, "bottom"],
  );
  return (
    <div className="cycle" ref={ref}>
      <div className="cycle-rail" aria-hidden>
        <i />
      </div>
      {children}
    </div>
  );
}

/** The two logo pieces slide together as the section scrolls in, then flash. */
export function PiecesFx({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const snapped = useRef(false);

  useScrollProgress(
    ref,
    (p, el) => {
      if (prefersReducedMotion()) return;
      const [a, b] = el.querySelectorAll<HTMLElement>(".piece");
      if (!a || !b) return;
      const e = 1 - Math.pow(1 - p, 3);
      const k = 1 - e;
      if (isNarrow()) {
        a.style.transform = `translate3d(0,${-56 * k}px,0) rotate(${-3 * k}deg)`;
        b.style.transform = `translate3d(0,${56 * k}px,0) rotate(${3 * k}deg)`;
      } else {
        a.style.transform = `translate3d(${-80 * k}px,0,0) rotate(${-5 * k}deg)`;
        b.style.transform = `translate3d(${80 * k}px,0,0) rotate(${5 * k}deg)`;
      }
      if (p >= 1 && !snapped.current) {
        snapped.current = true;
        el.classList.remove("snapped");
        void el.offsetWidth;
        el.classList.add("snapped");
      } else if (p < 0.9) snapped.current = false;
    },
    () => [0.88, isNarrow() ? 0.3 : 0.4, "top"],
  );

  // The pieces' eyes follow the pointer.
  useEffect(() => {
    if (prefersReducedMotion() || !hasFinePointer()) return;
    const look = rafThrottle((x: number, y: number) => {
      ref.current?.querySelectorAll<HTMLElement>(".piece-face").forEach((f) => {
        const r = f.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const dx = x - (r.left + r.width / 2);
        const dy = y - (r.top + r.height / 2);
        const k = Math.min(1, Math.hypot(dx, dy) / 300);
        const a = Math.atan2(dy, dx);
        f.style.setProperty("--lx", `${(Math.cos(a) * 6 * k).toFixed(1)}px`);
        f.style.setProperty("--ly", `${(Math.sin(a) * 5 * k).toFixed(1)}px`);
      });
    });
    const onMove = (e: PointerEvent) => look(e.clientX, e.clientY);
    addEventListener("pointermove", onMove, { passive: true });
    return () => removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div className="pieces" ref={ref}>
      {children}
    </div>
  );
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
    };
  }, []);

  return (
    <div className="ticker-wrap" ref={ref}>
      {children}
    </div>
  );
}
