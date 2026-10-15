import {
  UsersThree,
  Translate,
  Coin,
  GitBranch,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { TickerFx } from "@/components/fx/scroll-fx";
import { HeroHeadline } from "@/components/hero-headline";
import { MapPin } from "@phosphor-icons/react/dist/ssr";
import { HeroMetal } from "@/components/hero-metal";
import { MascotStage } from "@/components/mascot-stage";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { CYCLE } from "@/lib/cycle";
import { getProjects } from "@/lib/data";
import { Plaza } from "./projects/plaza";

// The whole page is three beats: who we are, what members are building, the mascot.
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
              <p className="hero-zh">
                <T
                  zh={
                    <>
                      带着想法来，<b>两小时</b>做出第一个能用的页面。
                    </>
                  }
                  en={
                    <>
                      Bring an idea. Ship your <b>first working page</b> in two
                      hours.
                    </>
                  }
                />
              </p>
              <p className="hero-note mute">
                <T
                  zh="从 UNSW 起步的中英双语创客社：找队友，每周一起把项目做上线。"
                  en="A bilingual builders club that started at UNSW. Find teammates and ship together, every week."
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

      <section className="strip" aria-label="At a glance / 一眼看懂">
        <dl className="wrap">
          {FACTS.map((f) => (
            <div key={f.label.en}>
              <dt className="mono mute">
                <f.icon weight="light" size={15} aria-hidden />
                <b>{String(FACTS.indexOf(f) + 1).padStart(2, "0")}</b>
                <T {...f.label} />
              </dt>
              <dd>
                <T {...f.value} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <PlazaSection />

      <MascotStage />
    </>
  );
}

const FACTS = [
  {
    icon: UsersThree,
    label: { zh: "谁可以来", en: "Who" },
    value: {
      zh: "所有 UNSW 学生 · 零基础也行",
      en: "Any UNSW student · beginners welcome",
    },
  },
  {
    icon: Translate,
    label: { zh: "工作语言", en: "Languages" },
    value: { zh: "English + 中文", en: "English + 中文" },
  },
  {
    icon: Coin,
    label: { zh: "费用", en: "Cost" },
    value: { zh: "免费", en: "Free" },
  },
  {
    icon: GitBranch,
    label: { zh: "作品归属", en: "Your work" },
    value: { zh: "归你和队友", en: "Stays yours" },
  },
];

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
  "每周 Build Night",
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
