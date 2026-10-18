// Short copy for event detail pages, keyed by event slug. The event row
// (time, place, capacity, sign-up deadline) lives in Supabase; this is the
// intro ops would otherwise paste into a description field. An event without
// an entry still gets a plain detail page.
//
// Only what participants should see goes here: no staffing, KPIs or names of
// guests who haven't confirmed.

type Bi = { zh: string; en: string };

/** Icons the page can draw next to a short line (Phosphor, see page.tsx). */
export type EventIcon =
  "code" | "sparkle" | "people" | "laptop" | "github" | "snack";

export type EventPage = {
  /**
   * The English display title, chrome line then outlined line, like the page
   * titles; the Chinese title runs above it in mono.
   */
  display: [string, string];
  /** For search results and link previews; the page itself shows `points`. */
  summary: Bi;
  highlights: Bi[];
  hosts: Bi;
  /** Usernames the address bar in the hero types out, in turn. */
  handles: string[];
  /** Three short promises under the address bar. */
  points: { icon: EventIcon; title: Bi; sub: Bi }[];
  /** What to bring, a few words each. */
  bring: { icon: EventIcon; label: Bi }[];
  /** Ask for a GitHub username on sign-up (a build-along workshop). */
  asksGithub: boolean;
};

const putYourselfOnline: EventPage = {
  display: ["Put yourself", "online."],
  summary: {
    zh: "零基础也能做：带上电脑，用 AI 做一个个人网站并发布到 GitHub Pages，离场时带走自己的网址和一桌新朋友。",
    en: "No experience needed: bring a laptop, build a personal site with AI and publish it on GitHub Pages. Leave with your own address and a table of new friends.",
  },
  highlights: [
    { zh: "免费", en: "Free" },
    { zh: "3 小时", en: "3 hours" },
  ],
  hosts: {
    zh: "主办 BuilderSpace（UNSW）· 协办 悉大合作社团",
    en: "Hosted by BuilderSpace (UNSW) with a University of Sydney partner society",
  },
  handles: ["yuki", "alex-chen", "mia-design", "your-name"],
  points: [
    {
      icon: "code",
      title: { zh: "零基础", en: "Zero experience" },
      sub: { zh: "不用会写代码", en: "No coding needed" },
    },
    {
      icon: "sparkle",
      title: { zh: "AI 做网站", en: "Built with AI" },
      sub: { zh: "生成、修改、上线", en: "Generate, refine, ship" },
    },
    {
      icon: "people",
      title: { zh: "一桌新朋友", en: "New friends" },
      sub: { zh: "按主题坐，一起做", en: "Sit by topic, build together" },
    },
  ],
  bring: [
    { icon: "laptop", label: { zh: "电脑和充电器", en: "Laptop and charger" } },
    {
      icon: "github",
      label: {
        zh: "GitHub 账号（已验证邮箱）",
        en: "GitHub account (email verified)",
      },
    },
    {
      icon: "snack",
      label: { zh: "不含午饭，有零食和水", en: "No lunch; snacks and water" },
    },
  ],
  asksGithub: true,
};

const PAGES: Record<string, EventPage> = {
  "put-yourself-online": putYourselfOnline,
};

export function getEventPage(slug: string): EventPage | null {
  return PAGES[slug] ?? null;
}
