import type { Metadata } from "next";
import { ProjectCard } from "@/components/project-card";
import { SampleNotice } from "@/components/sample-notice";
import { getProjects } from "@/lib/data";
import { ProjectPlaza } from "./project-plaza";

export const metadata: Metadata = { title: "项目广场" };

export default async function ProjectsPage() {
  const projects = await getProjects();
  const cards = Object.fromEntries(
    projects.map((p) => [p.slug, <ProjectCard key={p.slug} project={p} />]),
  );

  return (
    <section className="sec first">
      <div className="wrap">
        <p className="eyebrow mono">项目广场 / Project Plaza · Cycle 01</p>
        <h1 className="display page-title">
          <span className="line">
            <span>Find a team.</span>
          </span>
          <span className="line">
            <span className="outline">Ship a thing.</span>
          </span>
        </h1>
        <p className="lede" style={{ margin: "28px 0 40px" }}>
          每张卡写清楚问题、目标用户、进度和缺的角色。投稿经人工审核后公开，发起人每两周更新一次进展。
        </p>
        <div style={{ marginBottom: 16 }}>
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
