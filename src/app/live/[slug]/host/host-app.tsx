"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Msg, T, type Bi } from "@/components/t";
import {
  liveConfig,
  shortUrl,
  type FeedbackAnswer,
  type HostResponse,
  type HostState,
  type LinkAnswer,
  type LiveStep,
  type PollAnswer,
} from "@/lib/event-live";
import { formatTime } from "@/lib/format";
import {
  setHidden,
  setLiveStep,
  setSpotlight,
  type LiveResult,
} from "../actions";
import { usePoll } from "../../use-poll";

/** The host's console: switch steps, pin a site, hide anything off the wall. */
export function HostApp({ slug, title }: { slug: string; title: Bi }) {
  const config = liveConfig(slug);
  const { data, status, refresh } = usePoll<{ host: HostState }>(
    `/live/${slug}/api/host`,
    3000,
  );
  const [result, setResult] = useState<LiveResult | null>(null);
  const [pending, start] = useTransition();
  const run = (action: () => Promise<LiveResult>) =>
    start(async () => {
      const r = await action();
      setResult(r);
      refresh();
    });

  if (status === "denied") {
    return (
      <div className="live-host wrap">
        <h1>
          <T zh="现场主持" en="Live host" />
        </h1>
        <p className="mute">
          <T
            zh="先在管理页输入管理员口令，再回到这里。"
            en="Enter the admin key first, then come back."
          />
        </p>
        <Link href="/admin" className="btn solid sm">
          /admin
        </Link>
      </div>
    );
  }
  const h = data?.host;
  if (!h) {
    return (
      <div className="live-host wrap">
        <p className="mute">
          {status === "loading" ? (
            <T zh="加载中…" en="Loading…" />
          ) : (
            <T zh="连不上，正在重试…" en="Can't connect, retrying…" />
          )}
        </p>
      </div>
    );
  }

  const of = <S extends HostResponse["step"]>(step: S) =>
    h.responses.filter((r) => r.step === step);
  const links = of("link");
  const polls = of("poll");
  const feedback = of("feedback");
  const steps: LiveStep[] = ["wait", ...config.steps];
  const avg = feedback.length
    ? (
        feedback.reduce(
          (a, r) => a + Number((r.payload as FeedbackAnswer).rating),
          0,
        ) / feedback.length
      ).toFixed(1)
    : "–";

  return (
    <div className="live-host wrap">
      <header className="live-host-head">
        <div>
          <span className="mono mute">
            <T zh="现场主持" en="Live host" />
          </span>
          <h1>
            <T zh={title.zh} en={title.en} />
          </h1>
        </div>
        <div className="live-actions">
          <a
            className="btn ghost sm"
            href={`/live/${slug}/screen`}
            target="_blank"
            rel="noopener"
          >
            <T zh="打开投影屏 ↗" en="Open the screen ↗" />
          </a>
          <a
            className="btn ghost sm"
            href={`/live/${slug}`}
            target="_blank"
            rel="noopener"
          >
            <T zh="参与者页面 ↗" en="Participant page ↗" />
          </a>
        </div>
      </header>

      <section className="live-host-steps" aria-label="当前环节">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            aria-pressed={h.step === s}
            disabled={pending}
            onClick={() => run(() => setLiveStep(slug, s))}
          >
            {config.copy[s].at ? (
              <span className="n">{config.copy[s].at}</span>
            ) : null}
            <T zh={config.copy[s].label.zh} en={config.copy[s].label.en} />
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={h.step === null}
          disabled={pending || h.step === null}
          onClick={() => {
            if (
              confirm(
                "结束现场？大家的手机会显示「还没开始」，已交的内容都保留。",
              )
            ) {
              run(() => setLiveStep(slug, null));
            }
          }}
        >
          <T zh="结束现场" en="End" />
        </button>
      </section>
      {result && result.status !== "ok" ? (
        <p className="live-msg error">
          <Msg s={result.message} />
        </p>
      ) : null}

      <section className="live-host-stats">
        <Stat
          n={`${h.checkedIn} / ${h.registered}`}
          label={{ zh: "签到 / 报名", en: "In / signed up" }}
        />
        <Stat n={h.walkIns} label={{ zh: "现场补登", en: "Walk-ins" }} />
        <Stat n={polls.length} label={{ zh: "投票", en: "Votes" }} />
        <Stat
          n={`${links.filter((r) => (r.payload as LinkAnswer).check === "live").length} / ${links.length}`}
          label={{ zh: "上线 / 交网址", en: "Live / sites" }}
        />
        <Stat
          n={`${feedback.length} · ${avg}`}
          label={{ zh: "反馈 · 平均分", en: "Feedback · avg" }}
        />
      </section>

      <HostSection title={{ zh: "网址", en: "Sites" }} count={links.length}>
        <table className="live-table">
          <tbody>
            {links.map((r) => {
              const p = r.payload as LinkAnswer;
              const pinned = h.spotlight === r.id;
              return (
                <tr key={r.id} className={r.hidden ? "off" : undefined}>
                  <td>
                    {r.name}
                    {r.github &&
                    p.kind === "pages" &&
                    !p.host.startsWith(`${r.github.toLowerCase()}.`) ? (
                      <span className="mono warn"> GitHub: {r.github}</span>
                    ) : null}
                  </td>
                  <td>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono"
                    >
                      {shortUrl(p.url)}
                    </a>
                    {p.title ? (
                      <span className="mute"> · {p.title}</span>
                    ) : null}
                  </td>
                  <td className="mono">{p.check}</td>
                  <td className="mono">{r.onWall ? "上墙" : "不上墙"}</td>
                  <td className="mono">♥ {r.hearts}</td>
                  <td className="live-row-actions">
                    {r.onWall && !r.hidden ? (
                      <button
                        type="button"
                        className="btn ghost sm"
                        disabled={pending}
                        onClick={() =>
                          run(() => setSpotlight(slug, pinned ? null : r.id))
                        }
                      >
                        {pinned ? (
                          <T zh="取消投屏" en="Unpin" />
                        ) : (
                          <T zh="投屏" en="Pin" />
                        )}
                      </button>
                    ) : null}
                    <HideButton slug={slug} r={r} run={run} pending={pending} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </HostSection>

      <HostSection
        title={{ zh: "投票留言", en: "Poll notes" }}
        count={polls.filter((r) => (r.payload as PollAnswer).note).length}
      >
        <table className="live-table">
          <tbody>
            {polls
              .filter((r) => (r.payload as PollAnswer).note)
              .map((r) => {
                const p = r.payload as PollAnswer;
                return (
                  <tr key={r.id} className={r.hidden ? "off" : undefined}>
                    <td>{r.name}</td>
                    <td className="mono">{p.choice}</td>
                    <td>{p.note}</td>
                    <td className="live-row-actions">
                      <HideButton
                        slug={slug}
                        r={r}
                        run={run}
                        pending={pending}
                      />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </HostSection>

      <HostSection
        title={{ zh: "反馈", en: "Feedback" }}
        count={feedback.length}
      >
        <table className="live-table">
          <tbody>
            {feedback.map((r) => {
              const p = r.payload as FeedbackAnswer;
              return (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="mono">
                    {p.rating}★ · {p.canEdit} · {p.friends}
                  </td>
                  <td>{p.good ? `喜欢：${p.good}` : ""}</td>
                  <td>{p.bad ? `建议：${p.bad}` : ""}</td>
                  <td className="mono mute">{formatTime(r.at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </HostSection>
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: Bi }) {
  return (
    <div>
      <b>{n}</b>
      <span className="mono mute">
        <T zh={label.zh} en={label.en} />
      </span>
    </div>
  );
}

function HostSection({
  title,
  count,
  children,
}: {
  title: Bi;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="live-host-sec">
      <h2>
        <T zh={title.zh} en={title.en} />{" "}
        <span className="mono mute">{count}</span>
      </h2>
      {count ? children : <p className="mute">–</p>}
    </section>
  );
}

function HideButton({
  slug,
  r,
  run,
  pending,
}: {
  slug: string;
  r: HostResponse;
  run: (a: () => Promise<LiveResult>) => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      className="btn ghost sm"
      disabled={pending}
      onClick={() => run(() => setHidden(slug, r.id, !r.hidden))}
    >
      {r.hidden ? <T zh="放回墙上" en="Show" /> : <T zh="藏起来" en="Hide" />}
    </button>
  );
}
