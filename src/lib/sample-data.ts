import { DEFAULT_DESIGN, type CardDesign } from "./card-design";
import type { Spark } from "./members";
import { teamLine, type CoreTeam, type TeamKey, type TeamPerson } from "./team";
import {
  NO_MEDIA,
  type Project,
  type SiteEvent,
  type Tutorial,
  type VolunteerPosition,
  type WeeklyPick,
} from "./types";

// Used only when Supabase is not configured (local dev, preview builds).
// No invented events or projects: the first workshop (the same row as
// 20261018000000_event_registrations.sql) and CourseMate, the club's own
// product, are the only entries. Everything else comes from Supabase.

export const sampleEvents: SiteEvent[] = [
  {
    slug: "put-yourself-online",
    title: "做一个自己的个人网站",
    kind: "workshop",
    startsAt: "2026-10-22T10:00:00+11:00",
    endsAt: "2026-10-22T13:00:00+11:00",
    location: "UNSW MCIC",
    summary: "带上电脑，用 AI 做一个个人网站，发布到 GitHub Pages。",
    signupUrl: null,
    capacity: 52,
    registrationClosesAt: "2026-10-21T23:59:59+11:00",
    seatQuotas: { unsw: 42, external: 10 },
  },
];

export const sampleProjects: Project[] = [
  {
    slug: "coursemate",
    name: "CourseMate",
    pitch: "选课前，先看看上过的同学说这门课有多累",
    problem: "选课前想知道一门课的真实工作量，现在只能翻群聊记录。",
    targetUser: "授课型硕士新生",
    status: "building",
    neededRoles: ["tester", "backend"],
    nextStep: "邀请 20 位同学试用课程评价流程。",
    contact: "BuilderSpace 团队",
    ownerName: "BuilderSpace 团队",
    repoUrl: null,
    demoUrl: null,
    updatedAt: "2026-10-10T12:00:00+11:00",
    media: NO_MEDIA,
    commentCount: 0,
    starCount: 0,
    en: {
      name: null,
      pitch: "See how heavy a course really is before you pick it",
      problem:
        "Before picking a course you want to know its real workload, and right now the only way is digging through group chats.",
      targetUser: "New coursework master's students",
      nextStep: "Invite 20 classmates to try the course review flow.",
    },
    translated: "en",
  },
];

export const sampleTutorials: Tutorial[] = [];
export const samplePicks: WeeklyPick[] = [];

// The three founders are the real ones (their profile pages live in
// founder-profiles.ts); the core team are placeholders whose names say what
// they are. No photos, and <SampleNotice /> sits above them. Ops has enough to
// page, so paging can be checked locally.
function placeholder(
  name: string,
  team: TeamKey,
  position: VolunteerPosition | null,
  spark: Spark,
  design: Partial<CardDesign> = {},
  profileSlug: string | null = null,
  dept: CoreTeam | null = team === "founder" ? null : team,
  memberNo: number | null = null,
): TeamPerson {
  return {
    id: `sample-${name.toLowerCase().replace(/\W+/g, "-")}`,
    slug: profileSlug ?? `sample-${name.toLowerCase().replace(/\W+/g, "-")}`,
    profileSlug,
    team,
    dept,
    position,
    title: team === "founder" ? "Co-President" : null,
    bio: null,
    bioEn: null,
    link: null,
    avatar: null,
    portrait: null,
    card: {
      nickname: name,
      schoolDegree: "",
      major: teamLine(team),
      skills: [],
      spark,
      memberNo,
      seal: null,
      building: null,
      lookingFor: [],
    },
    design: { ...DEFAULT_DESIGN, ...design },
  };
}

export const sampleTeam: TeamPerson[] = [
  // Founders also hold a card in one department, numbered by when they joined.
  placeholder("Xin He", "founder", "content", "vivi", {}, "xin", "ops", 55),
  placeholder(
    "Evan Jia",
    "founder",
    "partnerships",
    "lumi",
    { tint: "lumi" },
    "evan",
    "events",
    1,
  ),
  placeholder(
    "Bob Lee",
    "founder",
    "web_tools",
    "geo",
    { material: "chrome" },
    "bob",
    "tech",
    11,
  ),
  placeholder("Ops 1", "ops", "content", "momo", {
    tint: "momo",
    pattern: "topo",
  }),
  placeholder("Ops 2", "ops", "design_media", "kiko", {
    material: "glass",
    tint: "kiko",
  }),
  placeholder("Ops 3", "ops", "recruiting", "vivi", {
    tint: "vivi",
    pattern: "dots",
  }),
  placeholder("Ops 4", "ops", "content", "geo", { material: "carbon" }),
  placeholder("Ops 5", "ops", "design_media", "lumi", {
    tint: "lumi",
    pattern: "grid",
  }),
  placeholder("Ops 6", "ops", "recruiting", "momo", {
    material: "chrome",
    tint: "momo",
  }),
  placeholder("Tech 1", "tech", "product", "geo", {
    tint: "geo",
    pattern: "grid",
  }),
  placeholder("Tech 2", "tech", "web_tools", "kiko", {
    material: "carbon",
    tint: "kiko",
  }),
  placeholder("Tech 3", "tech", "teaching", "momo", { pattern: "puzzle" }),
  placeholder("Events 1", "events", "events", "vivi", {
    material: "glass",
    tint: "vivi",
  }),
  placeholder("Events 2", "events", "partnerships", "lumi", {
    pattern: "topo",
  }),
];
