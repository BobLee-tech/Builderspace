import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { getTutorials, getWeeklyPicks } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { T } from "@/components/t";

export const metadata: Metadata = { title: "资源" };

export default async function LearnPage() {
  const [tutorials, picks] = await Promise.all([
    getTutorials(),
    getWeeklyPicks(),
  ]);

  return (
    <PageTransition>
      <section className="sec first">
        <div className="wrap">
          <p className="eyebrow mono">
            <T zh="资源 / Resources" en="Resources" />
          </p>
          <h1 className="display page-title">
            <span className="line">
              <span>Read every line.</span>
            </span>
          </h1>
          <p className="lede" style={{ marginTop: 28 }}>
            <T
              zh="用 AI 写，自己看得懂、调得通。每场工作坊的讲义、示例仓库和录屏，结束后 48 小时内上线。"
              en="Write it with AI, then understand and debug it yourself. Slides, example repos and recordings go up within 48 hours of each workshop."
            />
          </p>

          {tutorials.length === 0 ? (
            <p className="empty" style={{ marginTop: 40 }}>
              <T
                zh="首场工作坊结束后，资料会出现在这里。"
                en="Materials appear here after the first workshop."
              />
            </p>
          ) : (
            <div className="lgrid">
              {tutorials.map((t) => (
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
                  <h3>{t.title}</h3>
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
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <p className="eyebrow mono">
            <T zh="每周精选" en="Weekly picks" />
          </p>
          <h2 className="h2">
            <T
              zh="一篇资讯，加校内活动。"
              en="One read, plus what’s on around campus."
            />
          </h2>
          {picks.length === 0 ? (
            <p className="empty" style={{ marginTop: 32 }}>
              <T
                zh="第一期精选筹备中。"
                en="The first issue is in the works."
              />
            </p>
          ) : (
            <div className="lgrid">
              {picks.map((p) => (
                <article key={p.sourceUrl} className="box">
                  <span className="mono mute">
                    {p.kind === "news" ? (
                      <T zh="资讯" en="Read" />
                    ) : (
                      <T zh="校内活动" en="On campus" />
                    )}{" "}
                    · {p.pickedOn}
                  </span>
                  <h3>{p.title}</h3>
                  <p className="mute">{p.summary}</p>
                  <ExtLink href={p.sourceUrl}>
                    <T zh="来源：" en="Source: " />
                    {p.sourceName}
                  </ExtLink>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageTransition>
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
