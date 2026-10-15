"use client";

import { useEffect, useRef } from "react";
import type { ShaderMount } from "@paper-design/shaders";

// Grain gradient corners, one per slug so a project keeps its look.
const ROTATIONS = [0, 60, 120, 180, 240, 300];

/**
 * Paper Shaders' grain gradient in black / white / chrome, behind the outlined
 * initials of a project that has no cover upload. It only animates while on
 * screen and the tab is visible; reduced motion keeps one still frame. Without
 * WebGL the generated pattern underneath stays.
 */
export function CoverMaterial({ seed }: { seed: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false,
      mount: ShaderMount | null = null,
      visible = true;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () =>
      mount?.setSpeed(!reduce.matches && visible && !document.hidden ? 0.2 : 0);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const onLost = () => {
      mount?.setSpeed(0);
      el.classList.remove("on");
    };
    const init = async () => {
      try {
        const {
          ShaderMount,
          grainGradientFragmentShader,
          GrainGradientShapes,
          getShaderNoiseTexture,
          ShaderFitOptions,
          getShaderColorFromString: c,
        } = await import("@/lib/paper-shaders");
        const noise = getShaderNoiseTexture();
        await noise?.decode();
        if (cancelled) return;
        mount = new ShaderMount(
          el,
          grainGradientFragmentShader,
          {
            u_colorBack: c("#060606"),
            u_colors: ["#f4f4f2", "#8d8d92", "#2b2b2e", "#111113"].map(c),
            u_colorsCount: 4,
            u_softness: 0.7,
            u_intensity: 0.22,
            u_noise: 0.38,
            u_shape: GrainGradientShapes.corners,
            u_noiseTexture: noise,
            u_fit: ShaderFitOptions.cover,
            u_scale: 1,
            u_rotation: ROTATIONS[seed % ROTATIONS.length],
            u_originX: 0.5,
            u_originY: 0.5,
            u_offsetX: 0,
            u_offsetY: 0,
            u_worldWidth: 0,
            u_worldHeight: 0,
          },
          undefined,
          0,
          seed * 997,
          1,
          // About 0.6 MP: sharp enough for a grainy material, light on the GPU
          // next to the page's background shader.
          600_000,
        );
        mount.canvasElement.addEventListener("webglcontextlost", onLost);
        el.classList.add("on");
        io.observe(el);
        sync();
      } catch {
        el.replaceChildren();
      }
    };
    const raf = requestAnimationFrame(() => void init());
    document.addEventListener("visibilitychange", sync);
    reduce.addEventListener("change", sync);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduce.removeEventListener("change", sync);
      mount?.canvasElement.removeEventListener("webglcontextlost", onLost);
      const gl = mount?.canvasElement.getContext("webgl2");
      mount?.dispose();
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      el.classList.remove("on");
    };
  }, [seed]);
  return <div className="cv-material" ref={ref} aria-hidden />;
}
