import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarBlank,
  ChatText,
  Code,
  DownloadSimple,
  GithubLogo,
  Lifebuoy,
  LinkSimple,
  ListNumbers,
  MapPin,
  Plus,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { getEvents } from "@/lib/data";
import {
  allEventMaterials,
  getEventMaterials,
  type MaterialIcon,
} from "@/lib/event-materials";
import { eventCopy, getEventPage } from "@/lib/event-pages";
import { getEventResults } from "@/lib/event-results";
import { formatDate, formatShortDate, formatTimeRange } from "@/lib/format";
import { EVENT_KIND_LABEL } from "@/lib/types";
import { titleEms } from "../../events/event-parts";
import { EventResultsSection } from "../../events/[slug]/results";
import { DeployPrompt } from "./deploy-prompt";
import "../../events/[slug]/event.css";
import "./materials.css";

const ICONS: Record<MaterialIcon, Icon> = {
  calendar: CalendarBlank,
  pin: MapPin,
  link: LinkSimple,
  sparkle: Sparkle,
  prompt: ChatText,
  list: ListNumbers,
  code: Code,
  lifebuoy: Lifebuoy,
  github: GithubLogo,
  download: DownloadSimple,
};

export function generateStaticParams() {
  return allEventMaterials().map(([slug]) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = (await getEvents()).find((e) => e.slug === slug);
  if (!event || !getEventMaterials(slug)) return {};
  return {
    title: `${event.title} · 资料包`,
    description: getEventMaterials(slug)?.lede.zh,
  };
}

export default async function MaterialsRoute({
  params,
}: PageProps<"/learn/[slug]">) {
  return <Materials slug={(await params).slug} />;
}

/** One event's take-home page: the day's steps, prompt and the wall. */
async function Materials({ slug }: { slug: string }) {
  const m = getEventMaterials(slug);
  const event = (await getEvents()).find((e) => e.slug === slug);
  if (!m || !event) notFound();
  const { title } = eventCopy(event);
  const display = getEventPage(slug)?.display;
  const results = getEventResults(slug);

  return (
    <section className="sec first evp mat">
      <div className="wrap">
        <div className="evp-bar mono">
          <Link href="/learn" className="crumb mono">
            ← <T zh="资源" en="Resources" />
          </Link>
          <span className="evp-rule" aria-hidden />
          <span className="mute">
            {EVENT_KIND_LABEL[event.kind].en} ·{" "}
            {formatShortDate(event.startsAt)} · SYD
          </span>
        </div>

        <div className="evp-grid">
          <header className="evp-intro">
            <div className="need">
              <span className="tag fill">
                <T zh="资料包" en="Materials" />
              </span>
              <span className="tag">
                <T {...EVENT_KIND_LABEL[event.kind]} />
              </span>
            </div>
            {(["zh", "en"] as const).map((l) => (
              <h1
                key={l}
                data-l={l}
                lang={l === "en" ? "en" : undefined}
                className="evp-title"
                style={{ "--ems": titleEms(title[l]) } as React.CSSProperties}
              >
                {title[l]}
              </h1>
            ))}
            {display && (
              <p data-l="zh" className="evp-en mono mute">
                {display}
              </p>
            )}
            <p className="evp-lede">
              <T {...m.lede} />
            </p>

            <dl className="evp-kv">
              <div>
                <CalendarBlank weight="light" size={18} aria-hidden />
                <dt className="mono mute">
                  <T zh="时间" en="When" />
                </dt>
                <dd>
                  {formatDate(event.startsAt)}
                  <small className="mute">
                    {formatTimeRange(event.startsAt, event.endsAt)}
                  </small>
                </dd>
              </div>
              <div>
                <MapPin weight="light" size={18} aria-hidden />
                <dt className="mono mute">
                  <T zh="地点" en="Where" />
                </dt>
                <dd>{event.location}</dd>
              </div>
              {m.facts.map((f) => {
                const Glyph = ICONS[f.icon];
                return (
                  <div key={f.k.en}>
                    <Glyph weight="light" size={18} aria-hidden />
                    <dt className="mono mute">
                      <T {...f.k} />
                    </dt>
                    <dd>
                      <T {...f.v} />
                      {f.sub && (
                        <small className="mute">
                          <T {...f.sub} />
                        </small>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </header>

          <aside className="evp-side">
            <div className="evp-panel surf">
              <h2 className="evp-h2">Take it home.</h2>
              <ul className="mat-pack">
                {m.pack.map((p) => {
                  const Glyph = ICONS[p.icon];
                  return (
                    <li key={p.title.en}>
                      <a href={p.href}>
                        <Glyph weight="light" size={18} aria-hidden />
                        <b>
                          <T {...p.title} />
                        </b>
                        <span className="mono mute">
                          <T {...p.meta} />
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
              <a
                href={m.zip}
                download
                className="btn solid primary mat-download"
              >
                <T zh="下载资料包" en="Download the pack" />
                <DownloadSimple weight="light" size="1.15em" aria-hidden />
              </a>
              <div className="mat-foot">
                <a href="/prompt">
                  <span className="mono">/prompt</span>
                  <T zh="提示词工具" en="Prompt tool" />
                </a>
                <Link href={`/events/${slug}`}>
                  <span className="mono">
                    <T zh="活动页" en="Event" />
                  </span>
                  <T zh="当天的介绍" en="What it was" />
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {results && <EventResultsSection results={results} />}

        <div className="evp-sec">
          <h2 className="evp-sec-h mono mute">
            <T zh="当天用到" en="On the day" />
          </h2>
          <ul className="evp-tools mat-tools">
            {m.tools.map((tool) => {
              const Glyph = ICONS[tool.icon];
              return (
                <li key={tool.href}>
                  {/* A plain link: /prompt is a static file, not a route. */}
                  <a
                    href={tool.href}
                    className="evp-tool"
                    {...(tool.external
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    <Glyph weight="light" size={22} aria-hidden />
                    <b>
                      <T {...tool.title} />
                    </b>
                    <span className="mute">
                      <T {...tool.sub} />
                    </span>
                    <span className="mono evp-tool-url">
                      {tool.short}
                      <ArrowRight weight="light" size={16} aria-hidden />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="evp-sec" id="steps">
          <h2 className="evp-sec-h mono mute">
            <T zh="做网站的五步" en="Five steps" />
          </h2>
          <ol className="mat-steps">
            {m.steps.map((s, i) => {
              const head = (
                <>
                  <span className="mat-n">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <b>
                    <T {...s.title} />
                  </b>
                  <span className="mute">
                    <T {...s.sub} />
                  </span>
                </>
              );
              return (
                <li key={s.title.en}>
                  {i === m.deployStep ? (
                    <details id="deploy" open>
                      <summary className="mat-step">
                        {head}
                        <Plus
                          weight="light"
                          size={18}
                          className="mat-plus"
                          aria-hidden
                        />
                      </summary>
                      <div className="mat-deploy">
                        <DeployPrompt {...m.deployPrompt} />
                        <p className="mute">
                          <T {...m.fallback} />
                        </p>
                      </div>
                    </details>
                  ) : (
                    <div className="mat-step">{head}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div style={{ marginTop: 32 }}>
          <SampleNotice />
        </div>
      </div>
    </section>
  );
}
