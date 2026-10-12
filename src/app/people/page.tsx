import type { Metadata } from "next";
import Link from "next/link";
import { NAV_TRANSITION } from "@/components/nav-links";
import { PageTransition } from "@/components/page-transition";
import { T } from "@/components/t";

export const metadata: Metadata = { title: "成员" };

// Public materials name roles, never people.
const TEAM = [
  {
    glyph: "→ OUT",
    title: { zh: "方向与对外", en: "Direction & outreach" },
    body: {
      zh: "社团方向、合作与对外联络。",
      en: "Where the club is going, partners and outreach.",
    },
  },
  {
    glyph: "</>",
    title: { zh: "开发与技术", en: "Engineering" },
    body: {
      zh: "官网、项目广场和技术支持。",
      en: "The website, the project plaza and technical help.",
    },
  },
  {
    glyph: "[OPS]",
    title: { zh: "运营与设计", en: "Community & design" },
    body: {
      zh: "社群、活动、设计与宣传。",
      en: "Community, events, design and promotion.",
    },
  },
];

export default function PeoplePage() {
  return (
    <PageTransition>
      <section className="sec first">
        <div className="wrap">
          <p className="eyebrow mono">
            <T zh="成员 / People" en="People" />
          </p>
          <h1 className="display page-title">
            <span className="line">
              <span>Meet the</span>
            </span>
            <span className="line">
              <span className="outline">builders.</span>
            </span>
          </h1>
          <p className="lede" style={{ margin: "28px 0 40px" }}>
            <T
              zh="第一周就有 70 多位 UNSW 同学加入。背后是一个三人学生筹备团队。"
              en="More than 70 UNSW students joined in the first week. Behind it is a three-student organising team."
            />
          </p>

          <div className="pillars" data-stagger>
            {TEAM.map((role) => (
              <div className="pillar" key={role.glyph} data-rv>
                <span className="glyph">{role.glyph}</span>
                <h3>
                  <T {...role.title} />
                </h3>
                <p className="mute">
                  <T {...role.body} />
                </p>
              </div>
            ))}
          </div>

          <div className="box subscribe" data-rv>
            <div>
              <h3>
                <T zh="成员在做什么" en="What members are building" />
              </h3>
              <p className="mute">
                <T
                  zh="每个项目和它的发起人都在项目广场。"
                  en="Every project and the member behind it is in the plaza."
                />
              </p>
            </div>
            <div className="hero-cta">
              <Link
                transitionTypes={NAV_TRANSITION}
                href="/projects"
                className="btn ghost"
              >
                <T zh="看项目广场" en="See projects" />
              </Link>
              <Link
                transitionTypes={NAV_TRANSITION}
                href="/join"
                className="btn solid"
              >
                <T zh="加入 BuilderSpace" en="Join BuilderSpace" />{" "}
                <span className="arr">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
