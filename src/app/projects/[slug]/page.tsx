import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProject } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL, STATUS_LABEL, UPDATE_KIND_LABEL } from "@/lib/types";
import { UpdateForm } from "./update-form";

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
    <section className="sec first">
      <div className="wrap">
        <Link href="/projects" className="crumb mono">
          ← 项目广场
        </Link>
        <Suspense fallback={<p className="mute">加载中…</p>}>
          {params.then(({ slug }) => (
            <ProjectDetail slug={slug} />
          ))}
        </Suspense>
      </div>
    </section>
  );
}

async function ProjectDetail({ slug }: { slug: string }) {
  const result = await getProject(slug);
  if (!result) notFound();
  const { project, updates } = result;

  return (
    <>
      <div className="need" style={{ margin: "32px 0 16px" }}>
        <span className="tag fill">{STATUS_LABEL[project.status]}</span>
        <span className="tag">{project.targetUser}</span>
      </div>
      <h1 className="display page-title">{project.name}</h1>
      <p className="lede" style={{ marginTop: 20 }}>
        {project.problem}
      </p>

      <div className="fields">
        <div>
          <span className="mono mute">缺的角色</span>
          <div className="need">
            {project.neededRoles.length === 0 && <span>暂不缺人</span>}
            {project.neededRoles.map((r) => (
              <span key={r} className="tag dash">
                {ROLE_LABEL[r]}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="mono mute">下一步</span>
          <span>{project.nextStep ?? "—"}</span>
        </div>
        <div>
          <span className="mono mute">发起人</span>
          <span>{project.ownerName}</span>
        </div>
        <div>
          <span className="mono mute">联系方式</span>
          <span>{project.contact}</span>
        </div>
        {(project.repoUrl || project.demoUrl) && (
          <div>
            <span className="mono mute">链接</span>
            <div className="links">
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  仓库 ↗
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
        进展时间线
      </h2>
      {updates.length === 0 ? (
        <p className="empty" style={{ marginTop: 20 }}>
          还没有进展记录。发起人每两周更新一次。
        </p>
      ) : (
        <ol className="timeline">
          {updates.map((u) => (
            <li key={`${u.occurredAt}-${u.body}`}>
              <span className="mono mute">
                {formatDate(u.occurredAt)} · {UPDATE_KIND_LABEL[u.kind]}
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
                      查看 ↗
                    </a>
                  </>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
      <UpdateForm slug={project.slug} />
    </>
  );
}
