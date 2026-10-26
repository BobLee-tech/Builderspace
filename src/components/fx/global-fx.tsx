"use client";

import { useEffect, useRef } from "react";
import type { ChromeRing } from "./chrome-ring";
import {
  frameLoop,
  hasFinePointer,
  prefersReducedMotion,
  rafThrottle,
  ringTarget,
  spring,
} from "./motion";

const SPOT = ".pcard, .box, .lcard, .form, .pillars, .surf, .ccard";
// The ring wraps only button-like controls; other links and clickable cards
// keep a round ring that grows a little. It steps aside while you type.
const CLICKABLE = "a, button, label.chip, summary";
const WRAP = [
  ".btn",
  ".chip",
  ".top .nav > a",
  ".lang button",
  ".seg button",
  ".rmode button",
  ".totop",
  ".cstar",
  ".tm-btns button",
  ".switch",
  "[data-cursor='wrap']",
].join(", ");
// Anything bigger than this isn't a button, whatever its class says.
const WRAP_MAX = { w: 360, h: 72 };
const TYPING = "input, textarea, select, [contenteditable]";
// The ring settles in ~0.18s: it still reads as following the pointer, but
// never drags behind it. Buttons and cards no longer move with the pointer
// (that read as "sticky"); their hover states are plain CSS.
const RING = { stiffness: 1000, damping: 63 };
// Size and corners ease a little softer and just under-damped, so wrapping a
// control, letting go of it and releasing a click each land with some give.
const SHAPE = { stiffness: 520, damping: 36 };
// Free ring diameter, its growth over a link or card, room around a wrapped
// control, and the press squeeze.
const SIZE = 46,
  HOVER = 1.2,
  PAD = 12,
  PRESS = 0.9;

/** The control to wrap under `target`, if it is a button-sized button. */
function wrapTarget(target: Element) {
  const el = target.closest<HTMLElement>(CLICKABLE);
  if (!el || el.closest("[data-cursor='free']") || !el.matches(WRAP))
    return null;
  const r = el.getBoundingClientRect();
  return r.width <= WRAP_MAX.w && r.height <= WRAP_MAX.h ? el : null;
}

export function GlobalFx() {
  const cur = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const gl = useRef<HTMLCanvasElement>(null);

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
      y = innerHeight / 2,
      pressed = false;
    let target: Element | null = null,
      wrapped: HTMLElement | null = null,
      wrapRadius = 0,
      lit: HTMLElement | null = null,
      // Measured when the pointer enters a surface and again after a scroll,
      // not on every move.
      litRect: DOMRect | null = null;
    const rx = spring(RING.stiffness, RING.damping),
      ry = spring(RING.stiffness, RING.damping),
      rw = spring(SHAPE.stiffness, SHAPE.damping),
      rh = spring(SHAPE.stiffness, SHAPE.damping),
      rr = spring(SHAPE.stiffness, SHAPE.damping);
    rx.x = rx.t = x;
    ry.x = ry.t = y;
    rw.x = rw.t = rh.x = rh.t = SIZE;
    rr.x = rr.t = SIZE / 2;
    // Drawn by WebGL once three.js and the studio light have loaded; until
    // then (or without WebGL) the CSS ring shows the same box.
    let chrome: ChromeRing | null = null;
    let stopCursor: (() => void) | null = null;
    const frame = rafThrottle(() => {
      if (cur.current) cur.current.style.translate = `${x}px ${y}px`;
      const typing = !!target?.closest(TYPING);
      root.classList.toggle("cur-text", typing);
      const hit = typing || !target ? null : wrapTarget(target);
      // A link or card that isn't wrapped still answers: the ring grows.
      const grow = !typing && !hit && !!target?.closest(CLICKABLE);
      if (hit !== wrapped) {
        wrapped = hit;
        wrapRadius = hit
          ? parseFloat(getComputedStyle(hit).borderTopLeftRadius) || 4
          : 0;
      }
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
      const box = ringTarget(
        x,
        y,
        grow ? SIZE * HOVER : SIZE,
        PAD,
        wrapped && {
          rect: wrapped.getBoundingClientRect(),
          radius: wrapRadius,
        },
      );
      const squeeze = pressed ? PRESS : 1;
      rx.t = box.cx;
      ry.t = box.cy;
      rw.t = box.w * squeeze;
      rh.t = box.h * squeeze;
      rr.t = box.r * squeeze;
      if (!stopCursor)
        stopCursor = frameLoop.add((dt) => {
          const moving = [rx, ry, rw, rh, rr]
            .map((s) => s.step(dt))
            .some(Boolean);
          const el = ring.current;
          if (el) {
            el.style.width = `${rw.x}px`;
            el.style.height = `${rh.x}px`;
            el.style.borderRadius = `${rr.x}px`;
            el.style.translate = `${rx.x - rw.x / 2}px ${ry.x - rh.x / 2}px`;
          }
          chrome?.draw(
            { cx: rx.x, cy: ry.x, w: rw.x, h: rh.x, r: rr.x },
            rx.v,
            ry.v,
          );
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
      loadChrome();
    });
    // A wrapped control moves under a still pointer while the page scrolls.
    on("scroll", () => {
      litRect = null;
      if (wrapped) frame();
    });
    on("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      pressed = true;
      frame();
      chrome?.ripple(x, y);
    });
    on("pointerup", () => {
      pressed = false;
      frame();
    });
    const leave = () => {
      root.classList.remove("cur-live");
      target = null;
      frame();
    };
    root.addEventListener("pointerleave", leave);

    // three.js is only fetched once a mouse actually moves, after the page
    // has settled, so it never competes with the first paint.
    let cancelled = false,
      loading = false;
    const loadChrome = () => {
      if (loading || !gl.current) return;
      loading = true;
      const canvas = gl.current;
      const start = () =>
        import("./chrome-ring")
          .then(({ createChromeRing }) => createChromeRing(canvas))
          .then((c) => {
            if (cancelled) return c.dispose();
            chrome = c;
            canvas.addEventListener("webglcontextlost", () => {
              chrome = null;
              root.classList.remove("cur-chrome");
            });
            root.classList.add("cur-chrome");
            frame();
          })
          // No WebGL or no light: the CSS ring stays.
          .catch(() => {});
      if ("requestIdleCallback" in window)
        requestIdleCallback(start, { timeout: 2000 });
      else setTimeout(start, 600);
    };

    cleanups.push(() => {
      cancelled = true;
      root.removeEventListener("pointerleave", leave);
      frame.cancel();
      stopCursor?.();
      chrome?.dispose();
      lit?.style.removeProperty("--mx");
      lit?.style.removeProperty("--my");
      root.classList.remove("has-cursor", "cur-live", "cur-text", "cur-chrome");
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
      <canvas className="cur-gl" ref={gl} aria-hidden />
      <div className="cur" ref={cur} aria-hidden />
      <div className="cur-ring" ref={ring} aria-hidden />
    </>
  );
}
