import type { Metadata } from "next";
import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { PageHead } from "@/components/page-head";
import { T } from "@/components/t";
import { getMemberCount } from "@/lib/data";
import { DEPARTMENTS, POSITION_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "成员" };

// Public materials name roles, never people: one card per core-team department.
const GLYPH: Record<(typeof DEPARTMENTS)[number]["name"]["en"], string> = {
  Operations: "[OPS]",
  Tech: "</>",
  Events: "→ EVT",
};

/** 73 → "70+": a floor that stays true until the next ten. */
const roughly = (n: number) =>
  n < 10 ? String(n) : `${Math.floor(n / 10) * 10}+`;

export default async function PeoplePage() {
  const members = await getMemberCount();
  return (
    <section className="sec first">
      <div className="wrap">
        <PageHead
          path="people"
          eyebrow={{ zh: "成员 / People", en: "People" }}
          title={["Meet the", "builders."]}
          aside={[
            ...(members === null
              ? []
              : [
                  {
                    k: { zh: "成员", en: "Members" },
                    v: { zh: roughly(members), en: roughly(members) },
                  },
                ]),
            {
              k: { zh: "核心团队", en: "Core team" },
              v: {
                zh: `${DEPARTMENTS.length} 个部门`,
                en: `${DEPARTMENTS.length} departments`,
              },
            },
            {
              k: { zh: "费用", en: "Cost" },
              v: { zh: "免费", en: "Free" },
            },
          ]}
        />
        <p className="lede" style={{ marginBottom: 40 }}>
          {members !== null && (
            <T
              zh={`已经有 ${roughly(members)} 位同学加入。`}
              en={`${roughly(members)} builders have joined. `}
            />
          )}
          <T
            zh={`社团由学生自己运营，核心团队分成下面 ${DEPARTMENTS.length} 个部门。`}
            en={`Students run the club, and the core team works in the ${DEPARTMENTS.length} departments below.`}
          />
        </p>

        <div className="pillars">
          {DEPARTMENTS.map((dept) => (
            <div className="pillar" key={dept.name.en}>
              <span className="glyph">{GLYPH[dept.name.en]}</span>
              <h3>
                <T {...dept.name} />
              </h3>
              <p className="mute">
                <T
                  zh={`${dept.positions.map((p) => POSITION_LABEL[p].zh).join("、")}。`}
                  en={`${dept.positions.map((p) => POSITION_LABEL[p].en).join(", ")}.`}
                />
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
            <Link href="/core-team" className="btn ghost">
              <T zh="申请做核心成员" en="Join the core team" />
            </Link>
            <Link href="/join" className="btn solid primary">
              <T zh="加入 BuilderSpace" en="Join BuilderSpace" /> <Arr />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
