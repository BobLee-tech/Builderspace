import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { PageHeadFx } from "@/components/fx/page-head-fx";
import { LitTitle } from "@/components/page-head";
import { T } from "@/components/t";
import { getEventDetail } from "@/lib/data";
import { getEventPage } from "@/lib/event-pages";
import { formatDate, formatTime, formatTimeRange } from "@/lib/format";
import { EVENT_KIND_LABEL, SEAT_GROUP_LABEL } from "@/lib/types";
import { AddressBar } from "./address-bar";
import { Countdown } from "./countdown";
import { doto } from "./doto";
import { EVENT_ICONS, eventIsFull, seatGroups } from "./event-parts";

/**
 * The next event as a ticket at the top of /events: the title, what you leave
 * with, a live countdown and seats, and the way in. The whole ticket opens the
 * event; the sign-up button goes straight to the form.
 */
export async function NextUp({ slug }: { slug: string }) {
  const detail = await getEventDetail(slug);
  if (!detail) return null;
  const { event, signups, phase } = detail;
  const page = getEventPage(event.slug);
  const href = `/events/${event.slug}`;
  const full = eventIsFull(event, signups);
  const groups = seatGroups(event);
  const cap = event.capacity;
  const left = cap === null ? null : Math.max(cap - signups.confirmed, 0);
  const closes = event.registrationClosesAt;

  return (
    <article className={`evn surf ${doto.variable}`}>
      <Link href={href} className="evn-hit" aria-label={event.title} />
      <header className="evn-top mono">
        <span className="evp-live" aria-hidden />
        <T zh="下一场" en="Next up" />
        <span className="evn-rule" aria-hidden />
        <span className="evn-when">
          <T {...EVENT_KIND_LABEL[event.kind]} /> · {formatDate(event.startsAt)}{" "}
          · {formatTimeRange(event.startsAt, event.endsAt)} · {event.location}
        </span>
      </header>

      <div className="evn-body">
        <PageHeadFx className="evn-main">
          <p className="evn-zh mono">
            <span className="mute">{"//"}</span> {event.title}
          </p>
          <LitTitle
            as="h2"
            className="page-title evn-title"
            title={page?.display ?? [event.title]}
          />
          {page && (
            <>
              <div className="evp-take">
                <p className="mono mute">
                  <T
                    zh={`${formatTime(event.endsAt)} 离场时，你会有`}
                    en={`By ${formatTime(event.endsAt)} you'll have`}
                  />
                </p>
                <AddressBar handles={page.handles} />
              </div>
              <ul className="evn-points mono">
                {page.points.map((pt) => {
                  const Glyph = EVENT_ICONS[pt.icon];
                  return (
                    <li key={pt.title.en}>
                      <Glyph weight="light" size={15} aria-hidden />
                      <T {...pt.title} />
                    </li>
                  );
                })}
                {page.highlights.map((h) => (
                  <li key={h.en}>
                    <T {...h} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </PageHeadFx>

        <aside className="evn-side">
          {phase !== "past" && <Countdown to={event.startsAt} />}
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
                  className="evn-grid"
                  role="img"
                  aria-label={`${signups.confirmed} / ${cap}`}
                >
                  {Array.from({ length: cap }, (_, i) => (
                    <i
                      key={i}
                      className={i < signups.confirmed ? "on" : undefined}
                      style={{ "--i": i } as React.CSSProperties}
                    />
                  ))}
                </div>
              )}
              <p className="evn-note mono mute">
                {groups.map(([g, n]) => (
                  <span key={g}>
                    <T {...SEAT_GROUP_LABEL[g]} /> {signups.byGroup[g] ?? 0}/{n}{" "}
                    ·{" "}
                  </span>
                ))}
                {phase === "open" ? (
                  <T
                    zh={`${left === null ? "" : `剩 ${left} · `}截止 ${formatDate(closes)} ${formatTime(closes)}`}
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
            <Link href={href} className="btn ghost">
              <T zh="看详情" en="Details" /> <Arr />
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
