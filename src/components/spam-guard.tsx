"use client";

import { useEffect, useRef } from "react";
import { HONEYPOT_FIELD, STARTED_AT_FIELD } from "@/lib/spam";

/** Hidden honeypot + render timestamp; see lib/spam.ts. Place inside a form. */
export function SpamGuard() {
  const startedAt = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, []);

  return (
    <>
      <input type="hidden" name={STARTED_AT_FIELD} ref={startedAt} />
      <div className="hp" aria-hidden>
        <label>
          Website
          <input
            type="text"
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>
    </>
  );
}
