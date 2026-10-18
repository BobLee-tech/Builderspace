"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { hasFinePointer, prefersReducedMotion, rafThrottle } from "./motion";

/**
 * Page header motion: a light beam sweeps the outlined line once, then the
 * pointer takes over as the light. The title itself stays put; letting it
 * drift after the pointer read as sticky.
 */
export function PageHeadFx({
  children,
  className = "page-head",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const head = ref.current;
    if (!head || prefersReducedMotion()) return;
    const lit = head.querySelector<HTMLElement>(".lit");

    let sweeping = false;
    let raf = 0;
    const timer = window.setTimeout(() => {
      if (!lit) return;
      sweeping = true;
      const w = lit.getBoundingClientRect().width;
      const t0 = performance.now();
      lit.style.setProperty("--ly", "55%");
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 1800);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        lit.style.setProperty("--lx", `${-260 + (w + 520) * e}px`);
        if (k < 1) raf = requestAnimationFrame(step);
        else {
          sweeping = false;
          lit.style.removeProperty("--lx");
          lit.style.removeProperty("--ly");
        }
      };
      raf = requestAnimationFrame(step);
    }, 450);

    if (!hasFinePointer() || !lit) {
      return () => {
        clearTimeout(timer);
        cancelAnimationFrame(raf);
      };
    }

    const onMove = rafThrottle((x: number, y: number) => {
      if (!sweeping) {
        const r = lit.getBoundingClientRect();
        const near = y > r.top - 140 && y < r.bottom + 140;
        lit.style.setProperty("--lx", near ? `${x - r.left}px` : "-999px");
        lit.style.setProperty("--ly", near ? `${y - r.top}px` : "-999px");
      }
    });
    const move = (e: PointerEvent) => onMove(e.clientX, e.clientY);
    addEventListener("pointermove", move, { passive: true });
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      onMove.cancel();
      removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}
