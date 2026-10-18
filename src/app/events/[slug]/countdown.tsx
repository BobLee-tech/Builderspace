"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/t";

// Each unit: milliseconds per unit and how many fit in the next one up.
const UNITS = [
  { ms: 86_400_000, wrap: Infinity, zh: "天", en: "Days" },
  { ms: 3_600_000, wrap: 24, zh: "时", en: "Hrs" },
  { ms: 60_000, wrap: 60, zh: "分", en: "Min" },
  { ms: 1_000, wrap: 60, zh: "秒", en: "Sec" },
] as const;

/**
 * Days / hours / minutes / seconds until the event starts. The time is read
 * on the client only, so the server render shows dashes instead of a number
 * that would be stale by the time it arrives.
 */
export function Countdown({ to }: { to: string }) {
  const target = Date.parse(to);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const id = window.setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(id);
    };
  }, []);

  const left = now === null ? null : Math.max(target - now, 0);
  const parts = UNITS.map((u) =>
    left === null
      ? "--"
      : String(Math.floor(left / u.ms) % u.wrap).padStart(2, "0"),
  );
  const started = now !== null && now >= target;

  return (
    <div className="evp-cd hud" role="timer" aria-live="off">
      <span className="c tl" aria-hidden />
      <span className="c tr" aria-hidden />
      <span className="c bl" aria-hidden />
      <span className="c br" aria-hidden />
      <p className="mono mute evp-cd-head">
        <span>T-minus</span>
        <span>
          {started ? (
            <T zh="进行中" en="Live now" />
          ) : (
            <T zh="距开场" en="Until doors open" />
          )}
        </span>
      </p>
      <div className="evp-cd-grid">
        {UNITS.map((u, i) => (
          <div key={u.en}>
            <b>{parts[i]}</b>
            <span className="mono mute">
              <T zh={u.zh} en={u.en} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
