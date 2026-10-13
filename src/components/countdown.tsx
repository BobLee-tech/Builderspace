"use client";

import { useEffect, useState } from "react";
import { T } from "./t";

const UNITS = [
  ["天", "days", 86_400_000],
  ["时", "hrs", 3_600_000],
  ["分", "min", 60_000],
  ["秒", "sec", 1_000],
] as const;

function split(ms: number): string[] {
  let rest = Math.max(0, ms);
  return UNITS.map(([, , size]) => {
    const value = Math.floor(rest / size);
    rest -= value * size;
    return String(value).padStart(2, "0");
  });
}

export function Countdown({ to }: { to: string }) {
  // Rendered as "--" on the server so the first client paint matches.
  const [parts, setParts] = useState<string[] | null>(null);

  useEffect(() => {
    const target = Date.parse(to);
    const tick = () => setParts(split(target - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [to]);

  return (
    <div
      className="countdown"
      role="timer"
      aria-label="Time until start / 距离活动开始"
    >
      {UNITS.map(([zh, en], i) => (
        <div key={en}>
          {/* Keyed by value so each change replays the tick animation. */}
          <b key={parts?.[i]} className={i === 3 && parts ? "tick" : undefined}>
            {parts ? parts[i] : "--"}
          </b>
          <span className="mono mute">
            <T zh={zh} en={en} />
          </span>
        </div>
      ))}
    </div>
  );
}
