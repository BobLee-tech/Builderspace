import {
  CalendarBlank,
  MapPin,
  Sparkle,
  Ticket,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { T } from "@/components/t";
import { getEventDetail } from "@/lib/data";
import { getEventPage } from "@/lib/event-pages";
import { formatDate, formatTime, formatTimeRange } from "@/lib/format";
import { EVENT_KIND_LABEL } from "@/lib/types";
import { TimeLeft } from "./countdown";
import { doto } from "./doto";
import { eventIsFull } from "./event-parts";

/**
 * The next event as a ticket at the top of /events: what it is in one line,
 * when, where and what it costs, then seats and one way in. The whole ticket
 * opens the event; the sign-up button goes straight to the form.
 */
export async function NextUp({ slug }: { slug: string }) {
  const detail = await getEventDetail(slug);
  if (!detail) return null;
  const { event, signups, phase } = detail;
  const page = getEventPage(event.slug);
  const href = `/events/${event.slug}`;
  const full = eventIsFull(event, signups);
  const cap = event.capacity;
  const left = cap === null ? null : Math.max(cap - signups.confirmed, 0);
  const closes = event.registrationClosesAt;

  return (
    <article className={`evn surf ${doto.variable}`}>
      <Link href={href} className="evn-hit" aria-label={event.title} />
      <div className="evn-body">
        <div className="evn-main">
          <p className="evn-top mono">
            <span className="evp-live" aria-hidden />
            <T zh="下一场" en="Next up" /> ·{" "}
            <T {...EVENT_KIND_LABEL[event.kind]} />
          </p>
          <h2 className="evn-title">
            {event.title}
            {page && <small className="mono mute">{page.display}</small>}
          </h2>
          {event.summary && <p className="evn-what">{event.summary}</p>}
          <ul className="evn-facts">
            <li>
              <CalendarBlank weight="light" size={16} aria-hidden />
              {formatDate(event.startsAt)} ·{" "}
              {formatTimeRange(event.startsAt, event.endsAt)}
            </li>
            <li>
              <MapPin weight="light" size={16} aria-hidden />
              {event.location}
            </li>
            {page && (
              <li>
                <Ticket weight="light" size={16} aria-hidden />
                <T {...page.cost} />
              </li>
            )}
            {page?.highlights.map((h) => (
              <li key={h.en}>
                <Sparkle weight="light" size={16} aria-hidden />
                <T {...h} />
              </li>
            ))}
          </ul>
        </div>

        <aside className="evn-side">
          {phase !== "past" && <TimeLeft to={event.startsAt} />}
          {closes && (
            <div className="evn-seats">
              <p className="evn-seats-head mono mute">
                <T zh="已报名" en="Signed up" />
                <span className="evn-count">
                  <b>{signups.confirmed}</b>
                  {cap !== null && <span>/ {cap}</span>}
                </span>
              </p>
              {cap !== null && (
                <div
                  className="evp-meter"
                  role="img"
                  aria-label={`${signups.confirmed} / ${cap}`}
                >
                  <i
                    style={{
                      width: `${Math.min(signups.confirmed / cap, 1) * 100}%`,
                    }}
                  />
                </div>
              )}
              <p className="evn-note mono mute">
                {phase === "open" ? (
                  <T
                    zh={`${left === null ? "" : `剩 ${left} 个 · `}${formatDate(closes)} ${formatTime(closes)} 截止`}
                    en={`${left === null ? "" : `${left} left · `}closes ${formatDate(closes)} ${formatTime(closes)}`}
                  />
                ) : (
                  <T zh="报名已截止" en="Sign-up has closed" />
                )}
              </p>
            </div>
          )}
          <div className="evn-cta">
            {phase === "open" && (
              <Link href={`${href}#signup`} className="btn solid primary">
                {full ? (
                  <T zh="报名候补" en="Join the waitlist" />
                ) : (
                  <T zh="立即报名" en="Sign up" />
                )}{" "}
                <Arr />
              </Link>
            )}
            <Link href={href} className="evn-more">
              <T zh="看活动详情" en="Event details" /> →
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
