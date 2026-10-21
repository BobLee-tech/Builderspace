// The live page of an event: one QR code (builderspace.dev/live) for the whole
// session. The host switches the current step at /live/<slug>/host and every
// phone follows: check in → poll → what you'd like to do next (after the
// guest's talk) → hand in your site and like others' → show → feedback. The
// database side is 20261021000000_event_live.sql and
// 20261021010000_event_live_intent.sql; the step names here must match their
// checks.

import { z } from "zod";
import { withScheme } from "./forms";

type Bi = { zh: string; en: string };

export const LIVE_STEPS = [
  "wait",
  "checkin",
  "poll",
  "link",
  "show",
  "intent",
  "feedback",
] as const;
export type LiveStep = (typeof LIVE_STEPS)[number];

/** Steps that store an answer (one per person, a new one replaces the old). */
export const ANSWER_STEPS = ["poll", "link", "intent", "feedback"] as const;
export type AnswerStep = (typeof ANSWER_STEPS)[number];

export type LiveStepCopy = {
  /** A word or two for the host's buttons and the phone's history. */
  label: Bi;
  /** The question on the phone and the headline on the screen. */
  title: Bi;
  hint?: Bi;
  /** Rough time in the run sheet, shown to the host. */
  at?: string;
};

export type PollOption = {
  key: string;
  label: string;
  /** Who makes it, in small type under the name. */
  maker?: string;
  /** A square picture in /public (the characters from the slides). */
  image?: string;
};

export type LiveConfig = {
  /** The order the host walks through; "wait" is always there too. */
  steps: LiveStep[];
  copy: Record<LiveStep, LiveStepCopy>;
  poll: { options: PollOption[] } | null;
};

const DEFAULT_COPY: Record<LiveStep, LiveStepCopy> = {
  wait: {
    label: { zh: "讲解中", en: "Follow along" },
    title: { zh: "跟着主讲一起做", en: "Follow along with the host" },
    hint: {
      zh: "到下一个环节，这一页会自己换，不用刷新。",
      en: "This page changes by itself at the next step.",
    },
  },
  checkin: {
    label: { zh: "签到", en: "Check in" },
    title: { zh: "到了？扫码签到", en: "Here? Scan to check in" },
  },
  poll: {
    label: { zh: "投票", en: "Poll" },
    title: { zh: "投一票", en: "Cast your vote" },
  },
  link: {
    label: { zh: "交网址", en: "Hand in" },
    title: { zh: "上线了，让大家看看", en: "Live? Let everyone see it" },
    hint: {
      zh: "交上来的网站会在大屏轮播，大家可以点开给你点赞。",
      en: "Sites go up on the big screen; everyone can open and like them.",
    },
  },
  show: {
    label: { zh: "秀", en: "Show" },
    title: {
      zh: "看大屏，给喜欢的网站点赞",
      en: "Watch, and like your favourites",
    },
  },
  intent: {
    label: { zh: "意向", en: "Next steps" },
    title: {
      zh: "接下来，想和我们一起做点什么？",
      en: "What would you like to do next with us?",
    },
    hint: {
      zh: "可以多选。联系方式只有工作人员看得到，只用来联系你。",
      en: "Pick any. Only the organisers see your contact, and only to reach you.",
    },
  },
  feedback: {
    label: { zh: "反馈", en: "Feedback" },
    title: {
      zh: "反馈：这场散幕，而未来刚刚开始",
      en: "Feedback: this one wraps up, the future is just starting",
    },
  },
};

const DEFAULT_CONFIG: LiveConfig = {
  steps: ["checkin", "link", "show", "feedback"],
  copy: DEFAULT_COPY,
  poll: null,
};

