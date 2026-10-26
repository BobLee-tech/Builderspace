import { describe, expect, it } from "vitest";
import {
  createFrameLoop,
  follow,
  ringTarget,
  spring,
  tickerPeriod,
  wrapTickerPosition,
} from "./motion";

describe("ringTarget", () => {
  it("is a circle on the pointer when nothing is hovered", () => {
    expect(ringTarget(100, 50, 46, 12)).toEqual({
      cx: 100,
      cy: 50,
      w: 46,
      h: 46,
      r: 23,
    });
  });
  it("wraps a control with room to spare and leans toward the pointer", () => {
    const rect = { left: 10, top: 20, width: 60, height: 36 };
    const box = ringTarget(70, 38, 46, 12, { rect, radius: 999 });
    expect(box.w).toBe(84);
    expect(box.h).toBe(60);
    // A pill stays a pill: the radius never exceeds half the height.
    expect(box.r).toBe(30);
    expect(box.cx).toBeCloseTo(40 + 30 * 0.08);
    expect(box.cy).toBe(38);
  });
  it("keeps a card's corner radius, plus the padding", () => {
    const rect = { left: 0, top: 0, width: 330, height: 200 };
    expect(ringTarget(0, 0, 46, 12, { rect, radius: 20 }).r).toBe(32);
  });
});

describe("spring", () => {
  it("settles exactly at its target for different frame rates", () => {
    for (const fps of [30, 60, 120]) {
      const s = spring();
      s.t = 12;
      for (let i = 0; i < fps * 5; i++) s.step(1 / fps);
      expect(s.x).toBe(12);
      expect(s.v).toBe(0);
      expect(s.step(1 / fps)).toBe(false);
    }
  });
  it("stays finite after a long suspension and returns to zero", () => {
    const s = spring();
    s.t = 9;
    s.step(60);
    expect(Number.isFinite(s.x)).toBe(true);
    s.t = 0;
    for (let i = 0; i < 600; i++) s.step(1 / 60);
    expect(s.x).toBe(0);
  });
});

describe("follow", () => {
  it("covers the same distance per second at any frame rate", () => {
    const after = (fps: number) => {
      let x = 0;
      for (let i = 0; i < fps; i++) x += (1 - x) * follow(0.04, 1 / fps);
      return x;
    };
    expect(after(30)).toBeCloseTo(after(60), 10);
    expect(after(120)).toBeCloseTo(after(60), 10);
    expect(after(60)).toBeCloseTo(1 - 0.96 ** 60, 10);
  });
});

describe("shared frame loop", () => {
  it("schedules one frame for multiple jobs, then sleeps and restarts", () => {
    let callback: FrameRequestCallback | undefined,
      requests = 0;
    const loop = createFrameLoop(
      (cb) => {
        callback = cb;
        return ++requests;
      },
      () => {},
    );
    const frames: number[] = [];
    loop.add((dt) => {
      frames.push(dt);
      return frames.length < 2;
    });
    loop.add(() => false);
    expect(requests).toBe(1);
    callback!(100);
    expect(requests).toBe(2);
    callback!(116);
    expect(requests).toBe(2);
    loop.add((dt) => {
      expect(dt).toBeCloseTo(1 / 60);
      return false;
    });
    callback!(10000);
    expect(requests).toBe(3);
  });
  it("cancels the RAF when its last consumer unmounts", () => {
    let cancelled = 0;
    const loop = createFrameLoop(
      () => 42,
      (id) => {
        cancelled = id;
      },
    );
    const stop = loop.add(() => true);
    stop();
    expect(cancelled).toBe(42);
  });
});

describe("ticker loop", () => {
  it("includes the seam gap that percentage transforms omit", () => {
    expect(tickerPeriod(0, 1024)).toBe(1024);
    expect(wrapTickerPosition(-1024, 1024)).toBe(0);
    expect(wrapTickerPosition(-1030, 1024)).toBe(-6);
    expect(wrapTickerPosition(6, 1024)).toBe(-1018);
  });
  it("handles zero width before fonts/layout are ready", () => {
    expect(wrapTickerPosition(200, tickerPeriod(10, 10))).toBe(0);
  });
});
