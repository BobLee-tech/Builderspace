"use client";

import { useEffect, useState } from "react";

const UNITS = [
  ["天", 86_400_000],
  ["时", 3_600_000],
  ["分", 60_000],
  ["秒", 1_000],
] as const;

function split(ms: number): string[] {
  let rest = Math.max(0, ms);
  return UNITS.map(([, size]) => {
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
    <div className="countdown" role="timer" aria-label="距离活动开始">
      {UNITS.map(([label], i) => (
        <div key={label}>
          <b>{parts ? parts[i] : "--"}</b>
          <span className="mono mute">{label}</span>
        </div>
      ))}
    </div>
  );
}
