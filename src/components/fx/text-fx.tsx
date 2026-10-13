"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, scrambleFrame } from "./motion";

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
    let timer = 0;
    const tick = () => {
      setNow(fmt.format(new Date()));
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
    return () => clearTimeout(timer);
  }, [tz, seconds]);

  return <b className="tnum">{now ?? (seconds ? "--:--:--" : "--:--")}</b>;
}
