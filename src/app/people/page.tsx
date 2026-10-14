import type { Metadata } from "next";
import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { PageHead } from "@/components/page-head";
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
    <section className="sec first">
      <div className="wrap">
        <PageHead
          path="people"
          eyebrow={{ zh: "成员 / People", en: "People" }}
          title={["Meet the", "builders."]}
          aside={[
            {
              k: { zh: "第一周加入", en: "Joined in week 1" },
              v: { zh: "70+", en: "70+" },
            },
            {
              k: { zh: "筹备团队", en: "Organisers" },
              v: { zh: "3 人", en: "3 students" },
            },
            {
              k: { zh: "费用", en: "Cost" },
              v: { zh: "免费", en: "Free" },
            },
          ]}
        />
        <p className="lede" style={{ marginBottom: 40 }}>
          <T
            zh="第一周就有 70 多位 UNSW 同学加入。背后是一个三人学生筹备团队。"
            en="More than 70 UNSW students joined in the first week. Behind it is a three-student organising team."
          />
        </p>

        <div className="pillars">
          {TEAM.map((role) => (
            <div className="pillar" key={role.glyph}>
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

        <div className="box subscribe">
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
            <Link href="/projects" className="btn ghost">
              <T zh="看项目广场" en="See projects" />
            </Link>
            <Link href="/volunteer" className="btn ghost">
              <T zh="申请做志愿者" en="Volunteer" />
            </Link>
            <Link href="/join" className="btn solid">
              <T zh="加入 BuilderSpace" en="Join BuilderSpace" /> <Arr />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
