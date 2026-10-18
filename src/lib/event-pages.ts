// Short copy for event detail pages, keyed by event slug. The event row
// (time, place, capacity, sign-up deadline) lives in Supabase; this is the
// intro ops would otherwise paste into a description field. An event without
// an entry still gets a plain detail page.
//
// Only what participants should see goes here: no staffing, KPIs or names of
// guests who haven't confirmed.

type Bi = { zh: string; en: string };

export type EventPage = {
  /** The one-line promise under the title. */
  lede: Bi;
  highlights: Bi[];
  hosts: Bi;
  /** How the session runs, in order: a time, a word and one line each. */
  steps: { at: string; name: Bi; body: Bi }[];
  /** What to bring or do beforehand. */
  bring: Bi[];
  /** Ask for a GitHub username on sign-up (a build-along workshop). */
  asksGithub: boolean;
};

const putYourselfOnline: EventPage = {
  lede: {
    zh: "零基础也能做。带上电脑，用 AI 做一个个人网站并发布上线，离场时带走自己的「用户名.github.io」和一桌新朋友。",
    en: "No experience needed. Bring a laptop, build a personal site with AI and put it online. You leave with your own username.github.io and a table of new friends.",
  },
  highlights: [
    { zh: "免费", en: "Free" },
    { zh: "不用会写代码", en: "No coding needed" },
  ],
  hosts: {
    zh: "主办 BuilderSpace（UNSW）· 协办 悉大合作社团",
    en: "Hosted by BuilderSpace (UNSW) with a University of Sydney partner society",
  },
  steps: [
    {
      at: "10:00",
      name: { zh: "聊", en: "Talk" },
      body: {
        zh: "按主题选桌，听嘉宾分享，和同桌聊出你想要的网站。",
        en: "Pick a table by topic, hear a guest talk, and work out the site you want.",
      },
    },
    {
      at: "10:40",
      name: { zh: "学", en: "Learn" },
      body: {
        zh: "做网站的五关：想清楚、生成、改、上线、更新。",
        en: "Five levels of making a site: decide, generate, refine, ship, update.",
      },
    },
    {
      at: "10:55",
      name: { zh: "做", en: "Make" },
      body: {
        zh: "用 AI 生成、改到满意，全场一起部署到 GitHub Pages。",
        en: "Generate it with AI, refine it, then deploy to GitHub Pages together.",
      },
    },
    {
      at: "12:40",
      name: { zh: "秀", en: "Show" },
      body: {
        zh: "成果墙投屏，上台讲 2 分钟，合影收尾。",
        en: "Results wall on screen, two-minute show and tell, group photo.",
      },
    },
  ],
  bring: [
    { zh: "电脑和充电器", en: "A laptop and charger" },
    {
      zh: "一个验证过邮箱的 GitHub 账号，用户名就是你的网址",
      en: "A GitHub account with a verified email: your username becomes your address",
    },
    {
      zh: "不含午饭，中间有零食和水",
      en: "No lunch; snacks and water at the break",
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
