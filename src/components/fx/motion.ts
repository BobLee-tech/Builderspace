/** Shared helpers for the client-side effects in components/fx. */

export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Mouse / trackpad (not touch): the pointer-following effects only run here. */
export const hasFinePointer = () => matchMedia("(pointer: fine)").matches;

/**
 * Whether a CSS pixel is a whole number of screen pixels. Windows at 125% /
 * 150% (or a browser zoom) isn't, and there script-driven scrolling shimmers.
 */
export const hasWholePixels = () => Number.isInteger(devicePixelRatio);

/** Calls `fn` whenever devicePixelRatio changes (browser zoom, another screen). */
export function onPixelRatioChange(fn: () => void) {
  let ratio = devicePixelRatio,
    mq: MediaQueryList | null = null;
  const check = () => {
    if (devicePixelRatio === ratio) return;
    ratio = devicePixelRatio;
    listen();
    fn();
  };
  const listen = () => {
    mq?.removeEventListener("change", check);
    mq = matchMedia(`(resolution: ${ratio}dppx)`);
    mq.addEventListener("change", check);
  };
  listen();
  // A zoom also resizes the window, and the media query alone can miss it.
  addEventListener("resize", check);
  return () => {
    mq?.removeEventListener("change", check);
    removeEventListener("resize", check);
  };
}

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
  let raf = 0;
  let last: A;
  return Object.assign(
    (...args: A) => {
      last = args;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        fn(...last);
      });
    },
    {
      cancel() {
        cancelAnimationFrame(raf);
        raf = 0;
      },
    },
  );
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

/** The cursor ring as a rounded rectangle: centre, size, corner radius. */
export type RingBox = {
  cx: number;
  cy: number;
  w: number;
  h: number;
  r: number;
};

/**
 * Where the cursor ring goes: a circle of `size` on the pointer, or, over a
 * control, wrapped round it with `pad` to spare on every side and leaning a
 * little toward the pointer so it still feels attached.
 */
export function ringTarget(
  x: number,
  y: number,
  size: number,
  pad: number,
  wrap?: {
    rect: Pick<DOMRect, "left" | "top" | "width" | "height">;
    radius: number;
  } | null,
  lean = 0.08,
): RingBox {
  if (!wrap) return { cx: x, cy: y, w: size, h: size, r: size / 2 };
  const { rect } = wrap;
  const ex = rect.left + rect.width / 2,
    ey = rect.top + rect.height / 2;
  const h = rect.height + pad * 2;
  return {
    cx: ex + (x - ex) * lean,
    cy: ey + (y - ey) * lean,
    w: rect.width + pad * 2,
    h,
    r: Math.min(wrap.radius + pad, h / 2),
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

/**
 * How far to move toward a target this frame, given the share `rate` it
 * would cover in one 60 Hz frame; the same glide at any frame rate.
 */
export const follow = (rate: number, dt: number) =>
  1 - Math.pow(1 - rate, dt * 60);

/**
 * A set of numbers that eases toward a goal on a frame loop, painting each
 * step. A pointer effect aims it at the pointer, and on leave at `rest`, so the
 * effect glides back instead of snapping: never remove its CSS variables or
 * restart its animation when the pointer goes. `follow` and `settle` are the
 * per-frame rates toward the pointer and back to rest.
 */
export function createEased<K extends string>(
  rest: Record<K, number>,
  paint: (value: Readonly<Record<K, number>>) => void,
  { follow: toward = 0.16, settle = 0.05, loop = frameLoop } = {},
) {
  const value = { ...rest };
  const keys = Object.keys(rest) as K[];
  let goal = rest;
  let settling = false;
  let stop: (() => void) | null = null;
  const job: FrameJob = (dt) => {
    const k = follow(settling ? settle : toward, dt);
    let moving = false;
    for (const key of keys) {
      const d = goal[key] - value[key];
      value[key] += d * k;
      if (Math.abs(d) > 0.05) moving = true;
      else value[key] = goal[key];
    }
    paint(value);
    if (!moving) stop = null;
    return moving;
  };
  return {
    /**
     * Ease toward `to` (the pointer); `rest()` eases back. `slow` takes the
     * settle rate, for a fade that holds its place instead of going to rest.
     */
    aim(to: Record<K, number>, slow = to === rest) {
      goal = to;
      settling = slow;
      stop ??= loop.add(job);
    },
    rest() {
      this.aim(rest);
    },
    /** Jump to rest with no easing (e.g. when the effect first shows). */
    reset() {
      stop?.();
      stop = null;
      goal = rest;
      Object.assign(value, rest);
      paint(value);
    },
    stop() {
      stop?.();
      stop = null;
    },
  };
}

/** Width of one complete ticker copy, including the inter-copy gap. */
export function tickerPeriod(firstOffset: number, nextCopyOffset: number) {
  return Math.max(0, nextCopyOffset - firstOffset);
}

export function wrapTickerPosition(position: number, period: number) {
  return period > 0 ? ((position % period) - period) % period || 0 : 0;
}
