import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
import { getEvents, getTutorials, getWeeklyPicks } from "@/lib/data";
import { formatDate, formatShortDate } from "@/lib/format";
import { T } from "@/components/t";
import { Typewriter } from "./terminal";

export const metadata: Metadata = { title: "教程资料" };

const PATH = [
  { zh: "需求拆解", en: "Break it down" },
  { zh: "代码审阅", en: "Review the code" },
  { zh: "测试", en: "Test it" },
  { zh: "部署", en: "Ship it" },
];

export default async function LearnPage() {
  const [tutorials, picks, events] = await Promise.all([
    getTutorials(),
    getWeeklyPicks(),
    getEvents(),
  ]);
  const workshops = events.filter((e) => e.kind === "workshop").length;

  return (
    <>
      <section className="sec first">
        <div className="wrap">
          <PageHead
            path="learn"
            eyebrow={{ zh: "教程资料 / Learn", en: "Learn" }}
            title={["Write with AI.", "Read every line."]}
            aside={[
              {
                k: { zh: "工作坊", en: "Workshops" },
                v: { zh: `${workshops} 期`, en: String(workshops) },
              },
              {
                k: { zh: "资料上线", en: "Materials" },
                v: { zh: "48 小时内", en: "Within 48h" },
              },
              {
                k: { zh: "每周精选", en: "Weekly picks" },
                v: { zh: "周四", en: "Thursdays" },
              },
            ]}
          />
          <p className="lede">
            <T
              zh="我们教的是软件开发，AI 只是工具。每一期都落在同一条路径上：会拆需求、读得懂代码、写得出测试、部署得上线。"
              en="We teach software development; AI is just the tool. Every session lands on the same path: break the problem down, read the code, test it, ship it."
            />
          </p>

          <ol className="path" aria-label="Learning path / 学习路径">
            {PATH.map((step, i) => (
              <li key={step.en}>
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                <b>
                  <T {...step} />
                </b>
              </li>
            ))}
          </ol>

          <div className="lgrid" style={{ marginTop: 40 }}>
            <article className="lcard">
              <div className="term">
                <div className="term-bar">
                  <span className="dots" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="mono mute">workshop.sh</span>
                  <span className="mono mute">zsh</span>
                </div>
                <Typewriter />
              </div>
              <div className="body">
                <span className="mono mute">
                  <T zh="一场工作坊 · 2 小时" en="One workshop · 2 hours" />
                </span>
                <h3 style={{ fontSize: 20 }}>
                  <T
                    zh="从一个想法到一个能发给朋友的链接"
                    en="From an idea to a link you can send a friend"
                  />
                </h3>
                <p className="mute">
                  <T
                    zh="把想法拆成 3 个功能，让 AI 写，自己逐行读懂，再部署到 Vercel。"
                    en="Split the idea into three features, let AI write them, read every line yourself, then deploy to Vercel."
                  />
                </p>
              </div>
            </article>

            {tutorials.length === 0 ? (
              <div className="empty">
                <T
                  zh="首场工作坊结束后，讲义、示例仓库和录屏会出现在这里。"
                  en="Slides, example repos and recordings appear here after the first workshop."
                />
              </div>
            ) : (
              tutorials.map((t) => (
                <article
                  key={t.title}
                  id={t.eventSlug ?? undefined}
                  className="box"
                >
                  {t.publishedAt && (
                    <span className="mono mute">
                      {formatDate(t.publishedAt)}
                    </span>
                  )}
                  <h3 style={{ fontSize: 20 }}>{t.title}</h3>
                  {t.summary && <p className="mute">{t.summary}</p>}
                  <div className="links">
                    {t.slidesUrl && (
                      <ExtLink href={t.slidesUrl}>
                        <T zh="讲义" en="Slides" />
                      </ExtLink>
                    )}
                    {t.repoUrl && (
                      <ExtLink href={t.repoUrl}>
                        <T zh="示例仓库" en="Example repo" />
                      </ExtLink>
                    )}
                    {t.recordingUrl && (
                      <ExtLink href={t.recordingUrl}>
                        <T zh="录屏" en="Recording" />
                      </ExtLink>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow mono">
                <T zh="每周精选 · Weekly" en="Weekly picks" />
              </p>
              <h2 className="h2">
                <T
                  zh="一篇资讯，加校内活动。"
                  en="One read, plus what’s on around campus."
                />
              </h2>
            </div>
            <span className="mono mute">
              <T
                zh="每周四更新 · 只写摘要，附原文链接"
                en="Thursdays · summaries with a link to the source"
              />
            </span>
          </div>
          {picks.length === 0 ? (
            <p className="empty">
              <T
                zh="第一期精选筹备中。"
                en="The first issue is in the works."
              />
            </p>
          ) : (
            <div className="digest-list">
              {picks.map((p, i) => (
                <a
                  key={p.sourceUrl}
                  className="dg"
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="dg-no">
                    {String(picks.length - i).padStart(2, "0")}
                  </span>
                  <span className="mono mute dg-date">
                    {formatShortDate(p.pickedOn)}
                  </span>
                  <span className="dg-main">
                    <b>{p.title}</b>
                    <small className="mute">{p.summary}</small>
                  </span>
                  <span className="mono mute dg-src">
                    {p.kind === "news" ? (
                      <T zh="资讯" en="Read" />
                    ) : (
                      <T zh="校内活动" en="On campus" />
                    )}{" "}
                    · {p.sourceName}
                  </span>
                  <span className="dg-go" aria-hidden>
                    ↗
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ExtLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-link">
      {children} ↗
    </a>
  );
}
