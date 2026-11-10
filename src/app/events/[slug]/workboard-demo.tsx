"use client";

import { Check, Microphone } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/components/fx/motion";
import { T } from "@/components/t";
import type { WorkboardDemo as Demo } from "@/lib/event-pages";

/**
 * How long each stage holds: listening, request heard, agent working, tags
 * on, every task ticked.
 */
const HOLD_MS = [1400, 1600, 2600, 1800, 4000];
const DONE = HOLD_MS.length - 1;

/**
 * The day's live demo, replayed: a request is said out loud, the agent ticks
 * off its steps, the starter's tasks get the change, then every task is
 * ticked so the board ends finished. The server renders
 * the finished board, so it reads right before any script runs and stays
 * that way for people who prefer reduced motion. The loop only runs while
 * the board is on screen; going back to the start, the tags fade out rather
 * than vanish.
 */
export function WorkboardDemo({ demo }: { demo: Demo }) {
  const ref = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(DONE);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let timer = 0;
    let current = DONE;
    const next = () => {
      current = (current + 1) % HOLD_MS.length;
      setStage(current);
      timer = window.setTimeout(next, HOLD_MS[current]);
    };
    const seen = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (entry.isIntersecting) timer = window.setTimeout(next, 900);
      },
      { threshold: 0.5 },
    );
    seen.observe(el);
    return () => {
      seen.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const total = demo.tasks.length;
  const done = demo.tasks.filter((t) => t.done).length;
  const pct = Math.round((done / total) * 100);

  return (
    <figure ref={ref} className="wb" data-stage={stage}>
      <div className="wb-bar">
        <span className="wb-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="wb-name">Workboard</span>
        <span className="wb-state mono" aria-hidden>
          <span className="wb-before">
            <T zh="改动前" en="Before" />
          </span>
          <span className="wb-after">
            <T zh="已改好" en="Updated" />
          </span>
        </span>
      </div>

      <div className="wb-body">
        <div className="wb-talk">
          <p className="wb-who mono">
            <Microphone weight="light" size={14} aria-hidden />
            {demo.voice}
            <span className="wb-wave" aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </span>
          </p>
          <p className="wb-ask">
            <T {...demo.ask} />
          </p>
          <p className="wb-who mono">{demo.agent}</p>
          <ol className="wb-steps">
            {demo.steps.map((s, i) => (
              <li key={s.en} style={{ "--i": i } as React.CSSProperties}>
                <Check weight="bold" size={12} aria-hidden />
                <T {...s} />
              </li>
            ))}
          </ol>
        </div>

        <div className="wb-board">
          <ul className="wb-tasks">
            {demo.tasks.map((t, i) => (
              <li
                key={t.title.en}
                className={t.done ? "done" : undefined}
                style={
                  {
                    "--i": i,
                    "--j": demo.tasks.slice(0, i).filter((x) => !x.done).length,
                  } as React.CSSProperties
                }
              >
                <span className="wb-box" aria-hidden>
                  <Check weight="bold" size={11} />
                </span>
                <span className="wb-task">
                  <T {...t.title} />
                </span>
                <span className={`wb-tag mono ${t.tag.toLowerCase()}`}>
                  {t.tag}
                </span>
              </li>
            ))}
          </ul>
          <div className="wb-prog">
            <span
              className="wb-meter"
              aria-hidden
              style={{ "--pct": `${pct}%` } as React.CSSProperties}
            >
              <i />
            </span>
            <span className="wb-count mono">
              <span className="wb-before">
                {done}/{total} · {pct}%
              </span>
              <span className="wb-after">
                {total}/{total} · 100%
              </span>
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
