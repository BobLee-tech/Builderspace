import Link from "next/link";
import { HeroMetal } from "@/components/hero-metal";
import { MascotStage } from "@/components/mascot-stage";
import { NAV_TRANSITION } from "@/components/nav-links";
import { PageTransition } from "@/components/page-transition";
import { ProjectCard } from "@/components/project-card";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { getProjects } from "@/lib/data";
import { ProjectPlaza } from "./projects/project-plaza";

// The whole page is three beats: who we are, the mascot, what members are building.
export default function Home() {
  return (
    <PageTransition>
      <section className="hero">
        <HeroMetal />
        <div className="wrap">
          <div className="hero-meta mono mute">
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
            <span className="line">
              <span>Bring an idea.</span>
            </span>
            <span className="line">
              <span className="outline">Leave with</span>
            </span>
            <span className="line">
              <span>something that works</span>
            </span>
          </h1>
          <div className="hero-sub">
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
              <Link
                transitionTypes={NAV_TRANSITION}
                href="/join"
                className="btn solid"
              >
                <T zh="加入 BuilderSpace" en="Join BuilderSpace" />{" "}
                <span className="arr">→</span>
              </Link>
              <a href="#plaza" className="btn ghost">
                <T zh="看项目广场" en="See projects" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="strip" aria-label="At a glance / 一眼看懂">
        <dl className="wrap" data-stagger>
          {FACTS.map((f) => (
            <div key={f.label.en} data-rv>
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
    </PageTransition>
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

async function PlazaSection() {
  const projects = await getProjects();
  const cards = Object.fromEntries(
    projects.map((p) => [p.slug, <ProjectCard key={p.slug} project={p} />]),
  );

  return (
    <section className="sec" id="plaza">
      <div className="wrap">
        <div className="sec-head" data-rv>
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
        <ProjectPlaza
          projects={projects.map(({ slug, status, neededRoles }) => ({
            slug,
            status,
            neededRoles,
          }))}
          cards={cards}
        />
      </div>
    </section>
  );
}
