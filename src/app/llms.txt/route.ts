import { cacheLife } from "next/cache";
import { pitchText } from "@/components/project-card";
import { eventCopy, eventWhere } from "@/lib/event-pages";
import { allEventMaterials } from "@/lib/event-materials";
import { getEvents, getProjects } from "@/lib/data";
import { FAQ, faqAnswer, NOT_BUILDSPACE } from "@/lib/faq";
import { formatIsoDay, formatTimeRange } from "@/lib/format";
import { bi, PUBLIC_PAGES, SITE_DESCRIPTION } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { clip, PITCH_MAX } from "@/lib/text-length";

// A plain-text map of the site for AI tools (llmstxt.org): what the club is,
// the answers on /about, and links to every public page worth citing.

/** Each item is one line, so line breaks in members' text become spaces. */
const flat = (text: string) => text.replace(/\s+/g, " ").trim();

async function llmsTxt() {
  "use cache";
  cacheLife("hours");
  const [events, projects] = await Promise.all([getEvents(), getProjects()]);
  const materials = new Set(allEventMaterials().map(([slug]) => slug));
  const link = (name: string, path: string, note?: string | null) =>
    `- [${name}](${siteUrl}${path})${note ? `: ${note}` : ""}`;

  return [
    "# BuilderSpace",
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    NOT_BUILDSPACE.en,
    "",
    ...(isSupabaseConfigured()
      ? []
      : ["Sample data: the events and projects below are placeholders.", ""]),
    "## About",
    "",
    ...FAQ.flatMap(({ q, a }) => [
      `- ${q.en} ${faqAnswer(a, "en")}`,
      `  ${q.zh} ${faqAnswer(a, "zh")}`,
    ]),
    "",
    "## Pages",
    "",
    ...PUBLIC_PAGES.map(({ path, name, note }) => link(name, path, note)),
    "",
    "## Events",
    "",
    ...events.flatMap((e) => {
      const { title, summary } = eventCopy(e);
      const when = e.dateTbc
        ? `Date to be confirmed (Sydney), ${eventWhere(e).en}`
        : `${formatIsoDay(e.startsAt)} ${formatTimeRange(e.startsAt, e.endsAt)} (Sydney), ${e.location}`;
      return [
        link(bi(title.zh, title.en), `/events/${e.slug}`, when),
        ...(summary ? [`  ${flat(summary.en)}`] : []),
        ...(materials.has(e.slug)
          ? [`  ${link("资料包 Materials", `/learn/${e.slug}`)}`]
          : []),
      ];
    }),
    "",
    "## Projects",
    "",
    ...projects.map((p) => {
      // The card's line; an old project's whole intro is cut like its page's
      // description, to about two pitches a side.
      const line = pitchText(p);
      const [zh, en] = [line.zh, line.en].map(
        (t) => t && clip(flat(t), PITCH_MAX * 2),
      );
      const note = [zh, en !== zh && en].filter(Boolean).join(" / ");
      return link(bi(p.name, p.en?.name), `/projects/${p.slug}`, note);
    }),
    "",
  ].join("\n");
}

export async function GET() {
  return new Response(await llmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
