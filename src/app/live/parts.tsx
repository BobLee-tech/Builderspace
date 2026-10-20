"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/t";
import {
  shortUrl,
  type LiveConfig,
  type LiveState,
  type PollOption,
  type WallItem,
} from "@/lib/event-live";

/** An AI's character from the slides; "?" for options without one. */
export function AiAvatar({ option }: { option?: PollOption }) {
  if (!option?.image) {
    return (
      <span className="live-avatar live-avatar-none" aria-hidden>
        ?
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small fixed squares
    <img className="live-avatar" src={option.image} alt="" loading="lazy" />
  );
}

/**
 * The poll as everyone sees it, on phones and on the projected laptop: one
 * row per AI with its character, most votes first.
 */
export function PollResults({
  config,
  state,
  mine,
}: {
  config: LiveConfig;
  state: LiveState;
  /** The voter's own pick, marked in the list. */
  mine?: string;
}) {
  const options = config.poll?.options ?? [];
  const rows = options
    .map((o, i) => ({ ...o, n: state.poll[o.key] ?? 0, i }))
    .sort((a, b) => b.n - a.n || a.i - b.i);
  const total = rows.reduce((a, r) => a + r.n, 0);
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="live-results">
      <div className="live-results-head">
        <span className="mono mute">
          <T zh="实时结果" en="Live results" />
        </span>
        <b>
          {total}
          <span className="mute">
            <T zh=" 票" en=" votes" />
          </span>
        </b>
      </div>
      <ol className="live-rank">
        {rows.map((r, place) => (
          <li
            key={r.key}
            data-lead={place === 0 && r.n > 0 ? "" : undefined}
            data-mine={r.key === mine ? "" : undefined}
          >
            <AiAvatar option={r} />
            <div className="live-rank-body">
              <div className="live-rank-name">
                <strong>{r.label}</strong>
                {r.maker ? <span className="mute">{r.maker}</span> : null}
                {r.key === mine ? (
                  <span className="live-rank-you mono">
                    <T zh="你" en="you" />
                  </span>
                ) : null}
              </div>
              <span className="live-rank-track">
                <i style={{ width: `${(r.n / max) * 100}%` }} />
              </span>
            </div>
            <div className="live-rank-n">
              <b>{r.n}</b>
              <span className="mute mono">
                {total ? `${Math.round((r.n / total) * 100)}%` : "–"}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The latest "love / hate" lines from the poll. */
export function PollVoices({
  config,
  state,
}: {
  config: LiveConfig;
  state: LiveState;
}) {
  const byKey = (key: string) =>
    (config.poll?.options ?? []).find((o) => o.key === key);
  if (!state.pollNotes.length) return null;
  return (
    <div className="live-results">
      <span className="mono mute">
        <T zh="大家怎么说" en="What people say" />
      </span>
      <ul className="live-voices">
        {state.pollNotes.slice(0, 6).map((q, i) => (
          <li key={`${q.choice}-${i}-${q.like}-${q.pain}`}>
            <AiAvatar option={byKey(q.choice)} />
            <div>
              {q.like ? <p>👍 {q.like}</p> : null}
              {q.pain ? <p>😖 {q.pain}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ROTATE_MS = 25_000;

/**
 * Act four: one site at a time, full width. The host can pin one from the
 * phone; otherwise the most liked sites that open take turns, on the same
 * clock everywhere so every screen shows the same site.
 */
export function Showcase({ state }: { state: LiveState }) {
  const queue = state.wall.filter(
    (w) => w.check === "live" || w.check === "unchecked",
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const pinned = state.wall.find((w) => w.id === state.spotlight);
  const turn = Math.floor(now / ROTATE_MS) % Math.max(1, queue.length);
  const site: WallItem | undefined = pinned ?? queue[turn];

  if (!site) {
    return (
      <div className="live-show live-show-empty">
        <p className="mute">
          <T
            zh="还没有可以展示的网站，交了网址就会出现在这里。"
            en="No sites to show yet; they appear here once handed in."
          />
        </p>
      </div>
    );
  }
  return (
    <div className="live-show">
      <div className="live-show-cap">
        <strong>{site.name}</strong>
        <a
          className="mono"
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {shortUrl(site.url)} ↗
        </a>
        <span className="mono mute">
          ♥ {site.hearts}
          {pinned ? "" : ` · ${turn + 1}/${queue.length}`}
        </span>
      </div>
      <iframe
        key={site.url}
        src={site.url}
        title={site.name}
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

const CHECK_MARK = {
  live: "●",
  pending: "◌",
  down: "✕",
  unchecked: "◆",
} as const;

/** Everyone's handed-in sites, for whoever hasn't handed one in yet. */
export function WallGrid({ state }: { state: LiveState }) {
  return (
    <div className="live-wall-block">
      <div className="live-results-head">
        <span className="mono mute">
          <T zh="成果墙" en="The wall" />
        </span>
        <b>
          {state.links.total}
          <span className="mute">
            <T
              zh={` 人已交 · ${state.links.live} 已上线`}
              en={` handed in · ${state.links.live} live`}
            />
          </span>
        </b>
      </div>
      <div className="live-wall">
        {state.wall.slice(0, 30).map((w) => (
          <a
            key={w.id}
            className="live-wall-card"
            data-check={w.check}
            href={w.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="mono mute">
              {CHECK_MARK[w.check]} {w.name}
            </span>
            <strong className="mono">{shortUrl(w.url)}</strong>
            <span className="mono mute">♥ {w.hearts}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
