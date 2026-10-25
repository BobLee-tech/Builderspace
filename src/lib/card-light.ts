// The member card's one virtual light: where it drifts on its own, and how it
// glides between that drift and the pointer. member-card.tsx steps it once a
// frame and writes the result to the card with setCardLight.
import { follow } from "@/components/fx/motion";

/** Where the light sits when nothing is hovering: a slow loop. */
export const idleLight = (t: number): [number, number] => [
  0.5 + Math.cos(t / 2200) * 0.38,
  0.35 + Math.sin(t / 2200) * 0.3,
];

/**
 * Per 60 Hz frame: how fast the pointer takes the light over (in) and hands
 * it back to the drift (out, about a second), and how closely the light
 * follows its target.
 */
const HANDOVER_IN = 0.25;
const HANDOVER_OUT = 0.04;
const TRACK = 0.3;

/** Position in 0–1 of the card, and how much the pointer owns the light (0–1). */
export type Light = { x: number; y: number; k: number };

export const newLight = (): Light => ({ x: NaN, y: NaN, k: 0 });

/**
 * One frame. The target is the idle drift pulled toward the last pointer
 * position by `k`, and the light eases toward it. `k` rises quickly while the
 * pointer is over the card and falls slowly once it leaves, so the light
 * glides home instead of jumping back to the drift.
 */
export function stepLight(
  light: Light,
  frame: {
    now: number;
    /** Seconds since the last frame. */
    dt: number;
    hovering: boolean;
    /** The last pointer position over the card, in 0–1 of the card. */
    pointer: { x: number; y: number };
  },
): Light {
  const { now, dt, hovering, pointer } = frame;
  light.k +=
    ((hovering ? 1 : 0) - light.k) *
    follow(hovering ? HANDOVER_IN : HANDOVER_OUT, dt);
  const [ix, iy] = idleLight(now);
  const tx = ix + (pointer.x - ix) * light.k;
  const ty = iy + (pointer.y - iy) * light.k;
  if (Number.isNaN(light.x)) {
    light.x = tx;
    light.y = ty;
  }
  light.x += (tx - light.x) * follow(TRACK, dt);
  light.y += (ty - light.y) * follow(TRACK, dt);
  return light;
}
