import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Arr } from "@/components/fx/arr";
import { PageHeadFx } from "@/components/fx/page-head-fx";
import { LitTitle } from "@/components/page-head";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { getEventDetail } from "@/lib/data";
import { getEventPage, type EventPage } from "@/lib/event-pages";
import {
  formatDate,
  formatShortDate,
  formatTime,
  formatTimeRange,
} from "@/lib/format";
import { siteUrl } from "@/lib/site-url";
import {
  EVENT_KIND_LABEL,
  SEAT_GROUP_LABEL,
  type EventSignups,
  type SiteEvent,
} from "@/lib/types";
import { AddressBar } from "../address-bar";
import { Countdown } from "../countdown";
import { doto } from "../doto";
import { EVENT_ICONS as ICONS, eventIsFull, seatGroups } from "../event-parts";
import { SignupForm } from "./signup-form";
import "../events.css";
import "./event.css";

export async function generateMetadata({
  params,
}: PageProps<"/events/[slug]">): Promise<Metadata> {
  const detail = await getEventDetail((await params).slug);
  if (!detail) return {};
  const { event } = detail;
  const page = getEventPage(event.slug);
  return {
    title: event.title,
    description: page?.summary.zh ?? event.summary ?? undefined,
  };
}

export default function EventPageRoute({
  params,
}: PageProps<"/events/[slug]">) {
  return (
    <Suspense
      fallback={
        <section className="sec first">
          <div className="wrap">
            <Crumb />
            <p className="mute" style={{ marginTop: 32 }}>
              <T zh="加载中…" en="Loading…" />
            </p>
          </div>
        </section>
      }
    >
      {params.then(({ slug }) => (
        <EventDetail slug={slug} />
      ))}
    </Suspense>
  );
}

function Crumb() {
  return (
    <Link href="/events" className="crumb mono">
      ← <T zh="活动" en="Events" />
    </Link>
  );
}

