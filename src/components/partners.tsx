import type { CSSProperties } from "react";
import {
  Buildings,
  Handshake,
  Key,
  Microphone,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { Arr } from "@/components/fx/arr";
import { T } from "@/components/t";
import { getEvents, getMemberCount } from "@/lib/data";
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
import { MEMBERS_NEAR, roughly } from "@/lib/team";
import { PartnerEmail } from "./partner-email";
import { PartnerIntros, type PartnerView } from "./partner-intro";
import { PartnerSeat, type SeatStat } from "./partner-seat";
import { PartnerTileLight } from "./partner-tile-light";
import "@/app/partners.css";

const MAILTO = `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent("Partnering with BuilderSpace")}`;

const WAYS = [
  {
    icon: Buildings,
    way: "venue",
    title: { zh: "场地", en: "Venue" },
    sub: {
      zh: "一晚的房间、网络和插座",
      en: "A room, Wi-Fi and power for a night",
    },
  },
  {
    icon: Key,
    way: "credits",
    title: { zh: "工具额度", en: "Tool credits" },
    sub: {
      zh: "给成员个人的 AI 与云服务兑换码",
      en: "Personal AI and cloud codes for members",
    },
  },
  {
    icon: Microphone,
    way: "speaker",
    title: { zh: "嘉宾与导师", en: "Speakers & mentors" },
    sub: {
      zh: "来讲一次真实的做产品经验",
      en: "One real story of shipping a product",
    },
  },
  {
    icon: Handshake,
    way: "cohost",
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
 * The two facts on the partner seat card: how many members, and that the club
 * is Arc-affiliated, worded as in the footer.
 */
async function seatProof(): Promise<SeatStat[]> {
  const members = await getMemberCount();
  return [
    {
      // Worded as on /people: the club counts more than the site's sign-ups.
      ...(members !== null && members >= MEMBERS_NEAR
        ? { value: roughly(members) }
        : {
            pre: { zh: "近", en: "Nearly" },
            value: String(MEMBERS_NEAR),
          }),
      label: { zh: "成员", en: "Members" },
    },
    {
      value: "UNSW Arc",
      label: { zh: "正式社团", en: "Affiliated club" },
    },
  ];
}

/**
 * Home: who backs the club (src/lib/partners.ts), after the plaza. With no
 * partners yet it's one invite card; either way it ends with how to help.
 */
export async function PartnersSection() {
  const list = homePartners();
  const [intros, proof] = await Promise.all([introViews(list), seatProof()]);
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
            <a href="#pt-contact" className="btn ghost" data-seat>
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
                <a
                  href="#pt-contact"
                  className="pt-tile open"
                  data-seat
                  aria-haspopup="dialog"
                >
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
        {n > 0 && <PartnerTileLight />}
        {intros.length > 0 && <PartnerIntros partners={intros} />}
        <PartnerSeat seat={String(n + 1).padStart(2, "0")} stats={proof} />

        <div className="pt-more" id="pt-contact">
          <ul className="pt-ways">
            {WAYS.map((w) => (
              <li key={w.way}>
                <button
                  type="button"
                  className="pt-way"
                  data-seat
                  data-way={w.way}
                  aria-haspopup="dialog"
                >
                  <w.icon weight="light" size={22} aria-hidden />
                  <b>
                    <T {...w.title} />
                  </b>
                  <span className="mute">
                    <T {...w.sub} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <PartnerEmail email={PARTNER_EMAIL} href={MAILTO} />
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
          <a href={MAILTO} className="btn solid primary" data-seat>
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
