"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { easeOutCubic } from "./motion";

const LOG = [
  "mount  grid.blueprint",
  "load   mat.micro / mat.frost / mat.chrome",
  "sample mascot · 17,561 particles",
  "compile shader.dither.bayer8 · shader.points",
  "fetch  cycle_01",
  "ready",
];

/** The prototype's boot sequence: a counter to 100, a log, then the shutters part. */
export function Boot() {
  const [k, setK] = useState(0);
  const [phase, setPhase] = useState<"run" | "done" | "gone">("run");

  useEffect(() => {
    // Already seen this session: CSS keeps the overlay hidden.
    if (document.documentElement.classList.contains("booted")) return;
    const t0 = performance.now();
    let raf = 0;
    const timers: number[] = [];
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1100);
      setK(easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        timers.push(
          window.setTimeout(() => {
            setPhase("done");
            timers.push(window.setTimeout(() => setPhase("gone"), 1000));
          }, 120),
        );
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (phase === "gone") return null;
  const lines = LOG.slice(0, Math.ceil(k * LOG.length));

  return (
    <div className={phase === "done" ? "boot done" : "boot"} aria-hidden>
      <div />
      <div />
      <div className="boot-in">
        <div className="boot-head mono">
          <span>BuilderSpace · System boot</span>
          <span>T3 2026</span>
        </div>
        <Image
          className="boot-mark"
          src="/mark-240.webp"
          alt=""
          width={240}
          height={154}
          priority
        />
        <div>
          <div className="boot-log mono">
            {lines.map((l) => (
              <div key={l}>› {l}</div>
            ))}
          </div>
          <div className="boot-num">
            {String(Math.round(k * 100)).padStart(3, "0")}
          </div>
        </div>
      </div>
    </div>
  );
}
