import { cacheLife } from "next/cache";
import { eventCopy } from "@/lib/event-pages";
import { allEventMaterials } from "@/lib/event-materials";
import { getEvents, getProjects } from "@/lib/data";
import { FAQ, faqAnswer } from "@/lib/faq";
import { formatIsoDay, formatTimeRange } from "@/lib/format";
import { bi, SITE_DESCRIPTION } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

// A plain-text map of the site for AI tools (llmstxt.org): what the club is,
// the answers on /about, and links to every public page worth citing.

const PAGES = [
  ["/about", "关于 About", "Questions people ask about the club"],
  ["/events", "活动 Events", "Workshops, build nights and demo nights"],
  ["/projects", "项目广场 Projects", "What members are building"],
  ["/learn", "资源 Resources", "Workshop kits and tutorials"],
  ["/people", "成员 People", "Members and the core team"],
  ["/join", "加入 Join", "Join free in about a minute"],
  ["/core-team", "核心成员申请 Core team", "Help run the club"],
];

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
    "BuilderSpace is not related to buildspace (buildspace.so) or Builder.io.",
    "",
    "## About",
    "",
    ...FAQ.flatMap(({ q, a }) => [
      `- ${q.en} ${faqAnswer(a, "en")}`,
      `  ${q.zh} ${faqAnswer(a, "zh")}`,
    ]),
    "",
    "## Pages",
    "",
    ...PAGES.map(([path, name, note]) => link(name, path, note)),
    "",
    "## Events",
    "",
    ...events.flatMap((e) => {
      const { title, summary } = eventCopy(e);
      const when = `${formatIsoDay(e.startsAt)} ${formatTimeRange(e.startsAt, e.endsAt)} (Sydney), ${e.location}`;
      return [
        link(bi(title.zh, title.en), `/events/${e.slug}`, when),
        ...(summary ? [`  ${summary.en}`] : []),
        ...(materials.has(e.slug)
          ? [`  ${link("资料包 Materials", `/learn/${e.slug}`)}`]
          : []),
      ];
    }),
    "",
    "## Projects",
    "",
    ...projects.map((p) => {
      const pitch = p.pitch ?? p.problem;
      const en = p.en?.pitch ?? p.en?.problem;
      const note = [pitch, en !== pitch && en].filter(Boolean).join(" / ");
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
