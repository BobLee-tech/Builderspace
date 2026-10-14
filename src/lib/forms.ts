import { z } from "zod";
import { MEDIA_PATH, VIDEO_MAX_SECONDS } from "./media";
import {
  AVAILABILITY,
  BLOCKERS,
  EVENT_INTEREST,
  REFERRAL_SOURCES,
  ROLES,
  SKILLS,
  UPDATE_KINDS,
  VOLUNTEER_POSITIONS,
  WEEKLY_HOURS,
} from "./types";

const text = (max: number) =>
  z.string().trim().min(1, "必填|Required").max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
// Matches the longest URL column in the database (volunteer portfolio_url).
const URL_MAX = 300;
// `github.com/me` and `www.x.dev` are links too: anything without a scheme
// gets https://. A `host:port` start (digits after the colon) is not a scheme,
// while `javascript:` / `mailto:` keep theirs and are then rejected.
const SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;
export function withScheme(link: string) {
  if (!link) return link;
  // The database checks for a lower-case `http(s)://`, slashes included.
  if (SCHEME.test(link))
    return link.replace(
      /^(https?):\/*/i,
      (_, p: string) => `${p.toLowerCase()}://`,
    );
  return `https://${link.replace(/^\/+/, "")}`;
}
const optionalUrl = z
  .string()
  .trim()
  .transform(withScheme)
  .pipe(z.string().max(URL_MAX, "链接太长了|That link is too long"))
  .transform((v) => v || null)
  .pipe(
    z
      .url({
        protocol: /^https?$/,
        // A real host has a dot in it (rules out `https://hello`).
        hostname: /^[^.]+(\.[^.]+)+$/,
        error: "请填写有效的链接|Enter a valid link",
      })
      .nullable(),
  );

/**
 * Channel tag from the join link (PRD §6.5 归因): `?ref=xhs-w1` or
 * `utm_source=…`. Anything malformed is dropped rather than blocking signup.
 */
export function normalizeChannel(value: string | null | undefined) {
  const v = value?.trim().toLowerCase() ?? "";
  return /^[a-z0-9_-]{1,40}$/.test(v) ? v : null;
}

export function channelFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  return normalizeChannel(params.get("ref") ?? params.get("utm_source"));
}

const ZID = /^z?\d{7}$/i;

const joinFields = {
  nickname: text(40),
  schoolDegree: text(80),
  major: text(80),
  skills: z.array(z.enum(SKILLS)).max(SKILLS.length),
  idea: optionalText(500),
  stalledProject: z.enum(["yes", "no"], { error: "请选择|Pick one" }),
  blockers: z.array(z.enum(BLOCKERS)).max(BLOCKERS.length),
  weeklyHours: z.enum(WEEKLY_HOURS, {
    error: "请选择每周可投入时间|Pick your weekly hours",
  }),
  referralSource: z.enum(REFERRAL_SOURCES, {
    error: "请选择从哪里知道我们|Tell us how you found us",
  }),
  channel: z.string().transform(normalizeChannel),
  showcaseConsent: z.boolean(),
  // Both optional: they size the next event, nobody has to answer.
  eventInterest: z.enum(EVENT_INTEREST).nullable(),
  availability: z.array(z.enum(AVAILABILITY)).max(AVAILABILITY.length),
};

/** Whatever was typed into a field the member did not opt in to is dropped. */
const dropped = <T>(value: T) => z.unknown().transform(() => value);

// Only the fields ops need (PRD §4.3 隐私). No student card; a name and zID
// are kept only when the member opts in to back the club's application to
// become an official club, and consents to passing them on for that purpose.
// stalledProject + blockers + weeklyHours are the three W1 validation
// questions from PRD §1.4.
//
// Two plain objects rather than one object with a cross-field refinement, so
// a supporter's missing name shows up in the same pass as any other error.
export const joinSchema = z.discriminatedUnion("affiliationSupport", [
  z.object({
    ...joinFields,
    affiliationSupport: z.literal(false),
    fullName: dropped(null),
    zid: dropped(null),
    affiliationConsent: dropped(false),
  }),
  z.object({
    ...joinFields,
    affiliationSupport: z.literal(true),
    fullName: text(80),
    zid: z
      .string()
      .trim()
      .regex(ZID, "zID 是 z 加 7 位数字|A zID is z followed by 7 digits")
      .transform((v) => `z${v.replace(/^z/i, "")}`),
    affiliationConsent: z.literal(true, {
      error: "勾选同意后才能登记|Tick the box to register your support",
    }),
  }),
]);
export type JoinInput = z.infer<typeof joinSchema>;

// Core-team volunteers can be reached, so unlike the join form this one asks
// for contact details, and nothing is stored unless the applicant consents.
// Still no student card and no zID.
export const volunteerSchema = z.object({
  nickname: text(40),
  contact: text(120),
  schoolDegree: text(80),
  positions: z
    .array(z.enum(VOLUNTEER_POSITIONS))
    .min(1, "至少选一个职位|Pick at least one position")
    .max(VOLUNTEER_POSITIONS.length),
  weeklyHours: z.enum(WEEKLY_HOURS, {
    error: "请选择每周可投入时间|Pick your weekly hours",
  }),
  about: text(500),
  portfolioUrl: optionalUrl,
  channel: z.string().transform(normalizeChannel),
  dataConsent: z.literal(true, {
    error: "勾选同意后才能提交|Tick the box to submit",
  }),
});
export type VolunteerInput = z.infer<typeof volunteerSchema>;

// Paths of files the browser already uploaded; empty means none.
const mediaPath = (pattern: RegExp) =>
  z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(
      z.string().regex(pattern, "上传的文件无效|Invalid upload").nullable(),
    );
const focus = z.coerce.number().int().min(0).max(100).catch(50);

const projectMediaSchema = z
  .object({
    coverPath: mediaPath(MEDIA_PATH.cover),
    coverFocusX: focus,
    coverFocusY: focus,
    videoPath: mediaPath(MEDIA_PATH.video),
    videoPosterPath: mediaPath(MEDIA_PATH.poster),
    videoSeconds: z.coerce
      .number()
      .catch(0)
      .transform((v) => (v > 0 ? Math.round(v * 100) / 100 : null))
      .pipe(
        z
          .number()
          .max(
            VIDEO_MAX_SECONDS,
            "视频请剪到 3 分钟以内|Keep the video under 3 minutes",
          )
          .nullable(),
      ),
  })
  .transform((m) =>
    // A video row needs its length; drop the leftovers of a removed video.
    m.videoPath && m.videoSeconds
      ? m
      : { ...m, videoPath: null, videoPosterPath: null, videoSeconds: null },
  );

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
  media: projectMediaSchema,
});
export type ProjectSubmission = z.infer<typeof projectSubmissionSchema>;

