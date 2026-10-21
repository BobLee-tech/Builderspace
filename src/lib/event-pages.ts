// Short copy for event pages, keyed by event slug. The event row (title, the
// one-line summary, time, place, capacity, sign-up deadline) lives in
// Supabase; this is the extra detail ops would otherwise paste into a
// description field. An event without an entry still gets a plain page.
//
// Only what participants should see goes here: no staffing, KPIs or names of
// guests who haven't confirmed.

import type { SeatGroup } from "./types";

type Bi = { zh: string; en: string };

/** Icons the page can draw next to a short line (Phosphor, see page.tsx). */
export type EventIcon =
  | "code"
  | "sparkle"
  | "people"
  | "laptop"
  | "github"
  | "snack"
  | "prompt"
  | "live";

/** A page people open on the day, linked from the event page. */
export type EventTool = {
  href: string;
  /** The address as it's said out loud and printed on the slides. */
  short: string;
  icon: EventIcon;
  title: Bi;
  sub: Bi;
};

export type EventPage = {
  /**
   * The English title: a small line under the Chinese one, and the title
   * itself when the site is in English.
   */
  display: string;
  /** The one-line summary in English (the Chinese one is the event row's). */
  summaryEn: string;
  /** What it costs, shown with the time and place. */
  cost: Bi;
  costNote?: Bi;
  /** One or two words each, shown as tags beside the cost. */
  highlights: Bi[];
  hosts: Bi;
  /** Usernames the address bar in the hero types out, in turn. */
  handles: string[];
  /** Three short promises under the address bar. */
  points: { icon: EventIcon; title: Bi; sub: Bi }[];
  /** What to bring, a few words each. */
  bring: { icon: EventIcon; label: Bi }[];
  /** Pages used on the day, at the top of the event page. */
  tools?: EventTool[];
  /** Ask for a GitHub username on sign-up (a build-along workshop). */
  asksGithub: boolean;
  /**
   * Seat groups that can sign up but aren't advertised: their seats sit on
   * top of the rest, and the head-counts on the site leave them out.
   */
  unlistedSeats?: SeatGroup[];
};

const putYourselfOnline: EventPage = {
  display: "Put yourself online.",
  summaryEn:
    "Bring a laptop, build a personal website with AI and publish it on GitHub Pages.",
  cost: { zh: "免费", en: "Free" },
  costNote: { zh: "有零食和水，不含午饭", en: "Snacks and water; no lunch" },
  highlights: [{ zh: "零基础", en: "No experience needed" }],
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
  tools: [
    {
      href: "/prompt",
      short: "builderspace.dev/prompt",
      icon: "prompt",
      title: { zh: "提示词网站", en: "Prompt builder" },
      sub: {
        zh: "选风格、填信息，复制整段提示词发给 AI，拿到第一版网站。",
        en: "Pick a style, fill in your details and copy the whole prompt for the AI.",
      },
    },
    {
      href: "/live/put-yourself-online",
      short: "builderspace.dev/live",
      icon: "live",
      title: { zh: "现场页", en: "Live page" },
      sub: {
        zh: "签到、最爱的 AI、意向、交网址、秀、反馈：主持人切到哪一步，这一页就换到哪一步。",
        en: "Check-in, favourite AI, next steps, hand-in, show and feedback: it follows the host step by step.",
      },
    },
  ],
  asksGithub: true,
  // USYD students sign up through the partner society; non-students still
  // can here, but the page only shows the 42 UNSW seats.
  unlistedSeats: ["external"],
};

const PAGES: Record<string, EventPage> = {
  "put-yourself-online": putYourselfOnline,
};

export function getEventPage(slug: string): EventPage | null {
  return PAGES[slug] ?? null;
}

/**
 * An event's title and summary in both languages. English comes from the
 * event page; an event without one shows its Chinese row in both.
 */
export function eventCopy(event: {
  slug: string;
  title: string;
  summary: string | null;
}) {
  const page = PAGES[event.slug];
  return {
    title: { zh: event.title, en: page?.display ?? event.title },
    summary:
      event.summary === null
        ? null
        : { zh: event.summary, en: page?.summaryEn ?? event.summary },
  };
}
