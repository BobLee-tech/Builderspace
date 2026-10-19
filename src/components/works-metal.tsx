"use client";

import { useEffect, useRef } from "react";
import type { ShaderMount } from "@paper-design/shaders";
import { frameLoop, spring } from "./fx/motion";

/** A steady flow: wide bands that bend along the glyph edges. The speed never
 * changes (the build on click only drives the status pill); the reflection
 * turns with the pointer instead, and drifts slowly while there is none. */
const SPEED = 0.5,
  ANGLE = 70,
  DISTORTION = 0.16,
  TILT = 32,
  WARP = 0.08;

/** Height map of "work.": scripts/generate-works-metal.py, Unbounded 800, spacing -.06em.
 * It includes .06em horizontal / .22em vertical padding, like polish-demo.
 * Regenerate after changing the word/font; the browser never processes text. */
export function WorksMetal() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current,
      wrap = el?.parentElement,
      hero = el?.closest<HTMLElement>(".hero");
    if (!el || !wrap || !hero) return;
    let cancelled = false,
      mount: ShaderMount | null = null,
      stop: (() => void) | null = null,
      visible = false,
      pointer: [number, number] | null = null;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    // Critically damped (~0.5s), so the bands lean after the pointer smoothly.
    const angle = spring(60, 15.5),
      warp = spring(60, 15.5);
    angle.x = angle.t = ANGLE;
    const startTime = performance.now();
    const start = () => {
      if (!mount || !visible || document.hidden || reduce.matches || stop)
        return;
      stop = frameLoop.add((dt, now) => {
        if (cancelled || !mount || !visible || document.hidden) {
          stop = null;
          return false;
        }
        const t = (now - startTime) / 1000;
        if (pointer) {
          const r = hero.getBoundingClientRect();
          const x = (pointer[0] - r.left) / r.width,
            y = (pointer[1] - r.top) / r.height;
          angle.t = ANGLE + (x - 0.5) * 2 * TILT;
          warp.t = Math.max(0, 1 - Math.abs(y - 0.5) * 2) * WARP;
        } else {
          angle.t = ANGLE + 9 * Math.sin(t * 0.21) + 4 * Math.sin(t * 0.47 + 1);
          warp.t = 0;
        }
        angle.step(dt);
        warp.step(dt);
        mount.setUniforms({
          u_angle: angle.x,
          u_distortion: DISTORTION + Math.max(0, warp.x),
        });
        return true;
      });
    };
    const stopFrames = () => {
      stop?.();
      stop = null;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "mouse") pointer = [e.clientX, e.clientY];
    };
    const leave = () => {
      pointer = null;
    };
    const visibility = () => {
      if (document.hidden) stopFrames();
      else start();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stopFrames();
    });
    io.observe(wrap);
    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    const lost = () => {
      stopFrames();
      mount?.setSpeed(0);
      wrap.classList.remove("metal-on");
    };
    const init = async () => {
      try {
        const {
          ShaderMount,
          liquidMetalFragmentShader,
          LiquidMetalShapes,
          ShaderFitOptions,
          getShaderColorFromString: c,
        } = await import("@/lib/paper-shaders");
        const img = new window.Image();
        img.src = "/works-metal.png";
        await img.decode();
        if (cancelled) return;
        mount = new ShaderMount(
          el,
          liquidMetalFragmentShader,
          {
            u_colorBack: c("rgba(0,0,0,0)"),
            u_colorTint: c("#ffffff"),
            u_image: img,
            u_isImage: true,
            u_repetition: 2,
            u_shiftRed: 0,
            u_shiftBlue: 0,
            u_contour: 0.68,
            u_softness: 0.28,
            u_distortion: DISTORTION,
            u_angle: ANGLE,
            u_shape: LiquidMetalShapes.none,
            u_fit: ShaderFitOptions.contain,
            u_scale: 1,
            u_rotation: 0,
            u_originX: 0.5,
            u_originY: 0.5,
            u_offsetX: 0,
            u_offsetY: 0,
            u_worldWidth: 0,
            u_worldHeight: 0,
          },
          { premultipliedAlpha: true, alpha: true },
          reduce.matches ? 0 : SPEED,
          0,
          1.5,
          1200 * 600,
        );
        mount.canvasElement.addEventListener("webglcontextlost", lost);
        wrap.classList.add("metal-on");
        start();
      } catch {
        el.replaceChildren();
        wrap.classList.remove("metal-on");
      }
    };
    const raf = requestAnimationFrame(() => {
      void init();
    });
    const motionChanged = () => {
      mount?.setSpeed(reduce.matches ? 0 : SPEED);
      if (reduce.matches) stopFrames();
      else start();
    };
    reduce.addEventListener("change", motionChanged);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopFrames();
      io.disconnect();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      reduce.removeEventListener("change", motionChanged);
      mount?.canvasElement.removeEventListener("webglcontextlost", lost);
      const gl = mount?.canvasElement.getContext("webgl2");
      mount?.dispose();
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      wrap.classList.remove("metal-on");
    };
  }, []);
  return <span className="works-metal" ref={ref} aria-hidden />;
}
