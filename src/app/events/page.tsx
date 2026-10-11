import type { Metadata } from "next";
import Link from "next/link";
import { SampleNotice } from "@/components/sample-notice";
import { getEventSchedule } from "@/lib/data";
import { formatShortDate, formatTimeRange } from "@/lib/format";
import { EVENT_KIND_LABEL, type SiteEvent } from "@/lib/types";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "活动" };

export default async function EventsPage() {
  const { upcoming, past } = await getEventSchedule();
  const calendarUrl = `${siteUrl.replace(/^https?:/, "webcal:")}/events.ics`;

  return (
    <section className="sec first">
      <div className="wrap">
        <p className="eyebrow mono">活动 / Events · T3 2026</p>
        <h1 className="display page-title">
          <span className="line">
            <span>Every week,</span>
          </span>
          <span className="line">
            <span className="outline">same time.</span>
          </span>
        </h1>
        <p className="lede" style={{ marginTop: 28 }}>
          每周 1 场固定 Build Night，隔周 1 场 Demo
          或主题活动。考试期只做线上答疑。
        </p>

        <div className="ev-list">
          <div className="filters">
            <span className="mono mute label">接下来</span>
            <SampleNotice />
          </div>
          {upcoming.length === 0 && (
            <p className="empty">下一场活动筹备中，进群第一时间收到通知。</p>
          )}
          {upcoming.map((event) => (
            <EventRow key={event.slug} event={event} />
          ))}
        </div>

        <div className="box subscribe">
          <div>
            <h3 style={{ fontSize: 18 }}>订阅活动日历</h3>
            <p className="mute">导入 Google 或 Apple 日历，新活动自动出现。</p>
            <code>{calendarUrl}</code>
          </div>
          <a href={calendarUrl} className="btn ghost">
            订阅 <span className="arr">→</span>
          </a>
        </div>

        {past.length > 0 && (
          <div className="ev-list" style={{ marginTop: 56 }}>
            <p className="mono mute">往期</p>
            {past.map((event) => (
              <EventRow key={event.slug} event={event} past />
            ))}
          </div>
        )}

        <p className="empty" style={{ marginTop: 56 }}>
          每场工作坊结束后 48 小时内，讲义、示例仓库和录屏会出现在{" "}
          <Link href="/learn" className="text-link">
            教程资料
          </Link>
          。
        </p>
      </div>
    </section>
  );
}

function EventRow({ event, past }: { event: SiteEvent; past?: boolean }) {
  const body = (
    <>
      <div className="ev-date">
        {formatShortDate(event.startsAt)}
        <small className="mute">
          {formatTimeRange(event.startsAt, event.endsAt)}
        </small>
      </div>
      <div className="ev-main">
        <div className="need">
          <span className="tag">{EVENT_KIND_LABEL[event.kind]}</span>
        </div>
        <h3>{event.title}</h3>
      </div>
      <p className="ev-where mute">{event.location}</p>
      <span className="ev-go" aria-hidden>
        {event.signupUrl ? "↗" : "·"}
      </span>
    </>
  );

  const className = `ev ${past ? "past" : ""}`;
  return event.signupUrl && !past ? (
    <a
      id={event.slug}
      href={event.signupUrl}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      {body}
    </a>
  ) : (
    <div id={event.slug} className={className}>
      {body}
    </div>
  );
}