export const projectUpdateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.enum(UPDATE_KINDS, { error: "请选择进展类型|Pick an update type" }),
  body: text(500),
  url: optionalUrl,
  submittedBy: text(40),
});
export type ProjectUpdateSubmission = z.infer<typeof projectUpdateSchema>;

export function parseJoinForm(form: FormData) {
  return joinSchema.safeParse({
    nickname: form.get("nickname") ?? "",
    schoolDegree: form.get("schoolDegree") ?? "",
    major: form.get("major") ?? "",
    skills: form.getAll("skills"),
    idea: form.get("idea") ?? "",
    stalledProject: form.get("stalledProject") ?? undefined,
    blockers: form.getAll("blockers"),
    weeklyHours: form.get("weeklyHours") ?? undefined,
    referralSource: form.get("referralSource") ?? undefined,
    channel: form.get("channel") ?? "",
    showcaseConsent: form.get("showcaseConsent") === "on",
    eventInterest: form.get("eventInterest") ?? null,
    availability: form.getAll("availability"),
    affiliationSupport: form.get("affiliationSupport") === "on",
    fullName: form.get("fullName") ?? "",
    zid: form.get("zid") ?? "",
    affiliationConsent: form.get("affiliationConsent") === "on",
  });
}

export function parseVolunteerForm(form: FormData) {
  return volunteerSchema.safeParse({
    nickname: form.get("nickname") ?? "",
    contact: form.get("contact") ?? "",
    schoolDegree: form.get("schoolDegree") ?? "",
    positions: form.getAll("positions"),
    weeklyHours: form.get("weeklyHours") ?? undefined,
    about: form.get("about") ?? "",
    portfolioUrl: form.get("portfolioUrl") ?? "",
    channel: form.get("channel") ?? "",
    dataConsent: form.get("dataConsent") === "on",
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
    media: {
      coverPath: form.get("coverPath") ?? "",
      coverFocusX: form.get("coverFocusX") ?? 50,
      coverFocusY: form.get("coverFocusY") ?? 50,
      videoPath: form.get("videoPath") ?? "",
      videoPosterPath: form.get("videoPosterPath") ?? "",
      videoSeconds: form.get("videoSeconds") ?? "",
    },
  });
}

export function parseProjectUpdateForm(form: FormData) {
  return projectUpdateSchema.safeParse({
    slug: form.get("slug") ?? "",
    kind: form.get("kind") ?? undefined,
    body: form.get("body") ?? "",
    url: form.get("url") ?? "",
    submittedBy: form.get("submittedBy") ?? "",
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
