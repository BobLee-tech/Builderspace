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

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  workshop: "工作坊",
  build_night: "Build Night",
  demo_night: "Demo Night",
  online: "线上",
  other: "其他",
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  recruiting: "招募中",
  building: "进行中",
  demoed: "已 Demo",
  paused: "暂停",
};

export const ROLE_LABEL: Record<Role, string> = {
  frontend: "前端",
  backend: "后端",
  design: "设计",
  product: "产品/商科",
  tester: "试用者",
};

export const SKILL_LABEL: Record<Skill, string> = {
  frontend: "前端",
  backend: "后端",
  design: "设计",
  product: "产品/商科",
  beginner: "零基础",
};

export const HOURS_LABEL: Record<WeeklyHours, string> = {
  lt2: "2h 以内",
  "2to5": "2–5h",
  gt5: "5h 以上",
};

export const BLOCKER_LABEL: Record<Blocker, string> = {
  teammates: "没有队友",
  coding: "不会写代码",
  time: "没时间",
  idea: "没想好做什么",
  deploy: "不会部署上线",
  other: "其他",
};

export const UPDATE_KIND_LABEL: Record<UpdateKind, string> = {
  commit: "代码提交",
  demo: "Demo",
  post: "更新帖",
};

export const REFERRAL_LABEL: Record<(typeof REFERRAL_SOURCES)[number], string> =
  {
    xiaohongshu: "小红书",
    wechat: "微信群 / 朋友圈",
    friend: "朋友推荐",
    poster: "校园海报",
    other: "其他",
  };
