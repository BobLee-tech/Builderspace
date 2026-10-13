"use client";

import { useEffect, useRef } from "react";
import { hasFinePointer, prefersReducedMotion, rafThrottle } from "./motion";

// Page-wide motion from the prototype, wired once in the root layout: header
// state, and on mouse/trackpad the custom cursor, magnetic buttons, cursor grid,
// lit card edges and card tilt. This runs before streamed page segments hydrate,
// so it only touches page DOM in response to the pointer; scroll reveals are
// pure CSS (motion.css) and page-specific scroll effects live in their pages.

/** Surfaces whose hairline edge lights up under the pointer. */
const SPOT = ".pcard, .box, .lcard, .form, .pillars";

export function GlobalFx() {
  const cur = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const fine = hasFinePointer() && !reduce;
    const root = document.documentElement;
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(
      type: K,
      fn: (e: WindowEventMap[K]) => void,
    ) => {
      addEventListener(type, fn, { passive: true });
      cleanups.push(() => removeEventListener(type, fn));
    };

    // ---------- header: progress line, frosted once scrolled, hides going down
    let lastY = scrollY;
    const onScroll = rafThrottle(() => {
      const y = scrollY;
      const top = document.querySelector<HTMLElement>(".top");
      const max = root.scrollHeight - innerHeight;
      const bar = top?.querySelector<HTMLElement>(".progress i");
      if (bar)
        bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      if (top) {
        top.classList.toggle("scrolled", y > 24);
        if (Math.abs(y - lastY) > 6) {
          // Never hide while something in the header has focus.
          const keep = top.contains(document.activeElement);
          top.classList.toggle("hide", !keep && y > lastY && y > 240);
          lastY = y;
        }
      }
    });
    on("scroll", onScroll);
    onScroll();

    if (!fine) return () => cleanups.forEach((f) => f());

    // ---------- cursor, cursor grid, lit edges, card tilt, magnetic buttons
    root.classList.add("has-cursor");
    let x = innerWidth / 2;
    let y = innerHeight / 2;
    let rx = x;
    let ry = y;
    let target: Element | null = null;
    let lit: HTMLElement | null = null;
    let tilted: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;

    const frame = rafThrottle(() => {
      if (cur.current) cur.current.style.transform = `translate(${x}px,${y}px)`;
      if (grid.current) {
        grid.current.style.transform = `translate3d(${x - 260}px,${y - 260}px,0)`;
        grid.current.style.backgroundPosition = `${260 - x}px ${260 - y}px`;
        grid.current.classList.add("on");
      }
      const t = target instanceof Element ? target : null;
      ring.current?.classList.toggle(
        "big",
        !!t?.closest("a, button, label.chip, .pcard"),
      );

      const s = t?.closest<HTMLElement>(SPOT) ?? null;
      if (lit && lit !== s) {
        lit.style.removeProperty("--mx");
        lit.style.removeProperty("--my");
      }
      lit = s;
      if (s) {
        const r = s.getBoundingClientRect();
        s.style.setProperty("--mx", `${x - r.left}px`);
        s.style.setProperty("--my", `${y - r.top}px`);
      }

      const card = t?.closest<HTMLElement>(".pgrid:not(.as-list) .pcard");
      if (tilted && tilted !== card) {
        tilted.style.removeProperty("--rx");
        tilted.style.removeProperty("--ry");
      }
      tilted = card ?? null;
      if (card) {
        const r = card.getBoundingClientRect();
        const px = (x - r.left) / r.width - 0.5;
        const py = (y - r.top) / r.height - 0.5;
        card.style.setProperty("--rx", `${(-py * 7).toFixed(2)}deg`);
        card.style.setProperty("--ry", `${(px * 9).toFixed(2)}deg`);
      }

      const btn = t?.closest<HTMLElement>(".btn") ?? null;
      if (magnet && magnet !== btn) magnet.style.translate = "";
      magnet = btn;
      if (btn) {
        const r = btn.getBoundingClientRect();
        const dx = (x - r.left - r.width / 2) * 0.25;
        const dy = (y - r.top - r.height / 2) * 0.35;
        btn.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
      }
    });
    on("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      root.classList.add("cur-live");
      x = e.clientX;
      y = e.clientY;
      target = e.target as Element;
      frame();
    });
    const leave = () => {
      root.classList.remove("cur-live");
      grid.current?.classList.remove("on");
      target = null;
      frame();
    };
    root.addEventListener("pointerleave", leave);
    cleanups.push(() => root.removeEventListener("pointerleave", leave));

    let followRaf = 0;
    const follow = () => {
      followRaf = requestAnimationFrame(follow);
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (ring.current)
        ring.current.style.transform = `translate(${rx}px,${ry}px)`;
    };
    followRaf = requestAnimationFrame(follow);
    cleanups.push(() => {
      cancelAnimationFrame(followRaf);
      root.classList.remove("has-cursor", "cur-live");
    });

    return () => cleanups.forEach((f) => f());
  }, []);

  return (
    <>
      <div className="marks" aria-hidden />
      <div className="gridspot" ref={grid} aria-hidden />
      <div className="vignette" aria-hidden />
      <div className="grain" aria-hidden />
      <div className="cur" ref={cur} aria-hidden />
      <div className="cur-ring" ref={ring} aria-hidden />
    </>
  );
}
