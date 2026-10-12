import type { Metadata } from "next";
import Link from "next/link";
import { NAV_TRANSITION } from "@/components/nav-links";
import { PageTransition } from "@/components/page-transition";
import { SampleNotice } from "@/components/sample-notice";
import { getEventSchedule, getTutorials } from "@/lib/data";
import { formatShortDate, formatTimeRange } from "@/lib/format";
import { EVENT_KIND_LABEL, type SiteEvent } from "@/lib/types";
import { siteUrl } from "@/lib/site-url";
import { T } from "@/components/t";

export const metadata: Metadata = { title: "活动" };

export default async function EventsPage() {
  const [{ upcoming, past }, tutorials] = await Promise.all([
    getEventSchedule(),
    getTutorials(),
  ]);
  const withMaterials = new Set(tutorials.map((t) => t.eventSlug));
  const calendarUrl = `${siteUrl.replace(/^https?:/, "webcal:")}/events.ics`;

  return (
    <PageTransition>
      <section className="sec first">
        <div className="wrap">
          <p className="eyebrow mono">
            <T zh="活动 / Events · T3 2026" en="Events · T3 2026" />
          </p>
          <h1 className="display page-title">
            <span className="line">
              <span>Every week,</span>
            </span>
            <span className="line">
              <span className="outline">same time.</span>
            </span>
          </h1>
          <p className="lede" style={{ marginTop: 28 }}>
            <T
              zh="每周 1 场固定 Build Night，隔周 1 场 Demo 或主题活动。考试期只做线上答疑。"
              en="A Build Night every week, plus a demo or themed session every other week. Online Q&A only during exams."
            />
          </p>

          <div className="ev-list">
            <div className="filters">
              <span className="mono mute label">
                <T zh="接下来" en="Upcoming" />
              </span>
              <SampleNotice />
            </div>
            {upcoming.length === 0 && (
              <p className="empty">
                <T
                  zh="下一场活动筹备中，进群第一时间收到通知。"
                  en="The next event is being planned — join the group to hear first."
                />
              </p>
            )}
            {upcoming.map((event) => (
              <EventRow key={event.slug} event={event} />
            ))}
          </div>

          <div className="box subscribe" data-rv>
            <div>
              <h3>
                <T zh="订阅活动日历" en="Subscribe to the calendar" />
              </h3>
              <p className="mute">
                <T
                  zh="导入 Google 或 Apple 日历，新活动自动出现。"
                  en="Add it to Google or Apple Calendar; new events show up automatically."
                />
              </p>
              <code>{calendarUrl}</code>
            </div>
            <a href={calendarUrl} className="btn ghost">
              <T zh="订阅" en="Subscribe" /> <span className="arr">→</span>
            </a>
          </div>

          {past.length > 0 && (
            <div className="ev-list" style={{ marginTop: 56 }}>
              <p className="mono mute">
                <T zh="往期" en="Past" />
              </p>
              {past.map((event) => (
                <EventRow
                  key={event.slug}
                  event={event}
                  past
                  materials={withMaterials.has(event.slug)}
                />
              ))}
            </div>
          )}

          <p className="empty" style={{ marginTop: 56 }}>
            <T
              zh="每场工作坊结束后 48 小时内，讲义、示例仓库和录屏会出现在"
              en="Within 48 hours of each workshop, slides, example repos and recordings go up on"
            />{" "}
            <Link
              transitionTypes={NAV_TRANSITION}
              href="/learn"
              className="text-link"
            >
              <T zh="资源" en="Resources" />
            </Link>
            <T zh="。" en="." />
          </p>
        </div>
      </section>
    </PageTransition>
  );
}

function EventRow({
  event,
  past,
  materials,
}: {
  event: SiteEvent;
  past?: boolean;
  materials?: boolean;
}) {
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
          <span className="tag">
            <T {...EVENT_KIND_LABEL[event.kind]} />
          </span>
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

  const className = `ev ${past && !materials ? "past" : ""}`;
  if (materials) {
    return (
      <Link
        transitionTypes={NAV_TRANSITION}
        id={event.slug}
        href={`/learn#${event.slug}`}
        className={className}
      >
        {body}
      </Link>
    );
  }
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
