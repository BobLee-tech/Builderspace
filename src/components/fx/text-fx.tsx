"use client";

import { useEffect, useRef, useState } from "react";
import { easeOutQuart, prefersReducedMotion, scrambleFrame } from "./motion";

/** Text that decodes from glyph noise into `text` once it is on screen. */
export function Scramble({
  text,
  delay = 0,
  frames = 28,
}: {
  text: string;
  delay?: number;
  frames?: number;
}) {
  const [shown, setShown] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !el.offsetParent) return;
    let f = 0;
    let raf = 0;
    const step = () => {
      setShown(f >= frames ? text : scrambleFrame(text, f / frames));
      if (++f <= frames) raf = requestAnimationFrame(step);
    };
    const t = window.setTimeout(step, delay);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [text, delay, frames]);

  return <span ref={ref}>{shown}</span>;
}

/** A number that counts up from zero the first time it scrolls into view. */
export function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(to);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 1400);
        setV(Math.round(to * easeOutQuart(k)));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    // Start from zero only when the count will visibly run.
    raf = requestAnimationFrame(() => setV(0));
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return <span ref={ref}>{v}</span>;
}

const clockFormat = (timeZone: string, seconds: boolean) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: seconds ? "2-digit" : undefined,
    hourCycle: "h23",
  });

/** Live wall clock for a time zone; blank until mounted so prerendering stays static. */
export function Clock({
  tz,
  seconds = false,
}: {
  tz: string;
  seconds?: boolean;
}) {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const fmt = clockFormat(tz, seconds);
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tz, seconds]);

  return <b>{now ?? (seconds ? "--:--:--" : "--:--")}</b>;
}
