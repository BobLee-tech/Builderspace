"use client";

import { useEffect, useRef } from "react";
import type { ShaderMount } from "@paper-design/shaders";

/**
 * A fixed, low-contrast dithering texture behind every page. It is a still
 * frame: a background that slowly flows (or drifts with the scroll) made the
 * whole page feel like it was sliding, and a still one costs no GPU time.
 */
export function BgShader() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false,
      mount: ShaderMount | null = null;
    const onLost = () => el.classList.remove("on");
    const init = async () => {
      try {
        const {
          ShaderMount,
          ditheringFragmentShader,
          DitheringShapes,
          DitheringTypes,
          ShaderFitOptions,
          getShaderColorFromString: c,
        } = await import("@/lib/paper-shaders");
        if (cancelled) return;
        mount = new ShaderMount(
          el,
          ditheringFragmentShader,
          {
            u_colorBack: c("#050505"),
            u_colorFront: c("#161618"),
            u_shape: DitheringShapes.warp,
            u_type: DitheringTypes["8x8"],
            u_pxSize: 3,
            u_fit: ShaderFitOptions.none,
            u_scale: 0.55,
            u_rotation: 0,
            u_originX: 0.5,
            u_originY: 0.5,
            u_offsetX: 0,
            u_offsetY: 0,
            u_worldWidth: 0,
            u_worldHeight: 0,
          },
          undefined,
          // Speed 0: one frame, redrawn only when the window resizes.
          0,
          0,
          1,
          1920 * 1080,
        );
        mount.canvasElement.addEventListener("webglcontextlost", onLost);
        el.classList.add("on");
      } catch {
        el.replaceChildren();
      }
    };
    // Give the initial content a frame before requesting the material chunk.
    const raf = requestAnimationFrame(() => {
      void init();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      mount?.canvasElement.removeEventListener("webglcontextlost", onLost);
      const gl = mount?.canvasElement.getContext("webgl2");
      mount?.dispose();
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      el.classList.remove("on");
    };
  }, []);
  return (
    <>
      <div className="bg-shader" ref={ref} aria-hidden />
      <div className="bg-light" aria-hidden />
    </>
  );
}
