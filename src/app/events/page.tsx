import type { Metadata } from "next";
import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { PageHead } from "@/components/page-head";
import { SampleNotice } from "@/components/sample-notice";
import { getEventSchedule, getTutorials } from "@/lib/data";
import { formatShortDate, formatTime, formatTimeRange } from "@/lib/format";
import { EVENT_KIND_LABEL, type SiteEvent } from "@/lib/types";
import { siteUrl } from "@/lib/site-url";
import { T } from "@/components/t";
import { CopyButton, EventList, Roadmap } from "./events-fx";

export const metadata: Metadata = { title: "活动" };

export default async function EventsPage() {
  const [{ upcoming, past }, tutorials] = await Promise.all([
    getEventSchedule(),
    getTutorials(),
  ]);
  const withMaterials = new Set(tutorials.map((t) => t.eventSlug));
  const calendarUrl = `${siteUrl.replace(/^https?:/, "webcal:")}/events.ics`;
  const next = upcoming[0];
  const inPerson = [...upcoming, ...past].filter(
    (e) => e.kind !== "online",
  ).length;
  const kinds = [...new Set([...upcoming, ...past].map((e) => e.kind))];

  return (
    <section className="sec first">
      <div className="wrap">
        <PageHead
          path="events"
          eyebrow={{ zh: "活动 / Events · T3 2026", en: "Events · T3 2026" }}
          title={["Every week,", "same time."]}
          aside={[
            {
              k: { zh: "下一场", en: "Next up" },
              v: next
                ? {
                    zh: `${formatShortDate(next.startsAt)} · ${formatTime(next.startsAt)}`,
                    en: `${formatShortDate(next.startsAt)} · ${formatTime(next.startsAt)}`,
                  }
                : { zh: "筹备中", en: "TBA" },
            },
            {
              k: { zh: "Build Night", en: "Build Night" },
              v: { zh: "每周三晚", en: "Wed nights" },
            },
            {
              k: { zh: "本学期线下", en: "In person this term" },
              v: { zh: `${inPerson} 场`, en: String(inPerson) },
            },
          ]}
        />
        <p className="lede">
          <T
            zh="每周 1 场固定 Build Night，隔周 1 场 Demo 或主题活动。11 月 20 日是 T3 最后一个教学日，之后只做线上答疑。"
            en="A Build Night every week, plus a demo or themed session every other week. 20 November is the last T3 teaching day; after that it's online Q&A only."
          />
        </p>

        <Roadmap />

        <div className="bn-flow">
          {RHYTHM.map((r) => (
            <div key={r.when.en}>
              <span className="mono mute">
                <T {...r.when} />
              </span>
              <b>
                <T {...r.what} />
              </b>
              <p className="mute">
                <T {...r.body} />
              </p>
            </div>
          ))}
        </div>

        <div className="cal-row">
          <div>
            <b style={{ fontSize: 14 }}>
              <T zh="订阅活动日历" en="Subscribe to the calendar" />
            </b>
            <span className="mute" style={{ fontSize: 13 }}>
              <T
                zh="导入 Google 或 Apple 日历，新活动自动出现。"
                en="Add it to Google or Apple Calendar; new events show up automatically."
              />
            </span>
          </div>
          <div>
            <code className="code">{calendarUrl}</code>
            <CopyButton text={calendarUrl} />
            <a
              href={calendarUrl}
              className="btn ghost"
              style={{ "--h": "38px" } as React.CSSProperties}
            >
              <T zh="订阅" en="Subscribe" /> <Arr />
            </a>
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <SampleNotice />
        </div>
        <EventList kinds={kinds}>
          {upcoming.length === 0 && (
            <p className="empty">
              <T
                zh="下一场活动筹备中，进群第一时间收到通知。"
                en="The next event is being planned — join the group to hear first."
              />
            </p>
          )}
          {upcoming.map((event, i) => (
            <EventRow key={event.slug} event={event} n={i + 1} />
          ))}
          {past.map((event, i) => (
            <EventRow
              key={event.slug}
              event={event}
              n={upcoming.length + i + 1}
              past
              materials={withMaterials.has(event.slug)}
            />
          ))}
        </EventList>

        <div className="empty" style={{ marginTop: 56 }}>
          <span className="mono mute">
            <T zh="往期资料" en="Past materials" />
          </span>
          <p style={{ margin: "8px 0 16px", color: "var(--paper)" }}>
            <T
              zh="每场工作坊结束后 48 小时内，讲义、示例仓库和录屏会出现在教程资料。"
              en="Within 48 hours of each workshop, slides, example repos and recordings go up on Learn."
            />
          </p>
          <Link
            href="/learn"
            className="btn ghost"
            style={{ "--h": "38px" } as React.CSSProperties}
          >
            <T zh="先看教程资料" en="Browse Learn" /> <Arr />
          </Link>
        </div>
      </div>
    </section>
  );
}

const RHYTHM = [
  {
    when: { zh: "周一 · 线上", en: "Monday · online" },
    what: { zh: "群里抛问题", en: "Post your blocker" },
    body: {
      zh: "每个项目贴出这周要解决的一件事，提前找好能帮忙的人。",
      en: "Each project posts the one thing it needs to solve this week, and finds who can help.",
    },
  },
  {
    when: { zh: "周三 18:30 · 线下", en: "Wednesday 18:30 · in person" },
    what: { zh: "一起写两小时", en: "Two hours of building" },
    body: {
      zh: "按项目坐，卡住就举手。讲解用中文，提交记录用英文。",
      en: "Sit with your project, raise a hand when stuck. Explanations in Chinese, commits in English.",
    },
  },
  {
    when: { zh: "每两周 · 项目卡", en: "Fortnightly · project card" },
    what: { zh: "更新一次进展", en: "Post an update" },
    body: {
      zh: "代码提交、Demo 或更新帖任一，计入双周活跃项目数。",
      en: "A commit, demo or update post — any one counts towards active projects.",
    },
  },
];

function EventRow({
  event,
  n,
  past,
  materials,
}: {
  event: SiteEvent;
  n: number;
  past?: boolean;
  materials?: boolean;
}) {
  const body = (
    <>
      <span className="ev-i">{String(n).padStart(2, "0")}</span>
      <div className="ev-date">
        {formatShortDate(event.startsAt)}
        <small className="mute">
          {formatTimeRange(event.startsAt, event.endsAt)}
        </small>
      </div>
      <div className="ev-main">
        <div className="need">
          <span className="tag">
            <T {...EVENT_KIND_LABEL[event.kind]} />
          </span>
          {past && (
            <span className="tag dash">
              <T zh="已结束" en="Past" />
            </span>
          )}
        </div>
        <h3>{event.title}</h3>
        {materials && (
          <span className="mono mute">
            <T zh="讲义 · 示例仓库 · 录屏" en="Slides · repo · recording" />
          </span>
        )}
      </div>
      <p className="ev-where mute">{event.location}</p>
      <span className="ev-go" aria-hidden>
        {materials ? "→" : event.signupUrl && !past ? "↗" : "·"}
      </span>
    </>
  );

  const props = {
    id: event.slug,
    className: `ev ${past && !materials ? "past" : ""}`,
    "data-kind": event.kind,
    "data-date": formatShortDate(event.startsAt),
  };
  if (materials) {
    return (
      <Link {...props} href={`/learn#${event.slug}`}>
        {body}
      </Link>
    );
  }
  return event.signupUrl && !past ? (
    <a {...props} href={event.signupUrl} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    <div {...props}>{body}</div>
  );
}
