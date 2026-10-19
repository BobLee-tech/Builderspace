"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PollStatus =
  "loading" | "ok" | "offline" | "closed" | "denied" | "missing";

/**
 * Fetches `url` now and every `ms` while the tab is visible, so a phone follows
 * the host's step without a reload. Venue Wi-Fi drops: the last good answer
 * stays on screen and the status says "offline" until the next one arrives.
 */
export function usePoll<T>(url: string, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<PollStatus>("loading");
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        setData((await res.json()) as T);
        setStatus("ok");
      } else {
        setStatus(
          res.status === 403
            ? "denied"
            : res.status === 404
              ? "missing"
              : res.status === 503
                ? "closed"
                : "offline",
        );
      }
    } catch {
      setStatus("offline");
    } finally {
      inFlight.current = false;
    }
  }, [url]);

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) void refresh();
    };
    tick();
    const timer = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, ms]);

  return { data, status, refresh };
}
