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

export type Partner = {
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
};

/** In the order they joined. */
const PARTNERS: Partner[] = [
  {
    // White wordmark from their kit, with its navy background cut out.
    name: "ViberSpace (USYD)",
    logo: "/partners/viberspace.png",
    tint: "#7946fc",
    role: "cohost",
    since: "T3 2026",
    events: ["put-yourself-online"],
    home: true,
  },
];

export const homePartners = () => PARTNERS.filter((p) => p.home);

export const eventPartners = (slug: string) =>
  PARTNERS.filter((p) => p.events.includes(slug));

/** Every partner, for the checks in partners.test.ts. */
export const allPartners = () => PARTNERS;

export const PARTNER_EMAIL = "hello@builderspace.dev";
