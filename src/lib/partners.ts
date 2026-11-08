// Partners who helped the club, credited the way they agreed to: the wall in
// the home page's Partners section and "Supported by" on the event pages
// they helped with. docs/partners.md is the checklist for adding one.
//
// Only partners who confirmed go here, never "in talks". Logos are the
// partner's own colour version for dark backgrounds (SVG, or a transparent
// PNG), in public/partners/, never recoloured or stretched; `tint` is their
// brand colour, used for the glow.

type Bi = { zh: string; en: string };

export const PARTNER_ROLES = [
  "venue",
  "credits",
  "speaker",
  "cohost",
  "supplies",
] as const;
export type PartnerRole = (typeof PARTNER_ROLES)[number];

export const ROLE_LABEL: Record<PartnerRole, Bi> = {
  venue: { zh: "场地", en: "Venue" },
  credits: { zh: "工具额度", en: "Credits" },
  speaker: { zh: "嘉宾", en: "Speaker" },
  cohost: { zh: "联合主办", en: "Co-host" },
  supplies: { zh: "物料", en: "Supplies" },
};

/**
 * The short intro that opens from the partner's tile: facts only, in short
 * lines, drafted by us and sent to the partner. It goes live once they reply
 * OK (`confirmed`); until then only `pnpm dev` shows it, marked as a draft.
 */
export type PartnerIntro = {
  /** What they are, e.g. 学生社群 / Student community. */
  kind: Bi;
  /** Where they are. */
  base: Bi;
  /** Who they are, in one line. */
  line: Bi;
  /** Two or three short facts about them. */
  about: Bi[];
  /** What they gave our members, one short line each. */
  gave: Bi[];
  /** Their part in each event in `events`, by slug. */
  did: Record<string, Bi>;
  /** One line they agreed to have quoted, and who said it (a role). */
  quote?: { text: Bi; by: Bi };
  /** A public page of theirs to link when they have no site of their own. */
  page?: { url: string; label: Bi };
  /** YYYY-MM-DD the partner said yes to this text. */
  confirmed?: string;
};

export type Partner = {
  /** For the address of their intro: ?p=<slug>. */
  slug: string;
  /** As the partner agreed to be credited; shown as is, not translated. */
  name: string;
  /** Their site, https. */
  url?: string;
  /** Colour logo for dark backgrounds, under public/partners/. */
  logo: string;
  /** Brand colour as #rrggbb, for the glow behind the logo. */
  tint: string;
  role: PartnerRole;
  /** First term they helped, e.g. "T3 2026". */
  since: string;
  /** Slugs of the events they helped with: "Supported by" on each. */
  events: string[];
  /** On the home wall too: long-term partners only. Off once it ends. */
  home?: boolean;
  intro?: PartnerIntro;
};

/** In the order they joined. */
const PARTNERS: Partner[] = [
  {
    // White wordmark from their kit, with its navy background cut out.
    slug: "viberspace",
    name: "ViberSpace (USYD)",
    logo: "/partners/viberspace.png",
    tint: "#7946fc",
    role: "cohost",
    since: "T3 2026",
    events: ["put-yourself-online", "ai-study-career-talk"],
    home: true,
    // From their Humanitix organiser page; waiting for their OK.
    intro: {
      kind: { zh: "学生社群", en: "Student community" },
      base: { zh: "悉尼大学", en: "University of Sydney" },
      line: {
        zh: "悉尼大学学生自发的 AI 编程社群，以中文交流为主。",
        en: "A student-run AI coding community at USYD, mostly in Chinese.",
      },
      about: [
        {
          zh: "用工作坊、分享和项目交流，带人从零上手 AI 编程",
          en: "Workshops, talks and project swaps for coding with AI from zero",
        },
        {
          zh: "面向零基础，也欢迎做设计和产品的同学",
          en: "Open to beginners, designers and product people",
        },
      ],
      gave: [
        {
          zh: "10/22 工作坊的悉大报名渠道",
          en: "USYD sign-ups for the 22 Oct workshop",
        },
        {
          zh: "11/12 联合主办，在 Humanitix 出票",
          en: "Co-hosting 12 Nov, with tickets on Humanitix",
        },
        {
          zh: "11/12 的 AI 复习工作坊，由 Hejia 主讲",
          en: "Hejia leads the 12 Nov AI study workshop",
        },
      ],
      did: {
        "put-yourself-online": {
          zh: "协办 · 悉大报名",
          en: "Co-host · USYD sign-ups",
        },
        "ai-study-career-talk": {
          zh: "联合主办 · AI 复习工作坊",
          en: "Co-host · AI study workshop",
        },
      },
      page: {
        url: "https://events.humanitix.com/host/usyd-vibe-coding-club",
        label: { zh: "Humanitix 主页", en: "On Humanitix" },
      },
    },
  },
];

/** The intro opens on the site: confirmed, or any draft under `pnpm dev`. */
export const introShown = (p: Partner) =>
  !!p.intro && (!!p.intro.confirmed || process.env.NODE_ENV === "development");

export const homePartners = () => PARTNERS.filter((p) => p.home);

export const eventPartners = (slug: string) =>
  PARTNERS.filter((p) => p.events.includes(slug));

/** Every partner, for the checks in partners.test.ts. */
export const allPartners = () => PARTNERS;

export const PARTNER_EMAIL = "hello@builderspace.dev";
