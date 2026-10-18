import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Arr } from "@/components/fx/arr";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { getEventDetail } from "@/lib/data";
import { getEventPage, type EventPage } from "@/lib/event-pages";
import { formatDate, formatTime, formatTimeRange } from "@/lib/format";
import { siteUrl } from "@/lib/site-url";
import {
  EVENT_KIND_LABEL,
  SEAT_GROUPS,
  SEAT_GROUP_LABEL,
  type EventSignups,
  type SiteEvent,
} from "@/lib/types";
import { SignupForm } from "./signup-form";
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
    description: page?.lede.zh ?? event.summary ?? undefined,
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

/** Same steps as the project page: CJK counts 1, Latin about 3/4. */
function titleSize(name: string) {
  const units = [...name].reduce(
    (n, ch) => n + (/[⺀-￿]/.test(ch) ? 1 : 0.75),
    0,
  );
  return units <= 5 ? "xl" : units <= 9 ? "lg" : units <= 16 ? "md" : "sm";
}

async function EventDetail({ slug }: { slug: string }) {
  const detail = await getEventDetail(slug);
  if (!detail) notFound();
  const { event, signups, phase } = detail;
  const page = getEventPage(event.slug);
  // Full once every group that's open has no seat left.
  const full =
    (event.capacity !== null && signups.confirmed >= event.capacity) ||
    (event.seatQuotas !== null &&
      Object.entries(event.seatQuotas).every(
        ([g, n]) =>
          (signups.byGroup[g as keyof typeof signups.byGroup] ?? 0) >= n,
      ));
  // "3 小时，把自己放上网" → two lines, sized by the longer one.
  const lines = event.title.split(/(?<=，)/);
  const calendarUrl = `${siteUrl.replace(/^https?:/, "webcal:")}/events.ics`;

  return (
    <section className="sec first d-page evp">
      <div className="wrap">
        <div className="d-top">
          <Crumb />
          <span className="mono mute">
            #{event.slug} · {formatDate(event.startsAt)}
          </span>
        </div>

        <header className="evp-hero">
          <div className="d-hero-l">
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
            <h1
              className="d-title"
              data-size={titleSize(
                lines.reduce((a, b) => (a.length > b.length ? a : b)),
              )}
            >
              {lines.map((l) => (
                <span key={l} className="ln">
                  {l}
                </span>
              ))}
            </h1>
            <p className="d-lede">
              {page ? <T {...page.lede} /> : event.summary}
            </p>
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
          <Ticket event={event} signups={signups} phase={phase} />
        </header>

        {page && <Intro page={page} />}

        <div className="evp-block" id="signup">
          <Head
            n={page ? "02" : "01"}
            eyebrow={{ zh: "报名", en: "Sign up" }}
            title={
              phase === "open"
                ? full
                  ? {
                      zh: "名额已满，可以报候补",
                      en: "Full: join the waitlist",
                    }
                  : { zh: "留个位置给你", en: "Save yourself a seat" }
                : phase === "closed"
                  ? { zh: "报名已截止", en: "Sign-up has closed" }
                  : phase === "past"
                    ? { zh: "这场已经结束了", en: "This one's over" }
                    : { zh: "现场见", en: "See you there" }
            }
          />
          {phase === "open" && event.registrationClosesAt && (
            <>
              <p className="lede">
                <T
                  zh={`30 秒填完，${formatDate(event.registrationClosesAt)} ${formatTime(event.registrationClosesAt)} 截止。截止后我们用微信拉你进参与者群。`}
                  en={`Takes 30 seconds; closes ${formatDate(event.registrationClosesAt)} at ${formatTime(event.registrationClosesAt)}. After that we add you to the group chat on WeChat.`}
                />
              </p>
              <SignupForm
                slug={event.slug}
                capacity={event.capacity}
                seatQuotas={event.seatQuotas}
                signups={signups}
                asksGithub={page?.asksGithub ?? false}
              />
            </>
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

/** Date block, live seat count and the sign-up deadline. */
function Ticket({
  event,
  signups,
  phase,
}: {
  event: SiteEvent;
  signups: EventSignups;
  phase: Phase;
}) {
  const cap = event.capacity;
  const left = cap === null ? null : Math.max(cap - signups.confirmed, 0);
  const groups = SEAT_GROUPS.flatMap((g) => {
    const n = event.seatQuotas?.[g];
    return n === undefined ? [] : [[g, n] as const];
  });
  return (
    <aside className="evp-ticket hud">
      <span className="c tl" aria-hidden />
      <span className="c tr" aria-hidden />
      <span className="c bl" aria-hidden />
      <span className="c br" aria-hidden />
      <div className="evp-date">
        <b>{formatDate(event.startsAt).replace(/周./, "")}</b>
        <span className="mono">
          {formatDate(event.startsAt).match(/周./)?.[0]} ·{" "}
          {formatTimeRange(event.startsAt, event.endsAt)}
        </span>
        <span className="mute">{event.location}</span>
      </div>
      {event.registrationClosesAt && (
        <div className="evp-seats">
          <div className="evp-count">
            <b>{signups.confirmed}</b>
            {cap !== null && <span className="mute">/ {cap}</span>}
            <span className="mono mute">
              <T zh="已报名" en="signed up" />
            </span>
          </div>
          {groups.length > 0
            ? groups.map(([g, n]) => (
                <div key={g} className="evp-group">
                  <span className="mono">
                    <T {...SEAT_GROUP_LABEL[g]} />
                    <span className="mute">
                      {" "}
                      {signups.byGroup[g] ?? 0} / {n}
                    </span>
                  </span>
                  <SeatGrid seats={n} taken={signups.byGroup[g] ?? 0} />
                </div>
              ))
            : cap !== null && (
                <SeatGrid seats={cap} taken={signups.confirmed} />
              )}
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
            {phase === "open" && (
              <>
                <br />
                <T
                  zh={`报名截止 ${formatDate(event.registrationClosesAt)} ${formatTime(event.registrationClosesAt)}`}
                  en={`Closes ${formatDate(event.registrationClosesAt)} ${formatTime(event.registrationClosesAt)}`}
                />
              </>
            )}
          </p>
        </div>
      )}
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

type Phase = "open" | "closed" | "past" | "external";

function Head({
  n,
  eyebrow,
  title,
}: {
  n: string;
  eyebrow: { zh: string; en: string };
  title: { zh: string; en: string };
}) {
  return (
    <div className="evp-head">
      <p className="eyebrow mono">
        {n} · <T {...eyebrow} />
      </p>
      <h2 className="h2">
        <T {...title} />
      </h2>
    </div>
  );
}

/** What happens, in four steps, and what to bring. */
function Intro({ page }: { page: EventPage }) {
  return (
    <div className="evp-block">
      <Head
        n="01"
        eyebrow={{ zh: "这场做什么", en: "What happens" }}
        title={{ zh: "聊 → 学 → 做 → 秀", en: "Talk → Learn → Make → Show" }}
      />
      <ol className="evp-acts">
        {page.steps.map((step) => (
          <li key={step.at}>
            <span className="mono mute">{step.at}</span>
            <b className="evp-act-glyph">
              <T {...step.name} />
            </b>
            <p className="mute">
              <T {...step.body} />
            </p>
          </li>
        ))}
      </ol>
      <div className="evp-bring">
        <span className="mono mute">
          <T zh="带上" en="Bring" />
        </span>
        <ul>
          {page.bring.map((b) => (
            <li key={b.en}>
              <T {...b} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
