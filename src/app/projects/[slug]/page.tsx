import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMyStars, getSession } from "@/lib/auth";
import { getProject, getProjectComments } from "@/lib/data";
import { dateStamp, formatDate, formatShortDate } from "@/lib/format";
import {
  COMMENT_KINDS,
  COMMENT_KIND_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
  UPDATE_KIND_LABEL,
} from "@/lib/types";
import { countKind } from "@/lib/comments";
import { displayLength, PITCH_MAX } from "@/lib/text-length";
import { memberCode } from "@/lib/members";
import { MeCard } from "@/app/me/me-card";
import { AskToJoin, Comments } from "./comments";
import { ContactCopy, DetailToc } from "./detail-aside";
import { StarButton } from "./star-button";
import { UpdateForm } from "./update-form";
import { Arr } from "@/components/fx/arr";
import { CoverMaterial } from "@/components/fx/cover-material";
import { TimelineFx } from "@/components/fx/scroll-fx";
import {
  Cover,
  OwnerChip,
  StatusDot,
  coverSeed,
  pitchText,
  projectText,
} from "@/components/project-card";
import { T, TranslatedMark } from "@/components/t";
import "../../members.css";

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const result = await getProject((await params).slug);
  return result
    ? {
        title: result.project.name,
        description:
          result.project.pitch ?? result.project.problem ?? undefined,
      }
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

