"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { hasFinePointer, prefersReducedMotion } from "@/components/fx/motion";
import { T } from "@/components/t";
import {
  ROADMAP_MARKS,
  ROADMAP_WEEKS,
  roadmapOffset,
  roadmapWeekStart,
} from "@/lib/roadmap";
import { EVENT_KIND_LABEL, type EventKind } from "@/lib/types";

const pct = (k: number) => `${(Math.max(0, Math.min(1, k)) * 100).toFixed(2)}%`;

/** Eight-week strip with checkpoints; "today" is placed on the client. */
export function Roadmap() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setNow(Date.now()));
    return () => cancelAnimationFrame(id);
  }, []);
  const at = now === null ? null : roadmapOffset(now);
  const week = at === null ? -1 : Math.floor(at * ROADMAP_WEEKS.length);
  const today =
    now === null
      ? null
      : new Intl.DateTimeFormat("en-AU", {
          timeZone: "Australia/Sydney",
          month: "numeric",
          day: "numeric",
        })
          .formatToParts(now)
          .reduce<Record<string, string>>(
            (o, p) => ({ ...o, [p.type]: p.value }),
            {},
          );

  return (
    <div className="road">
      <div className="road-head mono mute">
        <span>
          <T zh="未来 8 周 · UNSW T3 校历" en="Next 8 weeks · UNSW T3" />
        </span>
        <span className="legend">
          <span>
            <i className="lg lg-off" />
            <T zh="停课 / 考试期" en="No classes / exams" />
          </span>
          <span>
            <i className="lg lg-cp" />
            <T zh="检查点" en="Checkpoint" />
          </span>
          <span>
            <i className="lg lg-now" />
            <T zh="今天" en="Today" />
          </span>
        </span>
      </div>
      <div className="road-scroll">
        <div className="road-inner">
          <div className="weeks">
            {ROADMAP_WEEKS.map((w, i) => (
              <div
                key={w.label}
                className={`wk${w.off ? " off" : ""}${i === week ? " now" : ""}`}
              >
                <span className="mono mute">{roadmapWeekStart(i)}</span>
                <b>{w.label}</b>
                <span className="pill">
                  <T {...w.plan} />
                </span>
              </div>
            ))}
          </div>
          <div className="road-marks" aria-hidden>
            {ROADMAP_MARKS.map((m) => (
              <span
                key={m.date}
                className={m.kind === "checkpoint" ? "cp" : "lastday"}
                style={{ left: pct(roadmapOffset(m.date)) }}
              >
                {m.kind === "checkpoint" && <i />}
                <em>
                  <T {...m.label} />
                </em>
              </span>
            ))}
            {at !== null && at >= 0 && at <= 1 && today && (
              <span className="today" style={{ left: pct(at) }}>
                {/* Near the left edge the label would be clipped; hang it right. */}
                <em
                  style={
                    at < 0.06 ? { transform: "translateX(-6px)" } : undefined
                  }
                >
                  <T
                    zh={`今天 ${today.month}/${today.day}`}
                    en={`Today ${today.day}/${today.month}`}
                  />
                </em>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const INITIALS: Record<EventKind, string> = {
  workshop: "WS",
  build_night: "BN",
  demo_night: "DN",
  online: "ON",
  other: "BS",
};
const COVER: Record<EventKind, number> = {
  workshop: 2,
  build_night: 0,
  demo_night: 5,
  online: 4,
  other: 1,
};

/**
 * Kind filter for the server-rendered rows (CSS hides non-matching ones via
 * data-f), plus the floating preview card that trails the cursor over a row.
 */
export function EventList({
  kinds,
  children,
}: {
  kinds: EventKind[];
  children: ReactNode;
}) {
  const [filter, setFilter] = useState<EventKind | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const peek = useRef<HTMLDivElement>(null);
  const [row, setRow] = useState<{ kind: EventKind; date: string } | null>(
    null,
  );

  useEffect(() => {
    const box = list.current;
    const card = peek.current;
    if (!box || !card || !hasFinePointer() || prefersReducedMotion()) return;
    let tx = 0,
      ty = 0,
      px = 0,
      py = 0,
      on = false,
      raf = 0;
    const follow = () => {
      px += (tx - px) * 0.16;
      py += (ty - py) * 0.16;
      card.style.left = `${px}px`;
      card.style.top = `${py}px`;
      if (on || Math.abs(tx - px) > 0.5) raf = requestAnimationFrame(follow);
      else raf = 0;
    };
    const move = (e: PointerEvent) => {
      const ev = (e.target as Element).closest<HTMLElement>(".ev");
      if (!ev) return;
      tx = e.clientX + 150;
      ty = e.clientY;
      if (!on) {
        px = tx;
        py = ty;
        on = true;
        card.classList.add("on");
      }
      setRow((r) =>
        r?.date === ev.dataset.date
          ? r
          : { kind: ev.dataset.kind as EventKind, date: ev.dataset.date ?? "" },
      );
      if (!raf) raf = requestAnimationFrame(follow);
    };
    const leave = () => {
      on = false;
      card.classList.remove("on");
    };
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerleave", leave);
      // Leaving through a row link never fires pointerleave; don't let the
      // card float over the page when it comes back.
      card.classList.remove("on");
    };
  }, []);

  return (
    <>
      <div className="list-head">
        <div className="filters" role="group" aria-label="Event type / 类型">
          <span className="mono mute label">
            <T zh="类型" en="Type" />
          </span>
          <button
            type="button"
            className="chip"
            aria-pressed={!filter}
            onClick={() => setFilter(null)}
          >
            <T zh="全部" en="All" />
          </button>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              className="chip"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
            >
              <T {...EVENT_KIND_LABEL[k]} />
            </button>
          ))}
        </div>
        <div className="ev-cols mono mute" aria-hidden>
          <span>#</span>
          <span>
            <T zh="日期" en="Date" />
          </span>
          <span>
            <T zh="活动" en="Event" />
          </span>
          <span>
            <T zh="地点" en="Where" />
          </span>
          <span />
        </div>
      </div>
      <div className="ev-list" ref={list} data-f={filter ?? undefined}>
        {children}
      </div>
      <div className="ev-peek" ref={peek} aria-hidden>
        <div className="cover" data-v={row ? COVER[row.kind] : 0}>
          <span className="ini">{row ? INITIALS[row.kind] : "BS"}</span>
          <span className="id">BS-EV</span>
        </div>
        <div className="peek-t mono">
          {row && (
            <>
              {row.date} · <T {...EVENT_KIND_LABEL[row.kind]} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Copies a link, with the result shown in place for a moment. */
export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState<boolean | null>(null);
  useEffect(() => {
    if (done === null) return;
    const t = setTimeout(() => setDone(null), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      className="chip"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(
          () => setDone(true),
          () => setDone(false),
        )
      }
    >
      {done === null ? (
        <T zh="复制链接" en="Copy link" />
      ) : done ? (
        <T zh="已复制" en="Copied" />
      ) : (
        <T zh="复制失败" en="Copy failed" />
      )}
    </button>
  );
}
