"use client";
import { useEffect, useRef } from "react";
import { rafThrottle } from "./motion";

export function ScrollRail() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = rafThrottle(() => {
      if (innerWidth < 1400) return;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, scrollY / max) : 0;
      const marker = el.firstElementChild as HTMLElement;
      marker.style.transform = `translate3d(0,${p * (el.clientHeight - marker.clientHeight)}px,0)`;
      marker.children[0].textContent = `Y ${String(Math.round(scrollY)).padStart(4, "0")}`;
      marker.children[1].textContent = `${String(Math.round(p * 100)).padStart(2, "0")}%`;
    });
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    return () => {
      ro.disconnect();
      update.cancel();
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, []);
  return (
    <div className="scroll-rail mono" ref={ref} aria-hidden>
      <div className="rail-mk">
        <span className="tnum">Y 0000</span>
        <small className="tnum">00%</small>
      </div>
    </div>
  );
}
