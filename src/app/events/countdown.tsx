"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/t";

const DAY = 86_400_000;
const HOUR = 3_600_000;

/**
 * Days and hours until the event, for the small spots: big dot-matrix digits
 * on the /events ticket, a one-line chip beside the sign-up form. The time is
 * read on the client only, so the server render shows dashes instead of a
 * number that would be stale by the time it arrives.
 */
export function TimeLeft({ to, chip }: { to: string; chip?: boolean }) {
  const target = Date.parse(to);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const id = window.setInterval(tick, 30_000);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(id);
    };
  }, []);

  const left = now === null ? null : Math.max(target - now, 0);
  const d = left === null ? "--" : String(Math.floor(left / DAY));
  const h =
    left === null
      ? "--"
      : String(Math.floor(left / HOUR) % 24).padStart(2, "0");
  const started = left === 0;

  if (chip) {
    return (
      <span className="evp-chip mono" role="timer" aria-live="off">
        <span className="evp-live" aria-hidden />
        {started ? (
          <T zh="进行中" en="Live now" />
        ) : (
          <T zh={`${d} 天 ${h} 时后开始`} en={`Starts in ${d}d ${h}h`} />
        )}
      </span>
    );
  }
  return (
    <div className="evn-cd" role="timer" aria-live="off">
      <p className="mono mute">
        {started ? (
          <T zh="进行中" en="Live now" />
        ) : (
          <T zh="距开场" en="Starts in" />
        )}
      </p>
      {!started && (
        <p className="evn-cd-n">
          <b>{d}</b>
          <span className="mono mute">
            <T zh="天" en="d" />
          </span>
          <b>{h}</b>
          <span className="mono mute">
            <T zh="时" en="h" />
          </span>
        </p>
      )}
    </div>
  );
}
