"use client";

import { useCallback, useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

export type CelebrationKind = "join" | "project";

// Black / white / chrome, with the mascot's orange as the only colour.
const SILVER = ["#ffffff", "#e6e6ea", "#b9b9c0", "#7d7d85", "#3d3d42"];
const MASCOT = ["#f6a31b", "#ffcf6a"];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function viewportOrigin(el: Element | null | undefined) {
  if (!el) return { x: 0.5, y: 0.4 };
  const r = el.getBoundingClientRect();
  return {
    x: (r.left + r.width / 2) / innerWidth,
    y: Math.min(0.9, Math.max(0.1, (r.top + r.height / 3) / innerHeight)),
  };
}

/**
 * One burst of confetti on a full-screen overlay that removes itself when the
 * last particle lands. The library is only fetched after a successful submit.
 */
async function burst(kind: CelebrationKind, from: Element | null | undefined) {
  const { default: confetti } = await import("canvas-confetti");
  const canvas = document.createElement("canvas");
  canvas.className = "celebrate-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const fire = confetti.create(canvas, { resize: true, useWorker: true });
  const small = innerWidth < 761;
  const n = (count: number) => Math.round(small ? count * 0.6 : count);
  const base = { ticks: 220, disableForReducedMotion: true } as const;

  const shots: Promise<unknown>[] = [];
  const shot = (opts: confetti.Options) => {
    const p = fire({ ...base, ...opts });
    if (p) shots.push(p);
  };
  if (kind === "join") {
    const side = { spread: 58, startVelocity: small ? 44 : 58, gravity: 1.05 };
    const look = { colors: SILVER, shapes: ["square"] as confetti.Shape[] };
    shot({
      ...side,
      ...look,
      particleCount: n(70),
      angle: 60,
      origin: { x: 0, y: 0.85 },
    });
    shot({
      ...side,
      ...look,
      particleCount: n(70),
      angle: 120,
      origin: { x: 1, y: 0.85 },
    });
    await wait(520);
    shot({
      particleCount: n(26),
      spread: 100,
      startVelocity: 32,
      scalar: 1.1,
      origin: viewportOrigin(from),
      colors: MASCOT,
      shapes: ["circle"],
    });
  } else {
    const origin = viewportOrigin(from);
    shot({
      particleCount: n(90),
      spread: 70,
      startVelocity: 45,
      gravity: 1.2,
      scalar: 0.8,
      origin,
      colors: SILVER,
      shapes: ["square", "circle"],
    });
    shot({
      particleCount: n(14),
      spread: 50,
      startVelocity: 38,
      gravity: 1.1,
      origin,
      colors: MASCOT,
      shapes: ["circle"],
    });
  }
  await Promise.all(shots);
  fire.reset();
  canvas.remove();
}

/**
 * Plays once when a submission succeeds: the confirmation panel's children
 * rise in, a project's check mark draws and its stamp lands, and confetti
 * bursts. Put the returned ref on the confirmation panel and pass `active`
 * once it is showing. `origin` picks where the orange puff comes from.
 * Reduced motion gets the static panel and no particles.
 */
export function useCelebration(
  kind: CelebrationKind,
  active: boolean,
  origin?: () => Element | null,
) {
  const panel = useRef<HTMLElement | null>(null);
  const originRef = useRef(origin);
  useEffect(() => {
    originRef.current = origin;
  });

  useEffect(() => {
    const el = panel.current;
    if (!active || !el || prefersReducedMotion()) return;
    let cancelled = false;
    let revert = () => {};
    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const ctx = gsap.context(() => {
        const tl = gsap.timeline();
        tl.from(el.children, {
          y: 18,
          autoAlpha: 0,
          duration: 0.6,
          stagger: 0.07,
          ease: "power3.out",
          clearProps: "transform,opacity,visibility",
        });
        const check = el.querySelector("[data-celebrate=check]");
        if (check) {
          tl.from(
            check,
            { scale: 0.4, autoAlpha: 0, duration: 0.5, ease: "back.out(2.4)" },
            0.1,
          ).from(
            check.querySelector("path"),
            { strokeDashoffset: 40, duration: 0.45, ease: "power2.out" },
            0.35,
          );
        }
        const stamp = el.querySelector("[data-celebrate=stamp]");
        if (stamp) {
          tl.from(
            stamp,
            {
              scale: 2.4,
              rotate: -16,
              autoAlpha: 0,
              duration: 0.32,
              ease: "power4.in",
            },
            0.55,
          ).to(el, {
            x: 3,
            duration: 0.05,
            yoyo: true,
            repeat: 3,
            ease: "none",
          });
        }
      }, el);
      revert = () => ctx.revert();
    });
    const timer = setTimeout(
      () => void burst(kind, originRef.current?.() ?? el),
      kind === "join" ? 260 : 420,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
      revert();
    };
  }, [active, kind]);

  return useCallback((node: HTMLElement | null) => {
    panel.current = node;
  }, []);
}
