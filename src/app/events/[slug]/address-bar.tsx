"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/components/fx/motion";

const HOLD_MS = 2200;
const DELETE_MS = 55;
const TYPE_MS = 95;

/**
 * A browser address bar that types out example usernames in turn:
 * https://yuki.github.io → https://alex-chen.github.io → … The first one is
 * rendered on the server, so the bar reads correctly before any script runs
 * and stays still for people who prefer reduced motion.
 */
export function AddressBar({ handles }: { handles: string[] }) {
  const [text, setText] = useState(handles[0] ?? "");

  useEffect(() => {
    if (handles.length < 2 || prefersReducedMotion()) return;
    let index = 0;
    let typed = handles[0];
    let deleting = true;
    let timer: number;
    const step = () => {
      const target = handles[index];
      if (deleting) {
        typed = typed.slice(0, -1);
        if (!typed) {
          deleting = false;
          index = (index + 1) % handles.length;
        }
        setText(typed);
        timer = window.setTimeout(step, DELETE_MS);
        return;
      }
      if (typed.length < target.length) {
        typed = target.slice(0, typed.length + 1);
        setText(typed);
        timer = window.setTimeout(step, TYPE_MS);
        return;
      }
      deleting = true;
      timer = window.setTimeout(step, HOLD_MS);
    };
    timer = window.setTimeout(step, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [handles]);

  return (
    <div
      className="evp-url mono"
      aria-label={`https://${handles[0]}.github.io`}
    >
      <span className="evp-url-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span className="evp-url-addr" aria-hidden>
        <span className="mute">https://</span>
        <b>{text}</b>
        <span className="evp-caret" />
        <span>.github.io</span>
      </span>
    </div>
  );
}
