import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { getEvents } from "@/lib/data";
import { allEventMaterials, getEventMaterials } from "@/lib/event-materials";
import { eventCopy, getEventPage } from "@/lib/event-pages";
import { getEventResults, worksOnWall } from "@/lib/event-results";
import { formatShortDate } from "@/lib/format";
import { EVENT_KIND_LABEL } from "@/lib/types";
import { titleEms } from "../../events/event-parts";
import { Workbench } from "./workbench";
import "./materials.css";

export function generateStaticParams() {
  return allEventMaterials().map(([slug]) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = (await getEvents()).find((e) => e.slug === slug);
  const m = getEventMaterials(slug);
  if (!event || !m) return {};
  return { title: `${event.title} · 资料包`, description: m.lede.zh };
}

export default async function MaterialsRoute({
  params,
}: PageProps<"/learn/[slug]">) {
  return <Materials slug={(await params).slug} />;
}

/** One event's take-home page: three paths and a kit, all on the client. */
async function Materials({ slug }: { slug: string }) {
  const m = getEventMaterials(slug);
  const event = (await getEvents()).find((e) => e.slug === slug);
  if (!m || !event) notFound();
  const { title } = eventCopy(event);
  const display = getEventPage(slug)?.display;
  const results = getEventResults(slug);
  const works = results ? worksOnWall(results) : 0;

  return (
    <section className="sec first mat">
      <div className="wrap">
        <div className="mat-bar mono">
          <Link href="/learn" className="crumb mono">
            ← <T zh="资源" en="Resources" />
          </Link>
          <span className="mat-rule" aria-hidden />
          <span className="mute">
            {EVENT_KIND_LABEL[event.kind].en} ·{" "}
            {formatShortDate(event.startsAt)} · SYD
          </span>
        </div>

        <Workbench
          slug={slug}
          m={m}
          head={
            <>
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
                  className="mat-title"
                  style={{ "--ems": titleEms(title[l]) } as React.CSSProperties}
                >
                  {title[l]}
                </h1>
              ))}
              {display && (
                <p data-l="zh" className="mat-en mono mute">
                  {display}
                </p>
              )}
            </>
          }
          wall={
            works > 0 && (
              <Link href={`/events/${slug}#results`} className="mat-wall">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG art */}
                <img src="/mascots/kiko.svg" alt="" />
                <span>
                  <b>
                    <T
                      zh={`看看大家做的 ${works} 个网站`}
                      en={`See the ${works} sites people made`}
                    />
                  </b>
                  <span className="mute">
                    <T
                      zh="做好了想上墙？跟我们说一声。"
                      en="Made yours? Tell us and it goes up."
                    />
                  </span>
                </span>
                <ArrowRight weight="light" size={22} aria-hidden />
              </Link>
            )
          }
        />

        <div style={{ marginTop: 32 }}>
          <SampleNotice />
        </div>
      </div>
    </section>
  );
}
