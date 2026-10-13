/** Shared helpers for the client-side effects in components/fx. */

export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Mouse / trackpad (not touch): the pointer-following effects only run here. */
export const hasFinePointer = () => matchMedia("(pointer: fine)").matches;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
export const easeOutQuart = (k: number) => 1 - Math.pow(1 - k, 4);

/**
 * 0 → 1 as `el` scrolls from `start` to `end`, each the fraction of the viewport
 * height its top (or, for `end`, its bottom when `endEdge` is "bottom") sits at.
 */
export function scrollProgress(
  el: Element,
  start: number,
  end: number,
  endEdge: "top" | "bottom" = "top",
) {
  const r = el.getBoundingClientRect();
  const vh = innerHeight;
  const from = vh * start;
  const to = vh * end - (endEdge === "bottom" ? r.height : 0);
  return clamp01((from - r.top) / (from - to));
}

/** Runs `fn` at most once per animation frame, for scroll / pointer handlers. */
export function rafThrottle<A extends unknown[]>(fn: (...args: A) => void) {
  let queued = false;
  let last: A;
  return (...args: A) => {
    last = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...last);
    });
  };
}

const GLYPHS = "!<>-_\\/[]{}—=+*^?#01";

/** One frame of the decode effect: characters resolve left to right. */
export function scrambleFrame(final: string, k: number) {
  return [...final]
    .map((ch, i, all) =>
      ch === " " || k > i / all.length
        ? ch
        : GLYPHS[(Math.random() * GLYPHS.length) | 0],
    )
    .join("");
}
