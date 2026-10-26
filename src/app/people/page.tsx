import type { Metadata } from "next";
import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { PageHead } from "@/components/page-head";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { getMemberCount, getTeam } from "@/lib/data";
import { CORE_TEAM_FLOOR, roughly } from "@/lib/team";
import { DEPARTMENTS } from "@/lib/types";
import { Team } from "./team";
import "./people.css";

export const metadata: Metadata = { title: "成员" };

// People appear only with the name they chose to show and after agreeing to be
// on the site (team_members.consent_at); see docs/team.md.

export default async function PeoplePage() {
  const [members, team] = await Promise.all([getMemberCount(), getTeam()]);
  const core = roughly(
    Math.max(team.filter((p) => p.team !== "founder").length, CORE_TEAM_FLOOR),
  );
  return (
    <section className="sec first tm-page">
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
              k: { zh: "核心成员", en: "Core team" },
              v: { zh: `${core} 人`, en: core },
            },
            {
              k: { zh: "部门", en: "Departments" },
              v: {
                zh: `${DEPARTMENTS.length} 个`,
                en: `${DEPARTMENTS.length}`,
              },
            },
          ]}
        />
        <p className="lede tm-lede" style={{ marginBottom: 40 }}>
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

        <SampleNotice />
        <Team people={team} />

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