async function EventDetail({ slug }: { slug: string }) {
  const detail = await getEventDetail(slug);
  if (!detail) notFound();
  const { event, signups, phase } = detail;
  const page = getEventPage(event.slug);
  const full = eventIsFull(event, signups);
  const calendarUrl = `${siteUrl.replace(/^https?:/, "webcal:")}/events.ics`;
  const groups = seatGroups(event);

  return (
    <section className={`sec first evp ${doto.variable}`}>
      <div className="wrap">
        <div className="evp-bar mono">
          <Crumb />
          <span className="evp-rule" aria-hidden />
          <span className="mute">
            {EVENT_KIND_LABEL[event.kind].en} ·{" "}
            {formatShortDate(event.startsAt)} · SYD
          </span>
        </div>

        <header className="evp-hero">
          {/* Title and countdown side by side, so the first screen holds the
              whole hero. */}
          <div className="evp-hero-top">
            <PageHeadFx className="evp-name">
              <div className="need">
                <span className="tag fill">
                  <T {...EVENT_KIND_LABEL[event.kind]} />
                </span>
                {page?.highlights.map((h) => (
                  <span key={h.en} className="tag">
                    <T {...h} />
                  </span>
                ))}
              </div>
              {/* The Chinese name in mono, then the English title lit like
                  the page titles. */}
              <p className="evn-zh mono">
                <span className="mute">{"//"}</span> {event.title}
              </p>
              <LitTitle title={page?.display ?? [event.title]} />
            </PageHeadFx>
            {phase !== "past" && <Countdown to={event.startsAt} />}
          </div>
          {page ? (
            <div className="evp-hero-grid">
              <div className="evp-take">
                <p className="mono mute">
                  <T
                    zh={`${formatTime(event.endsAt)} 离场时，你会有`}
                    en={`By ${formatTime(event.endsAt)} you'll have`}
                  />
                </p>
                <AddressBar handles={page.handles} />
              </div>
              <ul className="evp-points">
                {page.points.map((pt) => {
                  const Glyph = ICONS[pt.icon];
                  return (
                    <li key={pt.title.en}>
                      <Glyph weight="light" size={22} aria-hidden />
                      <b>
                        <T {...pt.title} />
                      </b>
                      <span className="mute">
                        <T {...pt.sub} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="evp-lede">{event.summary}</p>
          )}
          <div className="evp-hero-foot">
            <div className="d-cta">
              {phase === "open" && (
                <a href="#signup" className="btn solid primary">
                  {full ? (
                    <T zh="报名候补" en="Join the waitlist" />
                  ) : (
                    <T zh="立即报名" en="Sign up" />
                  )}{" "}
                  <Arr />
                </a>
              )}
              {phase !== "past" && (
                <a href={calendarUrl} className="btn ghost">
                  <T zh="加入日历" en="Add to calendar" /> <Arr />
                </a>
              )}
            </div>
            {page && (
              <p className="mono mute evp-hosts">
                <T {...page.hosts} />
              </p>
            )}
          </div>
        </header>

        <dl className="evp-kv">
          <div>
            <dt className="mono mute">
              [01] <T zh="日期" en="Date" />
            </dt>
            <dd>{formatDate(event.startsAt)}</dd>
          </div>
          <div>
            <dt className="mono mute">
              [02] <T zh="时间" en="Time" />
            </dt>
            <dd>{formatTimeRange(event.startsAt, event.endsAt)}</dd>
          </div>
          <div>
            <dt className="mono mute">
              [03] <T zh="地点" en="Venue" />
            </dt>
            <dd>{event.location}</dd>
          </div>
          <div>
            <dt className="mono mute">
              [04] <T zh="名额" en="Seats" />
            </dt>
            <dd>
              {event.capacity ?? <T zh="不限" en="Open" />}
              {groups.length > 0 && (
                <small className="mono mute">
                  {groups.map(([g, n], i) => (
                    <span key={g}>
                      {i > 0 && " · "}
                      <T {...SEAT_GROUP_LABEL[g]} /> {n}
                    </span>
                  ))}
                </small>
              )}
            </dd>
          </div>
        </dl>

        {page && <Bring page={page} />}

        <div className="evp-block" id="signup">
          <Head
            n="01"
            eyebrow={{ zh: "报名", en: "Sign up" }}
            title={
              phase === "open"
                ? full
                  ? "Waitlist open."
                  : "Save a seat."
                : phase === "closed"
                  ? "Sign-up closed."
                  : phase === "past"
                    ? "That's a wrap."
                    : "See you there."
            }
          />
          {phase === "open" && event.registrationClosesAt && (
            <div className="evp-sign">
              <SeatStatus event={event} signups={signups} />
              <SignupForm
                slug={event.slug}
                capacity={event.capacity}
                seatQuotas={event.seatQuotas}
                signups={signups}
                asksGithub={page?.asksGithub ?? false}
              />
            </div>
          )}
          {phase === "closed" && (
            <p className="empty">
              <T
                zh="报名的同学请留意微信群里的确认消息。没报上也没关系，下一场活动会在这里和群里第一时间公布。"
                en="If you signed up, watch the group chat for your confirmation. Missed it? The next event is announced here and in the group first."
              />
            </p>
          )}
          {phase === "past" && (
            <p className="empty">
              <T
                zh="讲义、示例和成果墙会在 48 小时内放到资源页。"
                en="Slides, examples and the results wall go up on Resources within 48 hours."
              />{" "}
              <Link href="/learn" className="text-link">
                <T zh="去资源页" en="Resources" /> <Arr />
              </Link>
            </p>
          )}
          {phase === "external" && event.signupUrl && (
            <a
              href={event.signupUrl}
              target="_blank"
              rel="noreferrer"
              className="btn solid primary"
              style={{ alignSelf: "start" }}
            >
              <T zh="去报名" en="Sign up" /> <Arr diag />
            </a>
          )}
          <div>
            <SampleNotice />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Live seat count per group, the deadline and what happens after signing up. */
function SeatStatus({
  event,
  signups,
}: {
  event: SiteEvent;
  signups: EventSignups;
}) {
  const cap = event.capacity;
  const left = cap === null ? null : Math.max(cap - signups.confirmed, 0);
  const groups = seatGroups(event);
  const closes = event.registrationClosesAt!;
  return (
    <aside className="evp-status hud">
      <span className="c tl" aria-hidden />
      <span className="c tr" aria-hidden />
      <span className="c bl" aria-hidden />
      <span className="c br" aria-hidden />
      <p className="mono mute evp-status-head">
        <span className="evp-live" aria-hidden />
        <T zh="实时名额" en="Live seats" />
      </p>
      <div className="evp-count">
        <b>{signups.confirmed}</b>
        {cap !== null && <span className="mute">/ {cap}</span>}
      </div>
      {groups.length > 0
        ? groups.map(([g, n]) => (
            <div key={g} className="evp-group">
              <span className="mono">
                <T {...SEAT_GROUP_LABEL[g]} />
                <span className="mute">
                  {signups.byGroup[g] ?? 0} / {n}
                </span>
              </span>
              <SeatGrid seats={n} taken={signups.byGroup[g] ?? 0} />
            </div>
          ))
        : cap !== null && <SeatGrid seats={cap} taken={signups.confirmed} />}
      <p className="mono mute evp-left">
        {left === null ? null : left > 0 ? (
          <T zh={`还剩 ${left} 个名额`} en={`${left} seats left`} />
        ) : (
          <T zh="名额已满" en="Full" />
        )}
        {signups.waitlist > 0 && (
          <T
            zh={` · 候补 ${signups.waitlist} 人`}
            en={` · ${signups.waitlist} waitlisted`}
          />
        )}
        <br />
        <T
          zh={`截止 ${formatDate(closes)} ${formatTime(closes)}`}
          en={`Closes ${formatDate(closes)} ${formatTime(closes)}`}
        />
      </p>
      <ol className="evp-next">
        <li>
          <span className="mono">01</span>
          <T zh="30 秒填完表" en="Fill in the form (30 s)" />
        </li>
        <li>
          <span className="mono">02</span>
          <T zh="截止后拉你进微信群" en="We add you to the WeChat group" />
        </li>
        <li>
          <span className="mono">03</span>
          <T zh="带电脑来，现场签到" en="Bring a laptop and check in" />
        </li>
      </ol>
    </aside>
  );
}

/** One cell per seat, 15 to a row so every group's cells line up. */
function SeatGrid({ seats, taken }: { seats: number; taken: number }) {
  return (
    <div className="evp-grid" role="img" aria-label={`${taken} / ${seats}`}>
      {Array.from({ length: seats }, (_, i) => (
        <i
          key={i}
          className={i < taken ? "on" : undefined}
          style={{ "--i": i } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function Head({
  n,
  eyebrow,
  title,
}: {
  n: string;
  eyebrow: { zh: string; en: string };
  /** Short English, the same in both languages, like the page titles. */
  title: string;
}) {
  return (
    <div className="evp-head">
      <p className="mono evp-idx">
        <span>[{n}]</span> <T {...eyebrow} />
        <span className="evp-rule" aria-hidden />
      </p>
      <h2 className="evp-h2">{title}</h2>
    </div>
  );
}

/** What to bring, in a strip under the readouts. */
function Bring({ page }: { page: EventPage }) {
  return (
    <div className="evp-bring">
      <span className="mono mute">
        <T zh="带上 / Bring" en="Bring" />
      </span>
      <ul>
        {page.bring.map((b) => {
          const Glyph = ICONS[b.icon];
          return (
            <li key={b.label.en}>
              <Glyph weight="light" size={18} aria-hidden />
              <T {...b.label} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
