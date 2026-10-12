import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { HeroMetal } from "@/components/hero-metal";
import { ProjectCard } from "@/components/project-card";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import {
  getActiveProjectCount,
  getEventSchedule,
  getProjects,
} from "@/lib/data";
import { formatDate, formatTimeRange } from "@/lib/format";
import { EVENT_KIND_LABEL } from "@/lib/types";

const ACTIVE_PROJECT_TARGET = 8;

export default function Home() {
  return (
    <>
      <section className="hero">
        <HeroMetal />
        <div className="wrap">
          <div className="hero-meta mono mute">
            <span className="live">
              <T zh="Cycle 01 组队报名中" en="Cycle 01 · teams forming" />
            </span>
            <span>Sydney · Kensington</span>
            <span>T3 2026</span>
          </div>
          <h1
            className="display"
            aria-label="Bring an idea. Leave with something that works."
          >
            <span className="line">
              <span>Bring an idea.</span>
            </span>
            <span className="line">
              <span className="outline">Leave with</span>
            </span>
            <span className="line">
              <span>something that works</span>
            </span>
          </h1>
          <div className="hero-sub">
            <p className="hero-zh">
              <T
                zh={
                  <>
                    带着想法来，<b>两小时</b>做出第一个能用的页面。
                  </>
                }
                en={
                  <>
                    Bring an idea. Ship your <b>first working page</b> in two
                    hours.
                  </>
                }
              />
              <br />
              <span className="mute" style={{ fontSize: "0.7em" }}>
                <T
                  zh="一个从 UNSW 起步的中英双语创客社团：学 Vibe Coding、找队友、每周一起把项目做出来。"
                  en="A bilingual builders community from UNSW: learn vibe coding, find teammates, and build your project together every week."
                />
              </span>
            </p>
            <div className="hero-cta">
              <Link href="/join" className="btn solid">
                <T zh="加入 BuilderSpace" en="Join BuilderSpace" />{" "}
                <span className="arr">→</span>
              </Link>
              <Link href="/projects" className="btn ghost">
                <T zh="看项目广场" en="See projects" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <NextEventSection />

      <section className="sec">
        <div className="wrap">
          <p className="eyebrow mono">
            <T zh="为什么来这里" en="Why come" />
          </p>
          <h2 className="h2" style={{ marginBottom: 40 }}>
            <T
              zh={
                <>
                  做项目这件事，
                  <br />
                  <span className="dim">一个人很容易半途而废。</span>
                </>
              }
              en={
                <>
                  Side projects
                  <br />
                  <span className="dim">die when you build alone.</span>
                </>
              }
            />
          </h2>
          <div className="pillars">
            {PILLARS.map((p) => (
              <div className="pillar" key={p.glyph}>
                <span className="glyph">{p.glyph}</span>
                <h3>
                  <T {...p.title} />
                </h3>
                <p className="mute">
                  <T {...p.body} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <p className="eyebrow mono">Build Cycle 01 · W3 – W6</p>
          <h2 className="h2" style={{ marginBottom: 48 }}>
            <T
              zh={
                <>
                  4–6 周，<span className="dim">从一个想法到一次演示。</span>
                </>
              }
              en={
                <>
                  4–6 weeks,
                  <span className="dim"> from an idea to a demo.</span>
                </>
              }
            />
          </h2>
          <div className="cycle">
            <div className="cycle-rail" aria-hidden />
            {CYCLE.map((step, i) => (
              <div className="step" key={step.when + i}>
                <div className="node">{String(i + 1).padStart(2, "0")}</div>
                <h3>
                  <T {...step.title} />
                </h3>
                <p>
                  <T {...step.body} />
                </p>
                <span className="mono">{step.when}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MetricsSection />

      <FeaturedProjectsSection />
    </>
  );
}

const PILLARS = [
  {
    glyph: "中/EN",
    title: { zh: "用中文也能问", en: "Ask in Chinese" },
    body: {
      zh: "讲解和答疑用中文，README、Demo 和 pitch 用英文。作品能直接放进简历和 LinkedIn。",
      en: "Explanations and Q&A in Chinese; README, demo and pitch in English, ready for your CV and LinkedIn.",
    },
  },
  {
    glyph: "[WED]",
    title: { zh: "每周固定见面", en: "Same time every week" },
    body: {
      zh: "Build Night 每周同一时间、同一地点。线上先抛问题，线下一起写代码，进度不再靠自觉。",
      en: "Build Night happens at the same time and place every week. Post your blocker online, code it together in person.",
    },
  },
  {
    glyph: "→ DEMO",
    title: { zh: "做出来有地方展示", en: "A stage for what you ship" },
    body: {
      zh: "每个周期以 Demo Night 收尾，项目卡长期挂在项目广场，愿意的话推荐给 UNSW Founders 或整理成作品集。",
      en: "Every cycle ends with Demo Night. Your project card stays in the plaza, and can be referred to UNSW Founders or turned into a portfolio.",
    },
  },
];

const CYCLE = [
  {
    title: { zh: "组队 Pitch", en: "Pitch & team up" },
    body: {
      zh: "每人 90 秒讲想法，现场按“缺的角色”配对。",
      en: "90 seconds per idea, then pair up by the roles each project needs.",
    },
    when: "W3",
  },
  {
    title: { zh: "每周 Build Night", en: "Weekly Build Night" },
    body: {
      zh: "线上周一抛问题，线下周三一起写。每两周在项目卡上更新一次进展。",
      en: "Blockers online on Monday, build together on Wednesday. Update your project card every two weeks.",
    },
    when: "W3 – W6",
  },
  {
    title: { zh: "中期检查", en: "Mid-cycle check" },
    body: {
      zh: "跑通一个核心流程，卡住的项目一对一回访。",
      en: "Get one core flow working; stuck teams get a one-on-one check-in.",
    },
    when: "W4",
  },
  {
    title: { zh: "Demo Night", en: "Demo Night" },
    body: {
      zh: "3 分钟英文演示 + 现场试用 + 同伴反馈。",
      en: "A 3-minute demo in English, live try-outs and peer feedback.",
    },
    when: "W6",
  },
];

async function NextEventSection() {
  const { upcoming } = await getEventSchedule();
  const next = upcoming[0];

  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow mono">
              <T zh="下一场活动" en="Next up" />
            </p>
            <h2 className="h2">
              {next ? (
                next.title
              ) : (
                <T zh="下一场活动筹备中。" en="Next event coming soon." />
              )}
            </h2>
          </div>
          <Link href="/events" className="text-link">
            <T zh="全部活动 →" en="All events →" />
          </Link>
        </div>
        {next && (
          <div className="next">
            <div className="next-l">
              <div className="need">
                <span className="tag fill">
                  <T {...EVENT_KIND_LABEL[next.kind]} />
                </span>
                <SampleNotice />
              </div>
              {next.summary && <p className="lede">{next.summary}</p>}
              <div className="kv">
                <div>
                  <span className="mono mute">
                    <T zh="日期" en="Date" />
                  </span>
                  <b>{formatDate(next.startsAt)}</b>
                </div>
                <div>
                  <span className="mono mute">
                    <T zh="时间" en="Time" />
                  </span>
                  <b>{formatTimeRange(next.startsAt, next.endsAt)}</b>
                </div>
                <div>
                  <span className="mono mute">
                    <T zh="地点" en="Where" />
                  </span>
                  <b>{next.location}</b>
                </div>
              </div>
            </div>
            <div className="next-r">
              <Countdown to={next.startsAt} />
              <div className="next-actions">
                {next.signupUrl ? (
                  <a
                    href={next.signupUrl}
                    className="btn solid"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <T zh="报名 ↗" en="Sign up ↗" />
                  </a>
                ) : (
                  <span className="mono mute">
                    <T zh="报名链接即将发布" en="Sign-up link soon" />
                  </span>
                )}
                {next.capacity && (
                  <span className="mono mute">
                    <T
                      zh={`限 ${next.capacity} 人`}
                      en={`${next.capacity} spots`}
                    />
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

async function MetricsSection() {
  const active = await getActiveProjectCount();
  return (
    <section className="sec">
      <div className="wrap">
        <p className="eyebrow mono">
          <T zh="公开数据 · 每两周更新" en="Public numbers · every two weeks" />
        </p>
        <h2 className="h2" style={{ marginBottom: 40 }}>
          <T
            zh={
              <>
                我们只看一个数：
                <br />
                <span className="dim">有多少项目在动。</span>
              </>
            }
            en={
              <>
                We track one number:
                <br />
                <span className="dim">how many projects are moving.</span>
              </>
            }
          />
        </h2>
        <div className="metrics">
          <div className="metric star">
            <span className="mono mute">
              <T
                zh="北极星 · 双周活跃项目"
                en="North star · active projects (14 days)"
              />
            </span>
            <span className="big">
              {active ?? "—"}
              <sup>/ {ACTIVE_PROJECT_TARGET}</sup>
            </span>
            <p className="mute">
              <T
                zh="过去 14 天有代码提交、Demo 或更新帖的成员项目"
                en="Member projects with a commit, demo or update in the last 14 days"
              />
            </p>
          </div>
          <div className="metric">
            <span className="mono mute">
              <T zh="本学期目标" en="Term goal" />
            </span>
            <span className="big">150</span>
            <p className="mute">
              <T zh="群成员" en="Community members" />
            </p>
          </div>
          <div className="metric">
            <span className="mono mute">
              <T zh="本学期目标" en="Term goal" />
            </span>
            <span className="big">60</span>
            <p className="mute">
              <T zh="到场成员" en="People at events" />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

async function FeaturedProjectsSection() {
  const projects = (await getProjects())
    .filter((p) => p.status !== "paused")
    .slice(0, 3);
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow mono">
              <T zh="精选项目" en="Featured projects" />
            </p>
            <h2 className="h2">
              <T zh="正在做的东西。" en="Things being built." />
            </h2>
          </div>
          <Link href="/projects" className="text-link">
            <T zh="进入项目广场 →" en="Project plaza →" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="empty">
            <T
              zh="第一批项目卡审核中。有想法？"
              en="The first project cards are in review. Got an idea?"
            />{" "}
            <Link href="/projects/new" className="text-link">
              <T zh="提交项目卡" en="Submit one" />
            </Link>
          </p>
        ) : (
          <div className="pgrid">
            {projects.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
