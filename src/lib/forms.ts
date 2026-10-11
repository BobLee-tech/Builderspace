import { z } from "zod";
import { REFERRAL_SOURCES, ROLES, SKILLS, WEEKLY_HOURS } from "./types";

const text = (max: number) => z.string().trim().min(1, "必填").max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const optionalUrl = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(
    z.url({ protocol: /^https?$/, error: "请填写 http(s) 链接" }).nullable(),
  );

// Only the fields ops need (PRD §4.3 隐私). No zID, no student card.
export const joinSchema = z.object({
  nickname: text(40),
  schoolDegree: text(80),
  major: text(80),
  skills: z.array(z.enum(SKILLS)).max(SKILLS.length),
  idea: optionalText(500),
  weeklyHours: z.enum(WEEKLY_HOURS, { error: "请选择每周可投入时间" }),
  referralSource: z.enum(REFERRAL_SOURCES, { error: "请选择从哪里知道我们" }),
  showcaseConsent: z.boolean(),
});
export type JoinInput = z.infer<typeof joinSchema>;

export const projectSubmissionSchema = z.object({
  name: text(60),
  problem: text(280),
  targetUser: text(80),
  neededRoles: z.array(z.enum(ROLES)).max(ROLES.length),
  nextStep: optionalText(280),
  ownerName: text(40),
  contact: text(120),
  repoUrl: optionalUrl,
  demoUrl: optionalUrl,
});
export type ProjectSubmission = z.infer<typeof projectSubmissionSchema>;

export function parseJoinForm(form: FormData) {
  return joinSchema.safeParse({
    nickname: form.get("nickname") ?? "",
    schoolDegree: form.get("schoolDegree") ?? "",
    major: form.get("major") ?? "",
    skills: form.getAll("skills"),
    idea: form.get("idea") ?? "",
    weeklyHours: form.get("weeklyHours") ?? undefined,
    referralSource: form.get("referralSource") ?? undefined,
    showcaseConsent: form.get("showcaseConsent") === "on",
  });
}

export function parseProjectForm(form: FormData) {
  return projectSubmissionSchema.safeParse({
    name: form.get("name") ?? "",
    problem: form.get("problem") ?? "",
    targetUser: form.get("targetUser") ?? "",
    neededRoles: form.getAll("neededRoles"),
    nextStep: form.get("nextStep") ?? "",
    ownerName: form.get("ownerName") ?? "",
    contact: form.get("contact") ?? "",
    repoUrl: form.get("repoUrl") ?? "",
    demoUrl: form.get("demoUrl") ?? "",
  });
}

/** Slug for a submitted project; ops can rename it during review. */
export function projectSlug(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base ? `${base}-${suffix}` : `project-${suffix}`;
}

export type FormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "ok"; nickname?: string };

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
