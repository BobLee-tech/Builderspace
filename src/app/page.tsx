import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { TickerFx } from "@/components/fx/scroll-fx";
import { Scramble } from "@/components/fx/text-fx";
import { HeroMetal } from "@/components/hero-metal";
import { MascotStage } from "@/components/mascot-stage";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { getProjects } from "@/lib/data";
import { Plaza } from "./projects/plaza";

// The whole page is three beats: who we are, the mascot, what members are building.
export default function Home() {
  return (
    <>
      <section className="hero">
        <HeroMetal />
        <div className="wrap">
          <div className="hero-meta mono mute stagger">
            <span className="live">
              <T zh="Cycle 01 组队报名中" en="Cycle 01 · teams forming" />
            </span>
            <span>Sydney · Kensington</span>
            <span>T3 2026</span>
          </div>
          <h1
            className="display"
            aria-label="Bring an idea. Leave with something that works."
          >
            <span className="line" aria-hidden>
              <span>
                <Scramble text="Bring an idea." />
              </span>
            </span>
            <span className="line" aria-hidden>
              <span className="outline">Leave with</span>
            </span>
            <span className="line" aria-hidden>
              <span>
                <span className="chrome">something that </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  <span className="chrome">works</span>
                  <span className="cursor" />
                </span>
              </span>
            </span>
          </h1>
          <div className="hero-sub stagger">
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
              <Link href="/join" className="btn solid">
                <T zh="加入 BuilderSpace" en="Join BuilderSpace" /> <Arr />
              </Link>
              <a href="#plaza" className="btn ghost">
                <T zh="看项目广场" en="See projects" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <Ticker />

      <section className="strip" aria-label="At a glance / 一眼看懂">
        <dl className="wrap">
          {FACTS.map((f) => (
            <div key={f.label.en}>
              <dt className="mono mute">
                <T {...f.label} />
              </dt>
              <dd>
                <T {...f.value} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <MascotStage />

      <PlazaSection />
    </>
  );
}

const FACTS = [
  {
    label: { zh: "谁可以来", en: "Who" },
    value: {
      zh: "所有 UNSW 学生 · 零基础也行",
      en: "Any UNSW student · beginners welcome",
    },
  },
  {
    label: { zh: "工作语言", en: "Languages" },
    value: { zh: "English + 中文", en: "English + 中文" },
  },
  {
    label: { zh: "费用", en: "Cost" },
    value: { zh: "免费", en: "Free" },
  },
  {
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