/** Digits roll to a new count when a comment arrives; readers get the text. */
function Odometer({ value }: { value: number }) {
  const digits = String(value).padStart(2, "0").split("");
  return (
    <>
      <span className="odo" aria-hidden>
        {digits.map((d, i) => (
          <span key={digits.length - i}>
            <span style={{ transform: `translateY(-${Number(d)}em)` }}>
              {[..."0123456789"].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        ))}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}

/**
 * Display size for the project name: wide Latin letters take about 3/4 of a
 * CJK character, and a long name steps down so words don't break mid-way.
 */
function titleSize(name: string) {
  const units = [...name].reduce(
    (n, ch) => n + (/[\u2e80-\uffff]/.test(ch) ? 1 : 0.75),
    0,
  );
  return units <= 5 ? "xl" : units <= 9 ? "lg" : units <= 16 ? "md" : "sm";
}

/** The Star button with this visitor's own star; reads the session. */
async function ProjectStar({ slug, count }: { slug: string; count: number }) {
  const [session, stars] = await Promise.all([getSession(), getMyStars()]);
  return (
    <StarButton
      slug={slug}
      count={count}
      starred={stars.some((s) => s.slug === slug)}
      viewer={session?.member ? "member" : session ? "no-card" : "guest"}
    />
  );
}

async function ProjectDetail({ slug }: { slug: string }) {
  const [result, comments] = await Promise.all([
    getProject(slug),
    getProjectComments(slug),
  ]);
  if (!result) notFound();
  const { project, updates } = result;
  const { media } = project;
  const name = projectText(project, "name");
  const hasMedia = Boolean(
    media.coverUrl || media.videoUrl || media.videoPosterUrl,
  );
  // The long intro gets its own section; on a project from before pitches it
  // is the lede already, so only when that lede had to be cut short.
  const about =
    Boolean(project.problem) &&
    (Boolean(project.pitch) ||
      displayLength(project.problem ?? "") > PITCH_MAX);

  return (
    <section className="sec first d-page">
      <div className="wrap">
        <div className="d-top">
          <Crumb />
          <span className="mono mute">
            #{project.slug} · <T zh="更新于" en="Updated" />{" "}
            {formatShortDate(project.updatedAt)}
          </span>
        </div>

        <header className="d-hero">
          <div className="d-hero-l">
            <div className="need">
              <span
                className={`tag ${project.status === "recruiting" ? "fill" : ""}`}
              >
                <StatusDot status={project.status} />
                <T {...STATUS_LABEL[project.status]} />
              </span>
              <span className="tag">
                <T {...projectText(project, "targetUser")} />
              </span>
            </div>
            <h1
              className="d-title"
              data-size={titleSize(project.name)}
              data-size-en={titleSize(name.en ?? project.name)}
            >
              <T {...name} />
            </h1>
            <p className={project.pitch ? "d-lede" : "d-lede clamp"}>
              <T {...pitchText(project)} />
            </p>
            <div className="d-cta">
              {project.status !== "paused" && (
                <AskToJoin>
                  <T zh="我想加入" en="I want to join" /> <Arr />
                </AskToJoin>
              )}
              <Suspense
                fallback={
                  <StarButton
                    slug={project.slug}
                    count={project.starCount}
                    starred={false}
                    viewer="loading"
                  />
                }
              >
                <ProjectStar slug={project.slug} count={project.starCount} />
              </Suspense>
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn ghost"
                >
                  <T zh="仓库" en="Repo" /> <Arr diag />
                </a>
              )}
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn ghost"
                >
                  Demo <Arr diag />
                </a>
              )}
              <TranslatedMark lang={project.translated} className="d-tr" />
            </div>
          </div>
          <figure className="d-cover">
            {!hasMedia && <CoverMaterial seed={coverSeed(project.slug)} />}
            <Cover seed={project.slug} label={project.name} media={media} />
          </figure>
        </header>

        <dl className="d-spec">
          <div>
            <dt className="mono mute">
              <T zh="发起人" en="Owner" />
            </dt>
            <dd>
              {project.owner ? (
                <OwnerChip owner={project.owner} />
              ) : (
                project.ownerName
              )}
            </dd>
          </div>
          <div>
            <dt className="mono mute">
              <T zh="在寻找的角色" en="Roles needed" />
            </dt>
            <dd className="need">
              {project.neededRoles.length === 0 ? (
                <T zh="暂不寻找新成员" en="Team is complete" />
              ) : (
                project.neededRoles.map((r) => (
                  <span key={r} className="tag dash">
                    <T {...ROLE_LABEL[r]} />
                  </span>
                ))
              )}
            </dd>
          </div>
          <div>
            <dt className="mono mute">
              <T zh="最近更新" en="Last update" />
            </dt>
            <dd>{formatShortDate(project.updatedAt)}</dd>
          </div>
          <div>
            <dt className="mono mute">
              <T zh="进展 / 讨论" en="Updates / comments" />
            </dt>
            <dd>
              {updates.length}
              <span className="mute"> / </span>
              {comments.length}
            </dd>
          </div>
        </dl>

        <div className="d-body">
          <div className="d-main">
            {about && (
              <section className="d-block" id="about">
                <span className="d-path mono" aria-hidden>
                  ~/{project.slug}/about
                </span>
                <h2 className="h2">
                  <T zh="项目介绍" en="About" />
                </h2>
                <p className="d-about">
                  <T {...projectText(project, "problem")} />
                </p>
              </section>
            )}
            {project.nextStep && (
              <section className="d-block" id="next">
                <span className="d-path mono" aria-hidden>
                  ~/{project.slug}/next
                </span>
                <h2 className="h2">
                  <T zh="下一步" en="Next step" />
                </h2>
                <div className="box d-next">
                  <span className="d-next-arrow" aria-hidden>
                    →
                  </span>
                  <p>
                    <T {...projectText(project, "nextStep")} />
                  </p>
                </div>
              </section>
            )}

            <section className="d-block" id="log">
              <span className="d-path mono" aria-hidden>
                ~/{project.slug}/log
              </span>
              <h2 className="h2">
                <T zh="进展时间线" en="Progress timeline" />
              </h2>
              {updates.length === 0 ? (
                <p className="empty">
                  <T
                    zh="还没有进展记录。发起人每两周更新一次。"
                    en="No updates yet. Owners post one every two weeks."
                  />
                </p>
              ) : (
                <TimelineFx>
                  {updates.map((u) => {
                    const { day, month } = dateStamp(u.occurredAt);
                    return (
                      <li key={`${u.occurredAt}-${u.body}`}>
                        <time
                          className="tl-date"
                          dateTime={u.occurredAt}
                          title={formatDate(u.occurredAt)}
                        >
                          <b>{day}</b>
                          <span className="mono mute">
                            <T {...month} />
                          </span>
                        </time>
                        <i className="tl-node" aria-hidden />
                        <div className="tl-body">
                          <span className="tag">
                            <T {...UPDATE_KIND_LABEL[u.kind]} />
                          </span>
                          <p>
                            <T zh={u.body} en={u.bodyEn ?? u.body} />
                          </p>
                          {u.url && (
                            <a
                              href={u.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-link"
                            >
                              <T zh="查看 ↗" en="View ↗" />
                            </a>
                          )}
                          <TranslatedMark
                            lang={u.translated}
                            className="tl-tr"
                          />
                        </div>
                      </li>
                    );
                  })}
                </TimelineFx>
              )}
              <UpdateForm slug={project.slug} />
            </section>

            <section className="d-block" id="talk">
              <div className="cx-head">
                <div className="cx-title-col">
                  <span className="d-path mono" aria-hidden>
                    ~/{project.slug}/talk
                  </span>
                  <h2 className="h2 cx-title">
                    <T zh="讨论区" en="Discussion" />
                    <span className="cx-n mono">
                      [<Odometer value={comments.length} />]
                    </span>
                  </h2>
                </div>
                <dl className="cx-readouts mono">
                  {COMMENT_KINDS.map((k) => (
                    <div key={k}>
                      <dt className="mute">
                        <T {...COMMENT_KIND_LABEL[k]} />
                      </dt>
                      <dd>{countKind(comments, k)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <Comments slug={project.slug} comments={comments} />
            </section>
          </div>

          <aside className="d-side">
            <div
              className={project.owner ? "box d-card d-owner" : "box d-card"}
            >
              {project.owner ? (
                <>
                  <span className="mono mute">
                    <T zh="发起人" en="Owner" />
                  </span>
                  <MeCard
                    card={project.owner.card}
                    design={project.owner.design}
                  />
                  <p className="d-owner-name">
                    <b>{project.owner.card.nickname}</b>
                    {project.owner.card.memberNo && (
                      <span className="mono mute">
                        {memberCode(project.owner.card.memberNo)}
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <span className="mono mute">
                  <T zh="联系发起人" en="Contact the owner" />
                </span>
              )}
              <ContactCopy contact={project.contact} />
              <p className="mute d-note">
                <T
                  zh="加好友时备注「BuilderSpace + 你的昵称」。"
                  en="Mention BuilderSpace and your nickname when you add them."
                />
              </p>
            </div>
            {project.neededRoles.length > 0 && project.status !== "paused" && (
              <div className="box d-card">
                <span className="mono mute">
                  <T zh="在寻找的角色" en="Roles needed" />
                </span>
                <div className="need">
                  {project.neededRoles.map((r) => (
                    <span key={r} className="tag dash">
                      <T {...ROLE_LABEL[r]} />
                    </span>
                  ))}
                </div>
                <AskToJoin className="btn ghost sm">
                  <T zh="我能补位" en="I can fill a role" /> <Arr />
                </AskToJoin>
              </div>
            )}
            <DetailToc
              items={[
                ...(about
                  ? [{ id: "about", label: <T zh="项目介绍" en="About" /> }]
                  : []),
                ...(project.nextStep
                  ? [{ id: "next", label: <T zh="下一步" en="Next step" /> }]
                  : []),
                {
                  id: "log",
                  label: <T zh="进展时间线" en="Progress timeline" />,
                  count: updates.length,
                },
                {
                  id: "talk",
                  label: <T zh="讨论区" en="Discussion" />,
                  count: comments.length,
                },
              ]}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}