const CONFIGS: Record<string, LiveConfig> = {
  // 10/22 首场 Workshop：聊 → 嘉宾分享后收意向 → 边讲边做 → 秀。
  "put-yourself-online": {
    steps: ["checkin", "poll", "intent", "link", "show", "feedback"],
    copy: {
      ...DEFAULT_COPY,
      checkin: { ...DEFAULT_COPY.checkin, at: "10:00" },
      poll: {
        label: { zh: "最爱的 AI", en: "Favourite AI" },
        title: { zh: "你最爱用哪个 AI？", en: "Which AI do you use most?" },
        hint: {
          zh: "选一个，再说说最喜欢它的一点和最难受的一点（选填，会上大屏）。",
          en: "Pick one, then what you love and what drives you mad about it (optional, goes on the big screen).",
        },
        at: "10:15",
      },
      link: { ...DEFAULT_COPY.link, at: "12:15" },
      show: { ...DEFAULT_COPY.show, at: "12:30" },
      feedback: { ...DEFAULT_COPY.feedback, at: "12:45" },
    },
    poll: {
      // The slide's AIs (without Echoagent), with its characters.
      options: [
        {
          key: "deepseek",
          label: "DeepSeek",
          maker: "深度求索",
          image: "/live/ai/deepseek.jpg",
        },
        {
          key: "claude",
          label: "Claude",
          maker: "Anthropic",
          image: "/live/ai/claude.jpg",
        },
        {
          key: "chatgpt",
          label: "ChatGPT",
          maker: "OpenAI",
          image: "/live/ai/chatgpt.jpg",
        },
        {
          key: "gemini",
          label: "Gemini",
          maker: "Google",
          image: "/live/ai/gemini.jpg",
        },
        {
          key: "kimi",
          label: "Kimi",
          maker: "月之暗面",
          image: "/live/ai/kimi.jpg",
        },
        {
          key: "grok",
          label: "Grok",
          maker: "xAI",
          image: "/live/ai/grok.jpg",
        },
        {
          key: "doubao",
          label: "Doubao",
          maker: "字节跳动",
          image: "/live/ai/doubao.jpg",
        },
        { key: "other", label: "其他", maker: "Other" },
      ],
    },
  },
};

export function liveConfig(slug: string): LiveConfig {
  return CONFIGS[slug] ?? DEFAULT_CONFIG;
}

export const isLiveStep = (v: unknown): v is LiveStep =>
  typeof v === "string" && (LIVE_STEPS as readonly string[]).includes(v);

// ---------- what people hand in ----------

export const FRIENDS = ["0", "1-2", "3-5", "6+"] as const;

/** What someone would like to do next, asked after the guest's talk. */
export const INTENTS = ["join", "build", "core", "guest"] as const;
export type Intent = (typeof INTENTS)[number];
export const INTENT_LABELS: Record<Intent, Bi> = {
  join: {
    zh: "加入 BuilderSpace，来以后的活动",
    en: "Join BuilderSpace and come to future events",
  },
  build: {
    zh: "有项目或创业想法，想找人一起做",
    en: "I have a project or startup idea and want people to build it with",
  },
  core: {
    zh: "加入核心团队，一起办活动",
    en: "Join the core team and help run events",
  },
  guest: {
    zh: "想和今天的嘉宾再聊聊",
    en: "Talk more with today's guest",
  },
};

/** The face under each score, 1 to 5. */
export const RATING_EMOJI = ["😇", "😭", "😌", "😎", "🥳"] as const;

const note = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `最多 ${max} 个字|At most ${max} characters`)
    .optional()
    .transform((v) => v || undefined);

export const pollSchema = z.object({
  choice: z.string().regex(/^[a-z0-9-]{1,20}$/, "选一个|Pick one"),
  like: note(30),
  pain: note(30),
});
export type PollAnswer = z.infer<typeof pollSchema>;

export const feedbackSchema = z.object({
  rating: z.coerce
    .number({ error: "打个分|Give a score" })
    .int()
    .min(1, "打个分|Give a score")
    .max(5),
  friends: z.enum(FRIENDS, { error: "选一项|Pick one" }),
  good: note(120),
  bad: note(120),
});
export type FeedbackAnswer = z.infer<typeof feedbackSchema>;

export const intentSchema = z.object({
  wants: z
    .array(z.enum(INTENTS, { error: "选一项|Pick one" }))
    .min(1, "至少选一项|Pick at least one")
    .max(INTENTS.length)
    .transform((v) => INTENTS.filter((i) => v.includes(i))),
  idea: note(120),
  contact: z
    .string()
    .trim()
    .min(1, "留个微信号或邮箱|Leave a WeChat ID or email")
    .max(80, "最多 80 个字|At most 80 characters"),
});
export type IntentAnswer = z.infer<typeof intentSchema>;

/** live: opens. pending: GitHub Pages hasn't built yet (404 on *.github.io).
 * down: a 404 anywhere else. unchecked: a host we don't fetch, or no answer. */
export type LinkCheck = "live" | "pending" | "down" | "unchecked";

