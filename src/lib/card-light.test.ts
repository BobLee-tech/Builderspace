import { describe, expect, it } from "vitest";
import { idleLight, newLight, stepLight, type Light } from "./card-light";

const corner = { x: 1, y: 1 };

/** Runs `seconds` of 60 Hz frames from `start` ms; returns the time reached. */
function run(
  light: Light,
  start: number,
  seconds: number,
  hovering: boolean,
  onFrame?: (light: Light) => void,
) {
  let now = start;
  for (let i = 0; i < seconds * 60; i++) {
    now += 1000 / 60;
    stepLight(light, { now, dt: 1 / 60, hovering, pointer: corner });
    onFrame?.(light);
  }
  return now;
}

describe("card light", () => {
  it("starts on the idle drift", () => {
    const light = stepLight(newLight(), {
      now: 0,
      dt: 1 / 60,
      hovering: false,
      pointer: corner,
    });
    const [x, y] = idleLight(0);
    expect(light.x).toBeCloseTo(x, 6);
    expect(light.y).toBeCloseTo(y, 6);
  });

  it("follows the pointer while hovering", () => {
    const light = newLight();
    run(light, 0, 1, true);
    expect(light.x).toBeCloseTo(1, 2);
    expect(light.y).toBeCloseTo(1, 2);
  });

  it("glides back to the drift after the pointer leaves, without a jump", () => {
    const light = newLight();
    const left = run(light, 0, 1, true);
    let largest = 0;
    let prev = { x: light.x, y: light.y };
    const end = run(light, left, 3, false, (l) => {
      largest = Math.max(largest, Math.hypot(l.x - prev.x, l.y - prev.y));
      prev = { x: l.x, y: l.y };
    });
    // No single frame moves the light more than a few percent of the card.
    expect(largest).toBeLessThan(0.04);
    const [x, y] = idleLight(end);
    expect(Math.hypot(light.x - x, light.y - y)).toBeLessThan(0.02);
  });
});
