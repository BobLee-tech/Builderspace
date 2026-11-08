"use client";

import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef } from "react";
import { createEased, prefersReducedMotion } from "@/components/fx/motion";
import { T } from "@/components/t";
import { CopyText } from "./copy-text";

/** How far from the address the effect starts, and how wide the light is. */
const RANGE = 200;
const SPREAD = 92;
const RATES = { follow: 0.2, settle: 0.07 };

/**
 * The address under the four ways, set large. Approaching it (before touching
 * it) lifts and lights the letters by the pointer while the rest dim, runs a
 * bright point along the rail and pulls the button in. The pointer only sets
 * goals; everything eases, so it glides back when the pointer goes.
 */
export function PartnerEmail({ email, href }: { email: string; href: string }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const addrRef = useRef<HTMLSpanElement>(null);
  const sendRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    const link = linkRef.current;
    const addr = addrRef.current;
    const send = sendRef.current;
    if (!row || !link || !addr || !send) return;

    const chars = [...addr.children] as HTMLElement[];
    const key = (i: number) => `p${i}`;
    const set = (name: string, v: string) => row.style.setProperty(name, v);

    // Where the light is holds still as it fades, so it dies where it was.
    const place = createEased(
      { cx: 0, cy: 0, rx: 56 },
      (v) => {
        set("--cx", `${v.cx.toFixed(1)}px`);
        set("--cy", `${v.cy.toFixed(1)}px`);
        set("--rx", `${v.rx.toFixed(1)}px`);
      },
      RATES,
    );
    // Strengths are 0–100: createEased settles to within 0.05 of its goal.
    let leanX = 0;
    let leanY = 0;
    const rest: Record<string, number> = { near: 0, mx: 0, my: 0 };
    chars.forEach((_, i) => (rest[key(i)] = 0));
    const power = createEased(
      rest,
      (v) => {
        leanX = v.mx;
        leanY = v.my;
        set("--near", (v.near / 100).toFixed(3));
        set("--lean-x", `${v.mx.toFixed(2)}px`);
        set("--lean-y", `${v.my.toFixed(2)}px`);
        chars.forEach((c, i) => {
          const p = v[key(i)] / 100;
          c.style.setProperty("--p", p.toFixed(3));
          c.style.transform = `translateY(${(-p * 0.2).toFixed(4)}em) scale(${(1 + p * 0.13).toFixed(4)})`;
        });
      },
      RATES,
    );

    let px: number | null = null;
    let py = 0;
    let visible = false;
    const update = () => {
      // Behind a modal the page is out of reach.
      if (px === null || !visible || document.querySelector("dialog:modal"))
        return power.rest();
      const e = link.getBoundingClientRect();
      const dx = Math.max(e.left - px, 0, px - e.right);
      const dy = Math.max(e.top - py, 0, py - e.bottom);
      const t = Math.max(0, 1 - Math.hypot(dx, dy) / RANGE);
      if (t === 0) return power.rest();
      const near = t * t * (3 - 2 * t);

      const r = row.getBoundingClientRect();
      place.aim({
        cx: px - r.left,
        cy: py - r.top,
        rx: Math.max(0, Math.min(e.width, px - e.left)),
      });

      // The button leans in a little, measured from where it sits at rest.
      const b = send.getBoundingClientRect();
      const bx = px - (b.left + b.width / 2 - leanX);
      const by = py - (b.top + b.height / 2 - leanY);
      const reach = Math.max(0, 1 - Math.hypot(bx, by) / 320);

      const goal: Record<string, number> = {
        near: near * 100,
        mx: bx * 0.16 * reach,
        my: by * 0.16 * reach,
      };
      const x = (px as number) - e.left;
      chars.forEach((c, i) => {
        const d = c.offsetLeft + c.offsetWidth / 2 - x;
        goal[key(i)] = near * 100 * Math.exp(-(d * d) / (SPREAD * SPREAD));
      });
      power.aim(goal);
    };

    const io = new IntersectionObserver(
      ([en]) => {
        visible = en.isIntersecting;
        update();
      },
      { rootMargin: "220px" },
    );
    io.observe(row);
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
    const root = document.documentElement;
    document.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onOut);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      document.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onOut);
      removeEventListener("scroll", onScroll);
      place.stop();
      power.stop();
    };
  }, []);

  return (
    <div className="pt-row pt-contact" ref={rowRef}>
      <span className="pt-contact-k mono mute">
        <T zh="合作联系" en="Partnerships" />
      </span>
      <a className="pt-email" href={href} ref={linkRef} aria-label={email}>
        <span aria-hidden ref={addrRef}>
          {[...email].map((c, i) => (
            <span className="ch" key={i}>
              {c}
            </span>
          ))}
        </span>
      </a>
      <CopyText text={email} />
      <a className="pt-send" href={href} ref={sendRef} aria-label={email}>
        <ArrowUpRight weight="light" size={20} aria-hidden />
      </a>
    </div>
  );
}
