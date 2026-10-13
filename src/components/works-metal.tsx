"use client";

import { useEffect, useRef } from "react";
import type { ShaderMount } from "@paper-design/shaders";

/** Height map: scripts/generate-works-metal.py, Unbounded 800, spacing -.06em.
 * It includes .06em horizontal / .22em vertical padding, like polish-demo.
 * Regenerate after changing the word/font; the browser never processes text. */
export function WorksMetal() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current,
      wrap = el?.parentElement;
    if (!el || !wrap) return;
    let cancelled = false,
      mount: ShaderMount | null = null;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const boost = () => {
      if (!mount || reduce.matches) return;
      const busy = wrap.classList.contains("busy");
      mount.setSpeed(busy ? 3.2 : 0.7);
      mount.setUniforms({
        u_distortion: busy ? 0.22 : 0.08,
        u_repetition: busy ? 3.4 : 2.6,
      });
    };
    const lost = () => {
      mount?.setSpeed(0);
      wrap.classList.remove("metal-on");
    };
    const mo = new MutationObserver(boost);
    mo.observe(wrap, { attributeFilter: ["class"] });
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
            u_repetition: 2.6,
            u_shiftRed: 0,
            u_shiftBlue: 0,
            u_contour: 0.45,
            u_softness: 0.12,
            u_distortion: 0.08,
            u_angle: 70,
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
          reduce.matches ? 0 : 0.7,
          0,
          1.5,
          1200 * 600,
        );
        mount.canvasElement.addEventListener("webglcontextlost", lost);
        wrap.classList.add("metal-on");
      } catch {
        el.replaceChildren();
        wrap.classList.remove("metal-on");
      }
    };
    const raf = requestAnimationFrame(() => {
      void init();
    });
    const motionChanged = () => {
      mount?.setSpeed(reduce.matches ? 0 : 0.7);
    };
    reduce.addEventListener("change", motionChanged);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      mo.disconnect();
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
