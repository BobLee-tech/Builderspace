// Domain types mirror supabase/migrations/20261012000000_init.sql.

export type EventKind =
  "workshop" | "build_night" | "demo_night" | "online" | "other";

export type ProjectStatus = "recruiting" | "building" | "demoed" | "paused";

export const ROLES = [
  "frontend",
  "backend",
  "design",
  "product",
  "tester",
] as const;
export type Role = (typeof ROLES)[number];

export const SKILLS = [
  "frontend",
  "backend",
  "design",
  "product",
  "beginner",
] as const;
export type Skill = (typeof SKILLS)[number];

export const WEEKLY_HOURS = ["lt2", "2to5", "gt5"] as const;
export type WeeklyHours = (typeof WEEKLY_HOURS)[number];

export const BLOCKERS = [
  "teammates",
  "coding",
  "time",
  "idea",
  "deploy",
  "other",
] as const;
export type Blocker = (typeof BLOCKERS)[number];

export const UPDATE_KINDS = ["commit", "demo", "post"] as const;
export type UpdateKind = (typeof UPDATE_KINDS)[number];

export const REFERRAL_SOURCES = [
  "xiaohongshu",
  "wechat",
  "friend",
  "poster",
  "other",
] as const;

// The eleven core-team positions, grouped into three departments. The keys are
// stored in volunteer_applications.positions and checked by the database, so
// keep the list there in step. Positions are listed only here so every one of
// them shows up on the form.
export const DEPARTMENTS = [
  {
    name: { zh: "市场运营部", en: "Marketing & Operations" },
    positions: [
      "events",
      "content",
      "design_media",
      "partnerships",
      "recruiting",
    ],
  },
  {
    name: { zh: "产品技术部", en: "Product & Technology" },
    positions: ["product", "web_tools", "teaching", "tech_explore"],
  },
  {
    name: { zh: "行政财务部", en: "Admin & Finance" },
    positions: ["secretary", "finance"],
  },
] as const satisfies readonly { name: Bi; positions: readonly string[] }[];

export const VOLUNTEER_POSITIONS = DEPARTMENTS.flatMap((d) => d.positions);
export type VolunteerPosition = (typeof VOLUNTEER_POSITIONS)[number];

export const EVENT_INTEREST = ["yes", "maybe", "no"] as const;
export type EventInterest = (typeof EVENT_INTEREST)[number];

export type SiteEvent = {
  slug: string;
  title: string;
  kind: EventKind;
  startsAt: string;
  endsAt: string;
  location: string;
  summary: string | null;
  signupUrl: string | null;
  capacity: number | null;
};

export type Project = {
  slug: string;
  name: string;
  problem: string;
  targetUser: string;
  status: ProjectStatus;
  neededRoles: Role[];
  nextStep: string | null;
  contact: string;
  ownerName: string;
  repoUrl: string | null;
  demoUrl: string | null;
  updatedAt: string;
  media: ProjectMedia;
};

/** Signed, short-lived URLs for an approved project's uploads. */
export type ProjectMedia = {
  coverUrl: string | null;
  /** object-position percentages for the 16:9 crop. */
  coverFocus: [number, number];
  videoUrl: string | null;
  videoPosterUrl: string | null;
  videoSeconds: number | null;
};

export const NO_MEDIA: ProjectMedia = {
  coverUrl: null,
  coverFocus: [50, 50],
  videoUrl: null,
  videoPosterUrl: null,
  videoSeconds: null,
};

export type ProjectUpdate = {
  kind: UpdateKind;
  body: string;
  url: string | null;
  occurredAt: string;
};

export type Tutorial = {
  /** Workshop the materials belong to, if ops linked one. */
  eventSlug: string | null;
  title: string;
  summary: string | null;
  slidesUrl: string | null;
  repoUrl: string | null;
  recordingUrl: string | null;
  publishedAt: string | null;
};

export type WeeklyPick = {
  kind: "news" | "campus_event";
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  pickedOn: string;
};

