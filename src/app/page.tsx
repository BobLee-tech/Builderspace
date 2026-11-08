import {
  ArrowRight,
  CalendarBlank,
  Cube,
  SignIn,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { TickerFx } from "@/components/fx/scroll-fx";
import { HeroHeadline } from "@/components/hero-headline";
import { MapPin } from "@phosphor-icons/react/dist/ssr";
import { HeroMetal } from "@/components/hero-metal";
import { MascotStage } from "@/components/mascot-stage";
import { PartnersSection } from "@/components/partners";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { CYCLE } from "@/lib/cycle";
import { getEventSchedule, getMemberCount, getProjects } from "@/lib/data";
import { eventCopy } from "@/lib/event-pages";
import { formatShortDate } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import { memberCount } from "@/lib/team";
import { Plaza } from "./projects/plaza";

export const metadata: Metadata = pageMeta("/");

// The whole page is four beats: who we are, what members are building, who
// backs it, the mascot.
export default function Home() {
  return (
    <>
      <section className="hero hero-poster">
        <HeroMetal />
        <div className="headline-hud" aria-hidden>
          <i className="hud-x" />
          <i className="hud-y" />
          <span className="hud-c mono tnum">X 0000 · Y 0000</span>
        </div>
        <div className="wrap">
          <HeroHeadline
            meta={
              <>
                <span className="live">
                  <T {...CYCLE.status} />
                </span>
                <span className="mute">
                  <MapPin weight="light" size={14} aria-hidden />
                  Sydney · Kensington
                </span>
                <span className="mute">T3 2026</span>
              </>
            }
          >
            <div>
              <p className="hero-note mute">
                <T
                  zh="从 UNSW 起步的中英双语创客社：找队友，一起把项目做上线。"
                  en="A bilingual builders club that started at UNSW. Find teammates and ship your project together."
                />
              </p>
            </div>
            <div className="hero-cta">
              <Link href="/join" className="btn solid primary">
                <T zh="加入 BuilderSpace" en="Join BuilderSpace" />
                <Arr />
              </Link>
              <a href="#plaza" className="btn ghost">
                <T zh="看项目广场" en="See projects" />
              </a>
            </div>
          </HeroHeadline>
        </div>
      </section>

      <Ticker />

      <Strip />

      <PlazaSection />

      <PartnersSection />

      <MascotStage />
    </>
  );
}

const TICKER_BIG = [
  "Build Night",
  "Demo Night",
  "Vibe Coding",
  "Ship it",
  "Pair up",
  "Read every line",
];
const TICKER_SMALL = [
  "Vibe Coding 入门",
  "线下 Build Night",
  "用中文提问，用英文展示",
  "需求拆解 → 代码审阅 → 测试 → 部署",
  "跨专业组队",
  "4–6 周一个 Build Cycle",
];

/** Two marquee rows; each list is doubled so the loop is seamless. */
function Ticker() {
  return (
    <div className="ticker" aria-hidden>
      <TickerFx>
        <div>
          <div className="ticker-track big">
            {Array.from({ length: 4 }, () => TICKER_BIG)
              .flat()
              .map((t, i) => (
                <span key={i}>{t}</span>
              ))}
          </div>
        </div>
        <div className="mono">
          <div className="ticker-track rev">
            {Array.from({ length: 4 }, () => TICKER_SMALL)
              .flat()
              .map((t, i) => (
                <span key={i}>{t}</span>
              ))}
          </div>
        </div>
      </TickerFx>
    </div>
  );
}

/** Under the hero: the next thing to do here, each cell a way in. */
async function Strip() {
  const [{ upcoming }, members, projects] = await Promise.all([
    getEventSchedule(),
    getMemberCount(),
    getProjects(),
  ]);
  const next = upcoming.find((e) => !e.dateTbc);
  const when = next && formatShortDate(next.startsAt);
  const title = next && eventCopy(next).title;
  const cells = [
    {
      icon: CalendarBlank,
      href: next ? `/events/${next.slug}` : "/events",
      label: { zh: "下一场", en: "Next event" },
      value:
        when && title
          ? { zh: `${when} · ${title.zh}`, en: `${when} · ${title.en}` }
          : { zh: "即将公布", en: "Coming soon" },
    },
    {
      icon: UsersThree,
      href: "/people",
      label: { zh: "成员", en: "Members" },
      value: memberCount(members ?? 0),
    },
    {
      icon: Cube,
      href: "#plaza",
      label: { zh: "在做的项目", en: "Projects" },
      value: { zh: `${projects.length} 个`, en: String(projects.length) },
    },
    {
      icon: SignIn,
      href: "/join",
      label: { zh: "加入", en: "Join" },
      value: { zh: "免费 · 零基础也行", en: "Free · beginners welcome" },
    },
  ];
  return (
    <section className="strip" aria-label="At a glance / 一眼看懂">
      <dl className="wrap">
        {cells.map((c) => (
          <div key={c.label.en}>
            <dt className="mono mute">
              <c.icon weight="light" size={15} aria-hidden />
              <T {...c.label} />
            </dt>
            <dd>
              <Link href={c.href} className="strip-link">
                <span>
                  <T {...c.value} />
                </span>
                <ArrowRight weight="light" size={15} aria-hidden />
              </Link>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

async function PlazaSection() {
  const projects = await getProjects();
  return (
    <section className="sec" id="plaza">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow mono">
              <T zh="项目广场" en="Project plaza" />
            </p>
            <h2 className="h2">
              <T zh="正在做的东西。" en="Things being built." />
            </h2>
          </div>
          <SampleNotice />
        </div>
        <Plaza projects={projects} />
      </div>
    </section>
  );
}
