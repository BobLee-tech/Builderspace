import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { ProjectCard } from "@/components/project-card";
import { SampleNotice } from "@/components/sample-notice";
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
        <div className="wrap">
          <div className="hero-meta mono mute">
            <span className="live">Cycle 01 组队报名中</span>
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
              带着想法来，<b>两小时</b>做出第一个能用的页面。
              <br />
              <span className="mute" style={{ fontSize: "0.7em" }}>
                一个从 UNSW 起步的中英双语创客社团：学 Vibe
                Coding、找队友、每周一起把项目做出来。
              </span>
            </p>
            <div className="hero-cta">
              <Link href="/join" className="btn solid">
                加入 BuilderSpace <span className="arr">→</span>
              </Link>
              <Link href="/projects" className="btn ghost">
                看项目广场
              </Link>
            </div>
          </div>
        </div>
      </section>

      <NextEventSection />

      <section className="sec">
        <div className="wrap">
          <p className="eyebrow mono">为什么来这里</p>
          <h2 className="h2" style={{ marginBottom: 40 }}>
            做项目这件事，
            <br />
            <span className="dim">一个人很容易半途而废。</span>
          </h2>
          <div className="pillars">
            <div className="pillar">
              <span className="glyph">中/EN</span>
              <h3>用中文也能问</h3>
              <p className="mute">
                讲解和答疑用中文，README、Demo 和 pitch
                用英文。作品能直接放进简历和 LinkedIn。
              </p>
            </div>
            <div className="pillar">
              <span className="glyph">[WED]</span>
              <h3>每周固定见面</h3>
              <p className="mute">
                Build Night
                每周同一时间、同一地点。线上先抛问题，线下一起写代码，进度不再靠自觉。
              </p>
            </div>
            <div className="pillar">
              <span className="glyph">→ DEMO</span>
              <h3>做出来有地方展示</h3>
              <p className="mute">
                每个周期以 Demo Night
                收尾，项目卡长期挂在项目广场，愿意的话推荐给 UNSW Founders
                或整理成作品集。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <p className="eyebrow mono">Build Cycle 01 · W3 – W6</p>
          <h2 className="h2" style={{ marginBottom: 48 }}>
            4–6 周，
            <span className="dim">从一个想法到一次演示。</span>
          </h2>
          <div className="cycle">
            <div className="cycle-rail" aria-hidden />
            {CYCLE.map((step, i) => (
              <div className="step" key={step.title}>
                <div className="node">{String(i + 1).padStart(2, "0")}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
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

const CYCLE = [
  {
    title: "组队 Pitch",
    body: "每人 90 秒讲想法，现场按“缺的角色”配对。",
    when: "W3",
  },
  {
    title: "每周 Build Night",
    body: "线上周一抛问题，线下周三一起写。每两周在项目卡上更新一次进展。",
    when: "W3 – W6",
  },
  {
    title: "中期检查",
    body: "跑通一个核心流程，卡住的项目一对一回访。",
    when: "W4",
  },
  {
    title: "Demo Night",
    body: "3 分钟英文演示 + 现场试用 + 同伴反馈。",
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
            <p className="eyebrow mono">下一场活动 / Next up</p>
            <h2 className="h2">{next ? next.title : "下一场活动筹备中。"}</h2>
          </div>
          <Link href="/events" className="text-link">
            全部活动 →
          </Link>
        </div>
        {next && (
          <div className="next">
            <div className="next-l">
              <div className="need">
                <span className="tag fill">{EVENT_KIND_LABEL[next.kind]}</span>
                <SampleNotice />
              </div>
              {next.summary && <p className="lede">{next.summary}</p>}
              <div className="kv">
                <div>
                  <span className="mono mute">日期</span>
                  <b>{formatDate(next.startsAt)}</b>
                </div>
                <div>
                  <span className="mono mute">时间</span>
                  <b>{formatTimeRange(next.startsAt, next.endsAt)}</b>
                </div>
                <div>
                  <span className="mono mute">地点</span>
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
                    报名 ↗
                  </a>
                ) : (
                  <span className="mono mute">报名链接即将发布</span>
                )}
                {next.capacity && (
                  <span className="mono mute">限 {next.capacity} 人</span>
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
        <p className="eyebrow mono">公开数据 · 每两周更新</p>
        <h2 className="h2" style={{ marginBottom: 40 }}>
          我们只看一个数：
          <br />
          <span className="dim">有多少项目在动。</span>
        </h2>
        <div className="metrics">
          <div className="metric star">
            <span className="mono mute">北极星 · 双周活跃项目</span>
            <span className="big">
              {active ?? "—"}
              <sup>/ {ACTIVE_PROJECT_TARGET}</sup>
            </span>
            <p className="mute">
              过去 14 天有代码提交、Demo 或更新帖的成员项目
            </p>
          </div>
          <div className="metric">
            <span className="mono mute">本学期目标</span>
            <span className="big">150</span>
            <p className="mute">群成员</p>
          </div>
          <div className="metric">
            <span className="mono mute">本学期目标</span>
            <span className="big">60</span>
            <p className="mute">到场成员</p>
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
            <p className="eyebrow mono">精选项目</p>
            <h2 className="h2">正在做的东西。</h2>
          </div>
          <Link href="/projects" className="text-link">
            进入项目广场 →
          </Link>
        </div>
        <div className="pgrid">
          {projects.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
