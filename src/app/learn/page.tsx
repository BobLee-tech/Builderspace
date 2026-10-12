import type { Metadata } from "next";
import { getTutorials, getWeeklyPicks } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "教程资料" };

export default async function LearnPage() {
  const [tutorials, picks] = await Promise.all([
    getTutorials(),
    getWeeklyPicks(),
  ]);

  return (
    <>
      <section className="sec first">
        <div className="wrap">
          <p className="eyebrow mono">教程资料 / Learn</p>
          <h1 className="display page-title">
            <span className="line">
              <span>Read every line.</span>
            </span>
          </h1>
          <p className="lede" style={{ marginTop: 28 }}>
            用 AI
            写，自己看得懂、调得通。每场工作坊的讲义、示例仓库和录屏，结束后 48
            小时内上线。
          </p>

          {tutorials.length === 0 ? (
            <p className="empty" style={{ marginTop: 40 }}>
              首场工作坊结束后，资料会出现在这里。
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
                  <h3 style={{ fontSize: 20 }}>{t.title}</h3>
                  {t.summary && <p className="mute">{t.summary}</p>}
                  <div className="links">
                    {t.slidesUrl && <ExtLink href={t.slidesUrl}>讲义</ExtLink>}
                    {t.repoUrl && <ExtLink href={t.repoUrl}>示例仓库</ExtLink>}
                    {t.recordingUrl && (
                      <ExtLink href={t.recordingUrl}>录屏</ExtLink>
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
          <p className="eyebrow mono">每周精选</p>
          <h2 className="h2">一篇资讯，加校内活动。</h2>
          {picks.length === 0 ? (
            <p className="empty" style={{ marginTop: 32 }}>
              第一期精选筹备中。
            </p>
          ) : (
            <div className="lgrid">
              {picks.map((p) => (
                <article key={p.sourceUrl} className="box">
                  <span className="mono mute">
                    {p.kind === "news" ? "资讯" : "校内活动"} · {p.pickedOn}
                  </span>
                  <h3 style={{ fontSize: 18 }}>{p.title}</h3>
                  <p className="mute">{p.summary}</p>
                  <ExtLink href={p.sourceUrl}>来源：{p.sourceName}</ExtLink>
                </article>
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
