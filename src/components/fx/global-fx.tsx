"use client";

import { useEffect, useRef } from "react";
import {
  frameLoop,
  hasFinePointer,
  prefersReducedMotion,
  rafThrottle,
  spring,
} from "./motion";

const SPOT = ".pcard, .box, .lcard, .form, .pillars, .surf, .ccard";
// The ring grows over things you can click, and steps aside while you type.
const CLICKABLE = "a, button, label.chip, summary";
const TYPING = "input, textarea, select, [contenteditable]";
// The ring settles in ~0.18s: it still reads as following the pointer, but
// never drags behind it. Buttons and cards no longer move with the pointer
// (that read as "sticky"); their hover states are plain CSS.
const RING = { stiffness: 1000, damping: 63 };

export function GlobalFx() {
  const cur = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(
      type: K,
      fn: (e: WindowEventMap[K]) => void,
    ) => {
      addEventListener(type, fn, { passive: true });
      cleanups.push(() => removeEventListener(type, fn));
    };
    let lastY = scrollY;
    const onScroll = rafThrottle(() => {
      const top = document.querySelector<HTMLElement>(".top");
      const max = root.scrollHeight - innerHeight;
      const bar = top?.querySelector<HTMLElement>(".progress i");
      if (bar)
        bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      if (top) {
        top.classList.toggle("scrolled", scrollY > 24);
        if (Math.abs(scrollY - lastY) > 6) {
          top.classList.toggle(
            "hide",
            !top.contains(document.activeElement) &&
              scrollY > lastY &&
              scrollY > 240,
          );
          lastY = scrollY;
        }
      }
    });
    on("scroll", onScroll);
    on("resize", onScroll);
    onScroll();
    cleanups.push(() => onScroll.cancel());
    if (!hasFinePointer() || prefersReducedMotion())
      return () => cleanups.forEach((f) => f());

    root.classList.add("has-cursor");
    let x = innerWidth / 2,
      y = innerHeight / 2;
    let target: Element | null = null,
      lit: HTMLElement | null = null,
      // Measured when the pointer enters a surface and again after a scroll,
      // not on every move.
      litRect: DOMRect | null = null;
    on("scroll", () => {
      litRect = null;
    });
    const rx = spring(RING.stiffness, RING.damping),
      ry = spring(RING.stiffness, RING.damping);
    rx.x = rx.t = x;
    ry.x = ry.t = y;
    let stopCursor: (() => void) | null = null;
    const frame = rafThrottle(() => {
      if (cur.current) cur.current.style.transform = `translate(${x}px,${y}px)`;
      const typing = !!target?.closest(TYPING);
      ring.current?.classList.toggle("text", typing);
      ring.current?.classList.toggle(
        "big",
        !typing && !!target?.closest(CLICKABLE),
      );
      const spot = target?.closest<HTMLElement>(SPOT) ?? null;
      if (lit && lit !== spot) {
        lit.style.removeProperty("--mx");
        lit.style.removeProperty("--my");
      }
      if (spot !== lit) litRect = null;
      lit = spot;
      if (spot) {
        litRect ??= spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${x - litRect.left}px`);
        spot.style.setProperty("--my", `${y - litRect.top}px`);
      }
      rx.t = x;
      ry.t = y;
      if (!stopCursor)
        stopCursor = frameLoop.add((dt) => {
          const moving = [rx.step(dt), ry.step(dt)].some(Boolean);
          // `translate`, so the hover `scale` in CSS composes with it.
          if (ring.current)
            ring.current.style.translate = `${rx.x}px ${ry.x}px`;
          if (!moving) stopCursor = null;
          return moving;
        });
    });
    on("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      root.classList.add("cur-live");
      x = e.clientX;
      y = e.clientY;
      target = e.target instanceof Element ? e.target : null;
      frame();
    });
    const leave = () => {
      root.classList.remove("cur-live");
      target = null;
      frame();
    };
    root.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      root.removeEventListener("pointerleave", leave);
      frame.cancel();
      stopCursor?.();
      lit?.style.removeProperty("--mx");
      lit?.style.removeProperty("--my");
      root.classList.remove("has-cursor", "cur-live");
    });
    return () => cleanups.forEach((f) => f());
  }, []);

  // Background stack: the page grid's crosshair marks and film grain. The
  // full-page grid lines, the pointer-following grid and the vignette are
  // gone; they repeated the marks and dulled the edges.
  return (
    <>
      <div className="marks" aria-hidden />
      <div className="grain" aria-hidden />
      <div className="cur" ref={cur} aria-hidden />
      <div className="cur-ring" ref={ring} aria-hidden />
    </>
  );
}