// Display labels in both languages; render with <T {...LABEL[key]} />.
type Bi = { zh: string; en: string };

export const EVENT_KIND_LABEL: Record<EventKind, Bi> = {
  workshop: { zh: "工作坊", en: "Workshop" },
  build_night: { zh: "Build Night", en: "Build Night" },
  demo_night: { zh: "Demo Night", en: "Demo Night" },
  online: { zh: "线上", en: "Online" },
  other: { zh: "其他", en: "Other" },
};

export const STATUS_LABEL: Record<ProjectStatus, Bi> = {
  recruiting: { zh: "招募中", en: "Recruiting" },
  building: { zh: "进行中", en: "Building" },
  demoed: { zh: "已 Demo", en: "Demoed" },
  paused: { zh: "暂停", en: "Paused" },
};

export const ROLE_LABEL: Record<Role, Bi> = {
  frontend: { zh: "前端", en: "Frontend" },
  backend: { zh: "后端", en: "Backend" },
  design: { zh: "设计", en: "Design" },
  product: { zh: "产品/商科", en: "Product / Business" },
  tester: { zh: "试用者", en: "Testers" },
};

export const SKILL_LABEL: Record<Skill, Bi> = {
  frontend: { zh: "前端", en: "Frontend" },
  backend: { zh: "后端", en: "Backend" },
  design: { zh: "设计", en: "Design" },
  product: { zh: "产品/商科", en: "Product / Business" },
  beginner: { zh: "零基础", en: "Total beginner" },
};

export const HOURS_LABEL: Record<WeeklyHours, Bi> = {
  lt2: { zh: "2h 以内", en: "Under 2h" },
  "2to5": { zh: "2–5h", en: "2–5h" },
  gt5: { zh: "5h 以上", en: "5h+" },
};

export const BLOCKER_LABEL: Record<Blocker, Bi> = {
  teammates: { zh: "没有队友", en: "No teammates" },
  coding: { zh: "不会写代码", en: "Couldn't code it" },
  time: { zh: "没时间", en: "No time" },
  idea: { zh: "没想好做什么", en: "Unsure what to build" },
  deploy: { zh: "不会部署上线", en: "Couldn't ship it" },
  other: { zh: "其他", en: "Other" },
};

export const UPDATE_KIND_LABEL: Record<UpdateKind, Bi> = {
  commit: { zh: "代码提交", en: "Commit" },
  demo: { zh: "Demo", en: "Demo" },
  post: { zh: "更新帖", en: "Update post" },
};

export const REFERRAL_LABEL: Record<(typeof REFERRAL_SOURCES)[number], Bi> = {
  xiaohongshu: { zh: "小红书", en: "Xiaohongshu" },
  wechat: { zh: "微信群 / 朋友圈", en: "WeChat" },
  friend: { zh: "朋友推荐", en: "A friend" },
  poster: { zh: "校园海报", en: "Campus poster" },
  other: { zh: "其他", en: "Other" },
};

export const EVENT_INTEREST_LABEL: Record<EventInterest, Bi> = {
  yes: { zh: "想来", en: "I'm in" },
  maybe: { zh: "看时间", en: "Depends on timing" },
  no: { zh: "这次不来", en: "Not this time" },
};

export const POSITION_LABEL: Record<VolunteerPosition, Bi> = {
  events: { zh: "活动", en: "Events" },
  content: { zh: "内容与渠道", en: "Content & channels" },
  design_media: { zh: "设计与影像", en: "Design & media" },
  partnerships: { zh: "对外合作", en: "Partnerships" },
  recruiting: { zh: "招募与成员发展", en: "Recruiting & member growth" },
  product: { zh: "产品与项目", en: "Product & projects" },
  web_tools: { zh: "网站与工具", en: "Website & tools" },
  teaching: { zh: "教学与支持", en: "Teaching & support" },
  tech_explore: { zh: "技术探索", en: "Tech exploration" },
  secretary: { zh: "秘书与行政", en: "Secretary & admin" },
  finance: { zh: "财务", en: "Finance" },
};
