import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProject } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL, STATUS_LABEL, UPDATE_KIND_LABEL } from "@/lib/types";
import { UpdateForm } from "./update-form";
import { TimelineFx } from "@/components/fx/scroll-fx";
import { Cover, StatusDot } from "@/components/project-card";
import { T } from "@/components/t";

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const result = await getProject((await params).slug);
  return result
    ? { title: result.project.name, description: result.project.problem }
    : {};
}

export default function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  return (
    <Suspense
      fallback={
        <section className="sec first">
          <div className="wrap">
            <Crumb />
            <p className="mute" style={{ marginTop: 32 }}>
              <T zh="加载中…" en="Loading…" />
            </p>
          </div>
        </section>
      }
    >
      {params.then(({ slug }) => (
        <ProjectDetail slug={slug} />
      ))}
    </Suspense>
  );
}

function Crumb() {
  return (
    <Link href="/projects" className="crumb mono">
      ← <T zh="项目广场" en="Projects" />
    </Link>
  );
}

async function ProjectDetail({ slug }: { slug: string }) {
  const result = await getProject(slug);
  if (!result) notFound();
  const { project, updates } = result;

  return (
    <>
      <div className="d-banner">
        <Cover seed={project.slug} label={project.name} media={project.media} />
        <div className="wrap d-banner-in">
          <Crumb />
          <div className="need">
            <span className="tag fill">
              <StatusDot status={project.status} />
              <T {...STATUS_LABEL[project.status]} />
            </span>
            <span className="tag">{project.targetUser}</span>
          </div>
        </div>
      </div>
      <section
        className="sec first"
        style={{ paddingTop: "clamp(28px, 4vw, 48px)" }}
      >
        <div className="wrap">
          <div className="stagger">
            <h1 className="display page-title">{project.name}</h1>
            <p className="lede" style={{ marginTop: 20 }}>
              {project.problem}
            </p>
          </div>

          <div className="fields">
            <div>
              <span className="mono mute">
                <T zh="缺的角色" en="Roles needed" />
              </span>
              <div className="need">
                {project.neededRoles.length === 0 && (
                  <span>
                    <T zh="暂不缺人" en="Team is complete" />
                  </span>
                )}
                {project.neededRoles.map((r) => (
                  <span key={r} className="tag dash">
                    <T {...ROLE_LABEL[r]} />
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="mono mute">
                <T zh="下一步" en="Next step" />
              </span>
              <span>{project.nextStep ?? "—"}</span>
            </div>
            <div>
              <span className="mono mute">
                <T zh="发起人" en="Owner" />
              </span>
              <span>{project.ownerName}</span>
            </div>
            <div>
              <span className="mono mute">
                <T zh="联系方式" en="Contact" />
              </span>
              <span>{project.contact}</span>
            </div>
            {(project.repoUrl || project.demoUrl) && (
              <div>
                <span className="mono mute">
                  <T zh="链接" en="Links" />
                </span>
                <div className="links">
                  {project.repoUrl && (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      <T zh="仓库 ↗" en="Repo ↗" />
                    </a>
                  )}
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      Demo ↗
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <h2 className="h2" style={{ fontSize: 26, marginTop: 56 }}>
            <T zh="进展时间线" en="Progress timeline" />
          </h2>
          {updates.length === 0 ? (
            <p className="empty" style={{ marginTop: 20 }}>
              <T
                zh="还没有进展记录。发起人每两周更新一次。"
                en="No updates yet. Owners post one every two weeks."
              />
            </p>
          ) : (
            <TimelineFx>
              {updates.map((u) => (
                <li key={`${u.occurredAt}-${u.body}`}>
                  <span className="mono mute">
                    {formatDate(u.occurredAt)} ·{" "}
                    <T {...UPDATE_KIND_LABEL[u.kind]} />
                  </span>
                  <p>
                    {u.body}
                    {u.url && (
                      <>
                        {" "}
                        <a
                          href={u.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-link"
                        >
                          <T zh="查看 ↗" en="View ↗" />
                        </a>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </TimelineFx>
          )}
          <UpdateForm slug={project.slug} />
        </div>
      </section>
    </>
  );
}
