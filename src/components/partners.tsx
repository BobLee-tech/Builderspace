import type { CSSProperties } from "react";
import {
  Buildings,
  EnvelopeSimple,
  Handshake,
  Key,
  Microphone,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { Arr } from "@/components/fx/arr";
import { T } from "@/components/t";
import { getEvents } from "@/lib/data";
import { eventCopy } from "@/lib/event-pages";
import { cameCount } from "@/lib/event-results";
import {
  eventPartners,
  homePartners,
  introShown,
  PARTNER_EMAIL,
  ROLE_LABEL,
  type Partner,
} from "@/lib/partners";
import { CopyText } from "./copy-text";
import { PartnerIntros, type PartnerView } from "./partner-intro";
import "@/app/partners.css";

const MAILTO = `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent("Partnering with BuilderSpace")}`;

const WAYS = [
  {
    icon: Buildings,
    title: { zh: "场地", en: "Venue" },
    sub: {
      zh: "一晚的房间、网络和插座",
      en: "A room, Wi-Fi and power for a night",
    },
  },
  {
    icon: Key,
    title: { zh: "工具额度", en: "Tool credits" },
    sub: {
      zh: "给成员个人的 AI 与云服务兑换码",
      en: "Personal AI and cloud codes for members",
    },
  },
  {
    icon: Microphone,
    title: { zh: "嘉宾与导师", en: "Speakers & mentors" },
    sub: {
      zh: "来讲一次真实的做产品经验",
      en: "One real story of shipping a product",
    },
  },
  {
    icon: Handshake,
    title: { zh: "联合主办", en: "Co-host" },
    sub: { zh: "和你的社团一起办一场", en: "Run one with your society" },
  },
];

/**
 * What the intro needs for each of `list` that has one to show: its events
 * from the events table (title, date, seats) and event results (head-count).
 */
async function introViews(list: Partner[]): Promise<PartnerView[]> {
  const withIntro = list.filter(introShown);
  if (!withIntro.length) return [];
  const events = await getEvents();
  return withIntro.map((p) => ({
    slug: p.slug,
    name: p.name,
    logo: p.logo,
    tint: p.tint,
    role: ROLE_LABEL[p.role],
    since: p.since,
    url: p.url,
    intro: p.intro!,
    draft: !p.intro!.confirmed,
    events: events
      .filter((e) => p.events.includes(e.slug))
      .map((e) => ({
        slug: e.slug,
        title: eventCopy(e).title,
        startsAt: e.startsAt,
        came: cameCount(e.slug),
        seats: e.capacity,
        did: p.intro!.did[e.slug] ?? null,
      })),
  }));
}

/**
 * Home: who backs the club (src/lib/partners.ts), after the plaza. With no
 * partners yet it's one invite card; either way it ends with how to help.
 */
export async function PartnersSection() {
  const list = homePartners();
  const intros = await introViews(list);
  const n = list.length;
  // Four across (two on phones); one open seat stretches over the rest of
  // the last row, and phones drop it when their row of two is full.
  const open = n ? (4 - (n % 4)) % 4 : 0;
  const nn = String(n).padStart(2, "0");
  return (
    <section className="sec" id="partners">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow mono">
              <T zh="合作伙伴" en="Partners" />
            </p>
            <h2 className="h2">
              <T
                zh={
                  <>
                    一起把 Build Night <span className="dim">办下去。</span>
                  </>
                }
                en={
                  <>
                    Keep Build Night{" "}
                    <span className="dim">going, together.</span>
                  </>
                }
              />
            </h2>
          </div>
          <div className="pt-side">
            <span className="mono mute tnum">
              {n ? (
                <T
                  zh={
                    <>
                      <b>{nn}</b> 位伙伴 · {list[0].since} 起
                    </>
                  }
                  en={
                    <>
                      <b>{nn}</b> partners · since {list[0].since}
                    </>
                  }
                />
              ) : (
                <T zh="第一个席位开放中" en="First seat open" />
              )}
            </span>
            <a href="#pt-contact" className="btn ghost">
              <T zh="成为合作方" en="Partner with us" />
              <Arr />
            </a>
          </div>
        </div>

        {n ? (
          <ul className="pt-wall">
            {list.map((p) => (
              <li key={p.name}>
                <PartnerTile partner={p} />
              </li>
            ))}
            {open > 0 && (
              <li
                className={n % 2 ? "pt-open" : "pt-open wide"}
                style={{ "--span": open } as CSSProperties}
              >
                <a href="#pt-contact" className="pt-tile open">
                  <svg className="pt-dash" aria-hidden>
                    <rect width="100%" height="100%" rx="16" />
                  </svg>
                  <span>
                    <span className="pt-plus" aria-hidden>
                      <Plus weight="light" size={18} />
                    </span>
                    <b>
                      <T zh="下一位合作方" en="Next partner" />
                    </b>
                    <span className="mono mute">
                      <T zh="你的 logo" en="Your logo here" />
                    </span>
                  </span>
                </a>
              </li>
            )}
          </ul>
        ) : (
          <Invite />
        )}
        {intros.length > 0 && <PartnerIntros partners={intros} />}

        <div className="pt-more" id="pt-contact">
          <ul className="pt-ways">
            {WAYS.map((w) => (
              <li key={w.title.en}>
                <w.icon weight="light" size={22} aria-hidden />
                <b>
                  <T {...w.title} />
                </b>
                <span className="mute">
                  <T {...w.sub} />
                </span>
              </li>
            ))}
          </ul>
          <div className="pt-row">
            <span className="mute">
              <T
                zh="任何一种，都是在帮成员把项目做上线。"
                en="Any one of these helps members ship."
              />
            </span>
            <span className="pt-mail mono">
              <EnvelopeSimple weight="light" size={16} aria-hidden />
              <a href={MAILTO}>{PARTNER_EMAIL}</a>
              <CopyText text={PARTNER_EMAIL} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function PartnerTile({ partner: p }: { partner: Partner }) {
  const body = (
    <>
      <span className="pt-logo">
        {/* eslint-disable-next-line @next/next/no-img-element -- the partner's own SVG */}
        <img src={p.logo} alt={p.name} />
      </span>
      <span className="pt-meta mono">
        <span className="pt-role">
          <T {...ROLE_LABEL[p.role]} />
        </span>
        <span className="mute tnum pt-since">{p.since}</span>
        {introShown(p) && (
          <span className="pt-go">
            <T zh="介绍 →" en="About →" />
          </span>
        )}
      </span>
    </>
  );
  const style = { "--tint": p.tint } as CSSProperties;
  if (introShown(p))
    return (
      <button
        type="button"
        className="pt-tile"
        style={style}
        data-partner={p.slug}
        aria-haspopup="dialog"
      >
        {body}
      </button>
    );
  return p.url ? (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="pt-tile"
      style={style}
    >
      {body}
    </a>
  ) : (
    <div className="pt-tile" style={style}>
      {body}
    </div>
  );
}

/** No partners yet: the first seat, with Kiko (the Connector). */
function Invite() {
  return (
    <div className="pt-invite">
      <div className="pt-invite-dark">
        <span className="mono mute">
          <T zh="合作席位 · 00" en="Partner seat · 00" />
        </span>
        <h3>
          <T
            zh={
              <>
                第一个合作席位，
                <br />
                留给你。
              </>
            }
            en={
              <>
                The first seat
                <br />
                is yours.
              </>
            }
          />
        </h3>
        <p className="mute">
          <T
            zh="场地、额度、嘉宾，任何一种都算。"
            en="A room, credits or a talk. Any one counts."
          />
          <br />
          <T
            zh="每一位支持过的伙伴，都会写在这里。"
            en="Everyone who helps gets credited here."
          />
        </p>
        <span className="pt-chips">
          {(["venue", "credits", "speaker", "cohost"] as const).map((r) => (
            <span key={r} className="tag dash">
              <T {...ROLE_LABEL[r]} />
            </span>
          ))}
        </span>
        <span>
          <a href={MAILTO} className="btn solid primary">
            <T zh="聊聊合作" en="Talk to us" />
            <Arr />
          </a>
        </span>
      </div>
      <div className="pt-invite-light" aria-hidden>
        <span className="pt-kiko">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG art */}
          <img src="/mascots/kiko.svg" alt="" />
        </span>
        <span className="pt-seat mono">
          Kiko · <T zh="协作者" en="Connector" />
        </span>
      </div>
    </div>
  );
}

/** Event page: one row of the partners who helped with this event. */
export async function EventSupport({ slug }: { slug: string }) {
  const list = eventPartners(slug);
  if (!list.length) return null;
  const intros = await introViews(list);
  return (
    <div className="evp-sec">
      <h2 className="evp-sec-h mono mute">
        <T zh="本场支持" en="Supported by" />
      </h2>
      <ul className="pt-support">
        {list.map((p) => (
          <li key={p.name}>
            {introShown(p) ? (
              <button
                type="button"
                className="pt-chip"
                data-partner={p.slug}
                aria-haspopup="dialog"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- the partner's own SVG */}
                <img src={p.logo} alt={p.name} />
              </button>
            ) : p.url ? (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="pt-chip"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- the partner's own SVG */}
                <img src={p.logo} alt={p.name} />
              </a>
            ) : (
              <span className="pt-chip">
                {/* eslint-disable-next-line @next/next/no-img-element -- the partner's own SVG */}
                <img src={p.logo} alt={p.name} />
              </span>
            )}
            <span className="mono mute">
              <T {...ROLE_LABEL[p.role]} />
            </span>
          </li>
        ))}
      </ul>
      {intros.length > 0 && <PartnerIntros partners={intros} />}
    </div>
  );
}
