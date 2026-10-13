/** Shared helpers for the client-side effects in components/fx. */

export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Mouse / trackpad (not touch): the pointer-following effects only run here. */
export const hasFinePointer = () => matchMedia("(pointer: fine)").matches;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);

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

/** Damped spring, integrated in bounded steps so returning to a tab is stable. */
export function spring(stiffness = 220, damping = 28) {
  return {
    x: 0,
    v: 0,
    t: 0,
    step(dt: number) {
      let remaining = Math.max(0, Math.min(dt, 0.05));
      while (remaining > 0) {
        const step = Math.min(remaining, 1 / 120);
        this.v += (-stiffness * (this.x - this.t) - damping * this.v) * step;
        this.x += this.v * step;
        remaining -= step;
      }
      const moving =
        Math.abs(this.v) > 0.01 || Math.abs(this.x - this.t) > 0.01;
      if (!moving) {
        this.x = this.t;
        this.v = 0;
      }
      return moving;
    },
  };
}

export type FrameJob = (dt: number, now: number) => boolean;

/** One shared RAF. Returning false removes a job; the last job stops the clock. */
export function createFrameLoop(
  request: (cb: FrameRequestCallback) => number = (cb) =>
    requestAnimationFrame(cb),
  cancel: (id: number) => void = (id) => cancelAnimationFrame(id),
) {
  const jobs = new Set<FrameJob>();
  let raf = 0,
    last: number | null = null;
  const frame = (now: number) => {
    raf = 0;
    const dt =
      last === null ? 1 / 60 : Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    for (const job of jobs) if (!job(dt, now)) jobs.delete(job);
    if (jobs.size) raf = request(frame);
    else last = null;
  };
  return {
    add(job: FrameJob) {
      jobs.add(job);
      if (!raf) raf = request(frame);
      return () => {
        jobs.delete(job);
        if (!jobs.size) {
          cancel(raf);
          raf = 0;
          last = null;
        }
      };
    },
  };
}

export const frameLoop = createFrameLoop();

/** Width of one complete ticker copy, including the inter-copy gap. */
export function tickerPeriod(firstOffset: number, nextCopyOffset: number) {
  return Math.max(0, nextCopyOffset - firstOffset);
}

export function wrapTickerPosition(position: number, period: number) {
  return period > 0 ? ((position % period) - period) % period || 0 : 0;
}
