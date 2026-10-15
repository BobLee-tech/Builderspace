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
// Tuned against "sticky" feedback: the ring settles in ~0.25s (was ~0.4s),
// buttons follow the pointer half as far and stop without overshoot, cards
// tilt half as much.
const MAGNET = { x: 0.12, y: 0.16, max: 6 };
const TILT = { x: 3, y: 4, lift: 3 };

export function GlobalFx() {
  const cur = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

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
    const rx = spring(600, 49),
      ry = spring(600, 49);
    rx.x = rx.t = x;
    ry.x = ry.t = y;
    let stopCursor: (() => void) | null = null;
    type Surface = {
      el: HTMLElement;
      x: ReturnType<typeof spring>;
      y: ReturnType<typeof spring>;
      z: ReturnType<typeof spring>;
      stop: (() => void) | null;
    };
    const surfaces = new Map<HTMLElement, Surface>();
    let card: Surface | null = null,
      magnet: Surface | null = null;
    const animate = (s: Surface, kind: "card" | "button") => {
      if (s.stop) return;
      s.stop = frameLoop.add((dt) => {
        const moving = [s.x.step(dt), s.y.step(dt), s.z.step(dt)].some(Boolean);
        if (kind === "card")
          s.el.style.transform = `rotateX(${s.x.x.toFixed(2)}deg) rotateY(${s.y.x.toFixed(2)}deg) translate3d(0,${-s.z.x}px,0)`;
        else
          s.el.style.translate = `${s.x.x.toFixed(2)}px ${s.y.x.toFixed(2)}px`;
        if (!moving) s.stop = null;
        return moving;
      });
    };
    const surface = (el: HTMLElement, kind: "card" | "button") => {
      let s = surfaces.get(el);
      if (!s) {
        s = {
          el,
          x: spring(kind === "card" ? 320 : 400, kind === "card" ? 36 : 40),
          y: spring(kind === "card" ? 320 : 400, kind === "card" ? 36 : 40),
          z: spring(320, 36),
          stop: null,
        };
        surfaces.set(el, s);
      }
      return s;
    };
    const reset = (s: Surface | null, kind: "card" | "button") => {
      if (!s) return;
      s.x.t = s.y.t = s.z.t = 0;
      animate(s, kind);
    };
    const frame = rafThrottle(() => {
      if (cur.current) cur.current.style.transform = `translate(${x}px,${y}px)`;
      const gridEl = grid.current;
      if (gridEl && target) {
        const ox = x - 260,
          oy = y - 260;
        gridEl.style.transform = `translate3d(${ox}px,${oy}px,0)`;
        const inner = gridEl.firstElementChild as HTMLElement;
        inner.style.transform = `translate3d(${-(((ox % 120) + 120) % 120)}px,${-(((oy % 120) + 120) % 120)}px,0)`;
        gridEl.classList.add("on");
      }
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
      const nextCard =
        target?.closest<HTMLElement>(".pgrid:not(.as-list) .pcard") ?? null;
      if (card?.el !== nextCard) {
        reset(card, "card");
        card = nextCard ? surface(nextCard, "card") : null;
      }
      if (card) {
        const r = card.el.getBoundingClientRect();
        card.x.t = -((y - r.top) / r.height - 0.5) * TILT.x;
        card.y.t = ((x - r.left) / r.width - 0.5) * TILT.y;
        card.z.t = TILT.lift;
        animate(card, "card");
      }
      const nextButton = target?.closest<HTMLElement>(".btn") ?? null;
      if (magnet?.el !== nextButton) {
        reset(magnet, "button");
        magnet = nextButton ? surface(nextButton, "button") : null;
      }
      if (magnet) {
        const r = magnet.el.getBoundingClientRect();
        const pull = (v: number) =>
          Math.max(-MAGNET.max, Math.min(MAGNET.max, v));
        magnet.x.t = pull((x - r.left + magnet.x.x - r.width / 2) * MAGNET.x);
        magnet.y.t = pull((y - r.top + magnet.y.x - r.height / 2) * MAGNET.y);
        animate(magnet, "button");
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
      grid.current?.classList.remove("on");
      target = null;
      frame();
    };
    root.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      root.removeEventListener("pointerleave", leave);
      frame.cancel();
      stopCursor?.();
      surfaces.forEach((s) => {
        s.stop?.();
        s.el.style.removeProperty("transform");
        s.el.style.removeProperty("translate");
      });
      lit?.style.removeProperty("--mx");
      lit?.style.removeProperty("--my");
      root.classList.remove("has-cursor", "cur-live");
    });
    return () => cleanups.forEach((f) => f());
  }, []);

  return (
    <>
      <div className="marks" aria-hidden />
      <div className="gridspot" ref={grid} aria-hidden>
        <i />
      </div>
      <div className="vignette" aria-hidden />
      <div className="grain" aria-hidden />
      <div className="cur" ref={cur} aria-hidden />
      <div className="cur-ring" ref={ring} aria-hidden />
    </>
  );
}