export type LinkAnswer = {
  url: string;
  host: string;
  kind: "pages" | "other";
  check: LinkCheck;
  title?: string;
  checkedAt: string;
};

// ---------- site links ----------

/** Hosts we fetch to see whether the site is up. Everything else is accepted
 * but never fetched, so the check can't be pointed at an internal address. */
const CHECKED_SUFFIXES = [
  ".github.io",
  ".vercel.app",
  ".netlify.app",
  ".pages.dev",
  ".lovable.app",
  ".echoagent.dev",
];
const CHECKED_HOSTS = ["echoagent.dev", "claude.ai", "claude.site"];

export function isCheckedHost(host: string) {
  return (
    CHECKED_HOSTS.includes(host) ||
    CHECKED_SUFFIXES.some((s) => host.endsWith(s) && host.length > s.length)
  );
}

export type SiteLink = {
  url: string;
  host: string;
  kind: "pages" | "other";
  /** The user in `<user>.github.io`. */
  githubUser: string | null;
};

/**
 * A link someone typed, tidied: https added, the fragment and a lone trailing
 * slash dropped. Null when it isn't a public web address.
 */
export function parseSiteLink(input: string): SiteLink | null {
  const raw = withScheme(input.trim());
  if (!raw || raw.length > 300) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase();
  if (
    !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ||
    /^[0-9.]+$/.test(host) ||
    host.endsWith(".local") ||
    host.endsWith(".localhost")
  ) {
    return null;
  }
  // Every host we check serves https, and GitHub Pages redirects to it.
  if (isCheckedHost(host)) u.protocol = "https:";
  u.hash = "";
  const path = u.pathname === "/" ? "" : u.pathname;
  const url = `${u.protocol}//${host}${path}${u.search}`;
  const pages = /^([a-z0-9-]+)\.github\.io$/.exec(host);
  return {
    url,
    host,
    kind: pages ? "pages" : "other",
    githubUser: pages ? pages[1] : null,
  };
}

/** A page's <title>, entities decoded, at most 60 characters. */
export function titleFromHtml(html: string): string | undefined {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  if (!m) return undefined;
  const text = m[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 60) : undefined;
}

/** The address shown on cards: no scheme, no trailing slash. */
export const shortUrl = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "");

// ---------- state the pages read ----------

export type WallItem = {
  id: string;
  name: string;
  url: string;
  host: string;
  kind: "pages" | "other";
  check: LinkCheck;
  title: string | null;
  hearts: number;
};

export type LiveState = {
  step: LiveStep | null;
  spotlight: string | null;
  checkedIn: number;
  poll: Record<string, number>;
  pollNotes: { choice: string; like: string | null; pain: string | null }[];
  links: { total: number; live: number; pending: number; pages: number };
  wall: WallItem[];
  feedback: {
    n: number;
    avg: number | null;
    friends: Record<(typeof FRIENDS)[number], number>;
  };
};

export type LiveAnswer<T> = {
  id: string;
  payload: T;
  onWall: boolean;
  hidden: boolean;
};

export type LiveMe = {
  name: string;
  github: string | null;
  responses: {
    poll?: LiveAnswer<PollAnswer>;
    link?: LiveAnswer<LinkAnswer>;
    intent?: LiveAnswer<IntentAnswer>;
    feedback?: LiveAnswer<FeedbackAnswer>;
  };
  hearted: string[];
  received: { hearts: number; notes: string[] };
};

export type HostResponse = {
  id: string;
  step: AnswerStep;
  name: string;
  github: string | null;
  payload: Record<string, unknown>;
  onWall: boolean;
  hidden: boolean;
  hearts: number;
  at: string;
};

export type HostState = {
  step: LiveStep | null;
  spotlight: string | null;
  registered: number;
  checkedIn: number;
  walkIns: number;
  responses: HostResponse[];
};

export const EMPTY_STATE: LiveState = {
  step: null,
  spotlight: null,
  checkedIn: 0,
  poll: {},
  pollNotes: [],
  links: { total: 0, live: 0, pending: 0, pages: 0 },
  wall: [],
  feedback: {
    n: 0,
    avg: null,
    friends: { "0": 0, "1-2": 0, "3-5": 0, "6+": 0 },
  },
};

/** Where builderspace.dev/live sends a phone. */
export const LIVE_SHORT_URL = "builderspace.dev/live";
/** The cookie that says who this device is (a random token; the database
 * keeps only its sha256). */
export const LIVE_COOKIE = "bs-live";
