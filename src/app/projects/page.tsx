import type { Metadata } from "next";
import { biText, pageMeta } from "@/lib/seo";
import { PageHead } from "@/components/page-head";
import { SampleNotice } from "@/components/sample-notice";
import { getProjects } from "@/lib/data";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { Plaza } from "./plaza";

export const metadata: Metadata = pageMeta("/projects", {
  title: "项目广场 Projects",
  description: biText(
    "成员正在做的项目：看进度，找队友，一起做。",
    "Projects members are building: see where they are, find teammates, join in.",
  ),
});

export default async function ProjectsPage() {
  const projects = await getProjects();

  const needed = new Map<Role, number>();
  for (const p of projects)
    for (const r of p.neededRoles) needed.set(r, (needed.get(r) ?? 0) + 1);
  const [topRole] = [...needed].sort((a, b) => b[1] - a[1])[0] ?? [];
  const recruiting = projects.filter((p) => p.status === "recruiting").length;

  return (
    <section className="sec first">
      <div className="wrap">
        <PageHead
          path="projects"
          eyebrow={{
            zh: "项目广场 / Project Plaza · Cycle 01",
            en: "Project plaza · Cycle 01",
          }}
          title={["Find a team.", "Ship a thing."]}
          aside={[
            {
              k: { zh: "公开项目", en: "Live projects" },
              v: { zh: String(projects.length), en: String(projects.length) },
            },
            {
              k: { zh: "招募中", en: "Recruiting" },
              v: { zh: String(recruiting), en: String(recruiting) },
            },
            {
              k: { zh: "最多项目在寻找的角色", en: "Most needed" },
              v: topRole ? ROLE_LABEL[topRole] : { zh: "—", en: "—" },
            },
          ]}
        />
        <SampleNotice />
        <Plaza projects={projects} />
      </div>
    </section>
  );
}
