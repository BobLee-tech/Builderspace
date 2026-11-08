"use client";

import { useEffect } from "react";
import { createEased, prefersReducedMotion } from "@/components/fx/motion";

/** How far outside a tile its light starts to answer the pointer. */
const RANGE = 140;

/**
 * The light on the partner wall: each tile answers a mouse before it's
 * touched, its edge and brand colour rising as the pointer closes in and
 * gliding back when it goes. Renders nothing; the look is `--lit` in
 * partners.css. Logos themselves are never lit or tinted.
 */
export function PartnerTileLight() {
  useEffect(() => {
    const tiles = [
      ...document.querySelectorAll<HTMLElement>(
        "#partners .pt-wall .pt-tile:not(.open)",
      ),
    ].map((el) => {
      const light = createEased(
        { x: el.offsetWidth / 2, y: el.offsetHeight / 2, lit: 0 },
        (v) => {
          el.style.setProperty("--mx", `${v.x.toFixed(1)}px`);
          el.style.setProperty("--my", `${v.y.toFixed(1)}px`);
          el.style.setProperty("--lit", (v.lit / 100).toFixed(3));
        },
        { follow: 0.16 },
      );
      return { el, light, x: el.offsetWidth / 2, y: el.offsetHeight / 2 };
    });
    if (!tiles.length) return;

    let px: number | null = null;
    let py = 0;
    let visible = false;
    const update = () => {
      const away =
        px === null || !visible || document.querySelector("dialog:modal");
      for (const t of tiles) {
        let lit = 0;
        if (!away) {
          const r = t.el.getBoundingClientRect();
          const dx = Math.max(r.left - px!, 0, px! - r.right);
          const dy = Math.max(r.top - py, 0, py - r.bottom);
          const k = Math.max(0, 1 - Math.hypot(dx, dy) / RANGE);
          lit = k * k * (3 - 2 * k) * 100;
          // The light stays where it was as it fades, so it dies in place.
          if (lit > 0) {
            t.x = px! - r.left;
            t.y = py - r.top;
          }
        }
        t.light.aim({ x: t.x, y: t.y, lit }, lit === 0);
      }
    };
    // Decided per event, not once at load: a device can gain a mouse later.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
      px = e.clientX;
      py = e.clientY;
      if (visible) update();
    };
    const onOut = () => {
      px = null;
      update();
    };
    const onScroll = () => {
      if (visible && px !== null) update();
    };
    // Off screen there's nothing to light, so skip measuring on every move.
    const io = new IntersectionObserver(
      ([en]) => {
        visible = en.isIntersecting;
        update();
      },
      { rootMargin: `${RANGE}px` },
    );
    io.observe(tiles[0].el.closest(".pt-wall") ?? tiles[0].el);
    const root = document.documentElement;
    document.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onOut);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      document.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onOut);
      removeEventListener("scroll", onScroll);
      tiles.forEach((t) => t.light.stop());
    };
  }, []);
  return null;
}
