import type { Project, SiteEvent, Tutorial, WeeklyPick } from "./types";

// Used only when Supabase is not configured (local dev, preview builds).
// No invented events or projects: CourseMate, the club's own product, is the
// only entry. Everything else comes from Supabase.

export const sampleEvents: SiteEvent[] = [];

export const sampleProjects: Project[] = [
  {
    slug: "coursemate",
    name: "CourseMate",
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
  },
];

export const sampleTutorials: Tutorial[] = [];
export const samplePicks: WeeklyPick[] = [];
