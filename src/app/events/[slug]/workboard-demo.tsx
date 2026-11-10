"use client";

import { Check, Microphone } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/components/fx/motion";
import { T } from "@/components/t";
import type { WorkboardDemo as Demo } from "@/lib/event-pages";

/** How long each stage of a round holds: listening, heard, working, done. */
const HOLD_MS = [1200, 1400, 2400, 1500];
const STAGES = HOLD_MS.length;
/** The board stays finished this long before it starts over. */
const END_MS = 4200;

/**
 * The day's live demo, replayed: each task on the starter gets its own round
 * — a request said out loud, the agent ticks off its steps, the task is done
 * — so the board ends with every task ticked. The first round also puts the
 * priority tags on. The server renders the finished board, so it reads right
 * before any script runs and stays that way for people who prefer reduced
 * motion. The loop only runs while the board is on screen; starting over,
 * ticks and tags fade out rather than vanish.
 */
export function WorkboardDemo({ demo }: { demo: Demo }) {
  const ref = useRef<HTMLElement>(null);
  const rounds = demo.tasks.length;
  const last = rounds * STAGES - 1;
  // One counter over every stage of every round.
  const [at, setAt] = useState(last);
  const round = Math.floor(at / STAGES);
  const stage = at % STAGES;

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let timer = 0;
    let current = last;
    const next = () => {
      current = (current + 1) % (last + 1);
      setAt(current);
      timer = window.setTimeout(
        next,
        current === last ? END_MS : HOLD_MS[current % STAGES],
      );
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
  }, [last]);

  const doneStage = STAGES - 1;
  const ticked = (i: number) =>
    i < round || (i === round && stage === doneStage);
  const done = demo.tasks.filter((_, i) => ticked(i)).length;
  const pct = Math.round((done / rounds) * 100);
  const tagged = round > 0 || stage === doneStage;
  const finished = at === last;

  return (
    <figure
      ref={ref}
      className={`wb${tagged ? " tagged" : ""}`}
      data-stage={stage}
    >
      <div className="wb-bar">
        <span className="wb-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="wb-name">Workboard</span>
        <span className={`wb-state mono${finished ? " on" : ""}`}>
          {finished ? (
            <T zh="全部完成" en="All done" />
          ) : (
            <T
              zh={`任务 ${round + 1} / ${rounds}`}
              en={`Task ${round + 1} of ${rounds}`}
            />
          )}
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
          {/* Every round sits in the same cell, so the pane never jumps. */}
          <div className="wb-rounds">
            {demo.tasks.map((t, r) => (
              <div
                key={t.title.en}
                className="wb-round"
                data-on={r === round || undefined}
                aria-hidden={r !== round || undefined}
              >
                <p className="wb-ask">
                  <T {...t.ask} />
                </p>
                <p className="wb-who mono">{demo.agent}</p>
                <ol className="wb-steps">
                  {t.steps.map((s, i) => (
                    <li key={s.en} style={{ "--i": i } as React.CSSProperties}>
                      <Check weight="bold" size={12} aria-hidden />
                      <T {...s} />
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        <div className="wb-board">
          <ul className="wb-tasks">
            {demo.tasks.map((t, i) => (
              <li
                key={t.title.en}
                className={
                  ticked(i)
                    ? "done"
                    : i === round && !finished
                      ? "now"
                      : undefined
                }
                style={{ "--i": i } as React.CSSProperties}
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
            <span className="wb-meter" aria-hidden>
              <i style={{ width: `${pct}%` }} />
            </span>
            <span className="wb-count mono">
              {done}/{rounds} · {pct}%
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
