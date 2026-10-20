"use client";

import { useEffect, useState } from "react";
import { T, type Bi } from "@/components/t";
import {
  EMPTY_STATE,
  FRIENDS,
  LIVE_SHORT_URL,
  liveConfig,
  shortUrl,
  type LiveConfig,
  type LiveMe,
  type LiveState,
  type WallItem,
} from "@/lib/event-live";
import { usePoll } from "../../use-poll";

type Payload = { state: LiveState; me: LiveMe | null };

/** The projector: the QR code, the current step, and what people handed in. */
export function ScreenApp({ slug, title }: { slug: string; title: Bi }) {
  const config = liveConfig(slug);
  const { data, status } = usePoll<Payload>(`/live/${slug}/api/state`, 3000);
  const state = data?.state ?? EMPTY_STATE;
  const step = state.step ?? "wait";
  const copy = config.copy[step];
  const index = config.steps.indexOf(step);

  return (
    <div className="live-screen" data-step={step}>
      <aside className="live-screen-side">
        <div>
          <span className="mono mute">
            {index >= 0 ? (
              `STEP ${String(index + 1).padStart(2, "0")} / ${String(config.steps.length).padStart(2, "0")}`
            ) : (
              <T zh={title.zh} en={title.en} />
            )}
          </span>
          <h1>
            <T zh={copy.title.zh} en={copy.title.en} />
          </h1>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed SVG, no resizing needed */}
        <img
          className="live-qr"
          src="/live-qr.svg"
          alt={`QR: ${LIVE_SHORT_URL}`}
        />
        <div className="live-screen-url">
          <strong className="mono">{LIVE_SHORT_URL}</strong>
          <span className="mute">
            <T
              zh="扫码，或在电脑上输入这个网址 · 全场一个码"
              en="Scan, or type this on your laptop · one code all day"
            />
          </span>
        </div>
        {status === "offline" ? (
          <span className="mono mute">reconnecting…</span>
        ) : null}
      </aside>
      <section className="live-screen-main">
        {!data ? null : step === "poll" ? (
          <PollBoard config={config} state={state} />
        ) : step === "link" ? (
          <Wall state={state} />
        ) : step === "show" ? (
          <Show state={state} />
        ) : step === "feedback" ? (
          <FeedbackBoard state={state} />
        ) : (
          <CheckIns state={state} />
        )}
      </section>
    </div>
  );
}

function Big({ n, label }: { n: number | string; label: Bi }) {
  return (
    <div className="live-big">
      <b>{n}</b>
      <span className="mute">
        <T zh={label.zh} en={label.en} />
      </span>
    </div>
  );
}

function CheckIns({ state }: { state: LiveState }) {
  return (
    <>
      <Big n={state.checkedIn} label={{ zh: "人已签到", en: "checked in" }} />
      <div className="live-dots" aria-hidden>
        {Array.from({ length: state.checkedIn }, (_, i) => (
          <i key={i} style={{ animationDelay: `${(i % 12) * 40}ms` }} />
        ))}
      </div>
    </>
  );
}

function PollBoard({
  config,
  state,
}: {
  config: LiveConfig;
  state: LiveState;
}) {
  const options = (config.poll?.options ?? []).map((o) => ({
    ...o,
    n: state.poll[o.key] ?? 0,
  }));
  const total = options.reduce((a, o) => a + o.n, 0);
  const max = Math.max(1, ...options.map((o) => o.n));
  const ranked = options.toSorted((a, b) => b.n - a.n);
  const label = (key: string) =>
    options.find((o) => o.key === key)?.label ?? key;
  return (
    <>
      <Big n={total} label={{ zh: "票", en: "votes" }} />
      <div className="live-bars">
        {ranked.map((o, i) => (
          <div key={o.key} className={i === 0 && o.n ? "lead" : undefined}>
            <span>{o.label}</span>
            <span className="track">
              <i style={{ width: `${(o.n / max) * 100}%` }} />
            </span>
            <b className="mono">{o.n}</b>
          </div>
        ))}
      </div>
      <div className="live-quotes">
        {state.pollNotes.slice(0, 4).map((q, i) => (
          <p key={`${q.choice}-${q.note}-${i}`}>
            <b>{label(q.choice)}</b> “{q.note}”
          </p>
        ))}
      </div>
    </>
  );
}

const CHECK_MARK = {
  live: "●",
  pending: "◌",
  down: "✕",
  unchecked: "◆",
} as const;

function Wall({ state }: { state: LiveState }) {
  return (
    <>
      <div className="live-stats">
        <Big
          n={state.links.total}
          label={{ zh: "人交了网址", en: "sites handed in" }}
        />
        <Big n={state.links.live} label={{ zh: "已上线", en: "live" }} />
        <Big
          n={state.links.pending}
          label={{ zh: "等待 Pages 生效", en: "Pages building" }}
        />
      </div>
      <div className="live-wall">
        {state.wall.slice(0, 24).map((w) => (
          <div key={w.id} className="live-wall-card" data-check={w.check}>
            <span className="mono mute">
              {CHECK_MARK[w.check]} {w.name}
            </span>
            <strong className="mono">{shortUrl(w.url)}</strong>
            <span className="mono mute">♥ {w.hearts}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const ROTATE_MS = 25_000;

/** Act four: one site at a time, full size. The host can pin one; otherwise
 * the most liked sites that open take turns. */
function Show({ state }: { state: LiveState }) {
  const queue = state.wall.filter(
    (w) => w.check === "live" || w.check === "unchecked",
  );
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTurn((t) => t + 1), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);
  const pinned = state.wall.find((w) => w.id === state.spotlight);
  const site: WallItem | undefined =
    pinned ?? queue[turn % Math.max(1, queue.length)];
  if (!site) {
    return (
      <Big
        n={0}
        label={{ zh: "个网站可以展示，等大家交网址", en: "sites to show yet" }}
      />
    );
  }
  return (
    <div className="live-show">
      <div className="live-show-cap">
        <strong>{site.name}</strong>
        <span className="mono">{shortUrl(site.url)}</span>
        <span className="mono mute">
          ♥ {site.hearts}
          {pinned
            ? " · PINNED"
            : ` · ${(turn % Math.max(1, queue.length)) + 1}/${queue.length}`}
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

function FeedbackBoard({ state }: { state: LiveState }) {
  const f = state.feedback;
  const pct = (n: number) => (f.n ? `${Math.round((n / f.n) * 100)}%` : "–");
  const max = Math.max(1, ...FRIENDS.map((k) => f.friends[k]));
  return (
    <>
      <div className="live-stats">
        <Big n={f.n} label={{ zh: "人填了反馈", en: "responses" }} />
        <Big n={f.avg ?? "–"} label={{ zh: "平均分", en: "average" }} />
        <Big
          n={pct(f.canEdit.yes)}
          label={{ zh: "回家能自己改", en: "can update at home" }}
        />
      </div>
      <div className="live-bars">
        <p className="mono mute">
          <T zh="今天认识了几个新朋友" en="New friends made today" />
        </p>
        {FRIENDS.map((k) => (
          <div key={k}>
            <span>{k}</span>
            <span className="track">
              <i style={{ width: `${(f.friends[k] / max) * 100}%` }} />
            </span>
            <b className="mono">{f.friends[k]}</b>
          </div>
        ))}
      </div>
    </>
  );
}
