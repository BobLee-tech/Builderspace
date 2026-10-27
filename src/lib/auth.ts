import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import {
  DEFAULT_DESIGN,
  lockedParts,
  memberSeed,
  readDesign,
  seededDesign,
  type CardDesign,
} from "./card-design";
import type {
  CardSaveInput,
  MemberProfileInput,
  SurveyInput,
} from "./member-forms";
import {
  afterEmailChange,
  schoolDomain,
  zidFromEmail,
  type LookingFor,
  type Member,
  type MemberSkill,
  type Spark,
} from "./members";
import { sampleProjects } from "./sample-data";
import { isSupabaseConfigured } from "./supabase/client";
import { getSupabaseAuth } from "./supabase/server";
import type { StarredProject } from "./types";

// Every member read and write goes through here. With Supabase configured the
// session lives in Supabase's cookies and the database functions in
// 20261017000000_member_accounts.sql do the writes. Without it, development
// runs on a single cookie (any 6-digit code works) so the flow can be tried
// locally; production without Supabase refuses to sign anyone in.

export type Result<T = undefined> =
  { ok: true; value: T } | { ok: false; message: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (message: string): Result<never> => ({ ok: false, message });
const CLOSED = "登录暂未开放，请稍后再试|Sign-in isn't open yet";
const ZID_NEEDED =
  "用 UNSW 邮箱加入要填 zID|Joining with a UNSW email needs your zID";

const devMode = () =>
  !isSupabaseConfigured() && process.env.NODE_ENV !== "production";

type ProfileRow = {
  id: string;
  member_no: number;
  handle: string;
  nickname: string;
  school_degree: string;
  major: string;
  skills: string[];
  spark: string;
  building: string | null;
  looking_for: string[];
  school_domain: string | null;
  school_verified_at: string | null;
  is_public: boolean;
  card_on_projects: boolean;
};

function toMember(row: ProfileRow, email: string): Member {
  return {
    id: row.id,
    memberNo: row.member_no,
    handle: row.handle,
    nickname: row.nickname,
    schoolDegree: row.school_degree,
    major: row.major,
    skills: row.skills as MemberSkill[],
    spark: row.spark as Spark,
    building: row.building,
    lookingFor: row.looking_for as LookingFor[],
    schoolDomain: row.school_domain,
    verified: Boolean(row.school_verified_at),
    isPublic: row.is_public,
    cardOnProjects: row.card_on_projects,
    email,
  };
}

/* ---------- development stand-in (no Supabase) ---------- */

const DEV_COOKIE = "bs_dev_member";
type DevSession = {
  email: string;
  member: Member | null;
  survey: boolean;
  card?: CardDesign;
  zid?: string | null;
  /** The new sign-in email a code was sent to, until it's confirmed. */
  pendingEmail?: string;
};

async function readDev(): Promise<DevSession | null> {
  const raw = (await cookies()).get(DEV_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString()) as DevSession;
  } catch {
    return null;
  }
}

async function writeDev(session: DevSession | null) {
  const store = await cookies();
  if (!session) {
    store.delete(DEV_COOKIE);
    return;
  }
  store.set(
    DEV_COOKIE,
    Buffer.from(JSON.stringify(session)).toString("base64url"),
    { httpOnly: true, sameSite: "lax", path: "/" },
  );
}

/* ---------- sign in ---------- */

export async function sendCode(email: string): Promise<Result> {
  if (devMode()) return ok(undefined);
  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (!error) return ok(undefined);
  if (error.status === 429) {
    return fail(
      "发送太频繁了，请一分钟后再试|Too many codes sent, try again in a minute",
    );
  }
  console.error("[auth] send code failed", {
    status: error.status,
    code: error.code,
  });
  return fail("验证码发送失败，请稍后再试|Couldn't send the code, try again");
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<Result<{ hasCard: boolean }>> {
  if (devMode()) {
    const prev = await readDev();
    // Same email: keep the card; a different one starts over.
    const kept = prev?.email === email ? prev : null;
    await writeDev({
      email,
      member: kept?.member ?? null,
      survey: kept?.survey ?? false,
      card: kept?.card,
      zid: kept?.zid,
    });
    return ok({ hasCard: Boolean(kept?.member) });
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  if (error) {
    return fail(
      "验证码不对或已过期，重新发一个试试|That code is wrong or expired, send a new one",
    );
  }
  const session = await getSession();
  return ok({ hasCard: Boolean(session?.member) });
}

export async function signOut() {
  if (devMode()) {
    await writeDevStars(null);
    return writeDev(null);
  }
  const supabase = await getSupabaseAuth();
  await supabase?.auth.signOut();
}

/* ---------- the signed-in member ---------- */

/** The signed-in email and, once the card is made, the member. Memoised per request. */
export const getSession = cache(
  async (): Promise<{ email: string; member: Member | null } | null> => {
    // Always per request, even when Supabase isn't configured and no cookie
    // is read: a signed-in page must never be prerendered.
    await connection();
    if (devMode()) {
      const dev = await readDev();
      if (!dev) return null;
      // Cookies from before the switches existed: on, like the database defaults.
      const member = dev.member && {
        ...dev.member,
        isPublic: dev.member.isPublic ?? true,
        cardOnProjects: dev.member.cardOnProjects ?? true,
      };
      return { email: dev.email, member };
    }
    const supabase = await getSupabaseAuth();
    if (!supabase) return null;
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return null;
    const email = String(claims.email ?? "");
    const { data: row } = await supabase
      .from("profiles")
      .select(
        "id, member_no, handle, nickname, school_degree, major, skills, spark, building, looking_for, school_domain, school_verified_at, is_public, card_on_projects",
      )
      .eq("id", claims.sub)
      .maybeSingle<ProfileRow>();
    return { email, member: row ? toMember(row, email) : null };
  },
);

export async function createMember(
  input: MemberProfileInput,
): Promise<Result<Member>> {
  const session = await getSession();
  if (!session) return fail("先用邮箱登录|Sign in with your email first");
  if (session.member) return ok(session.member);

  if (devMode()) {
    const domain = schoolDomain(session.email);
    const member: Member = {
      id: "dev",
      memberNo: 71,
      handle:
        input.nickname.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
        "builder-71",
      nickname: input.nickname,
      schoolDegree: input.schoolDegree,
      major: input.major,
      skills: input.skills,
      spark: input.spark,
      building: input.building,
      lookingFor: input.lookingFor,
      schoolDomain: domain,
      verified: Boolean(domain),
      isPublic: true,
      cardOnProjects: true,
      email: session.email,
    };
    await writeDev({
      email: session.email,
      member,
      survey: false,
      zid: input.zid,
    });
    return ok(member);
  }

  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { data, error } = await supabase
    .rpc("join_builderspace", {
      p_nickname: input.nickname,
      p_school_degree: input.schoolDegree,
      p_major: input.major,
      p_skills: input.skills,
      p_spark: input.spark,
      p_building: input.building,
      p_looking_for: input.lookingFor,
      p_channel: input.channel,
      p_zid: input.zid,
    })
    .single<ProfileRow>();
  if (error || !data) {
    if (error?.code === "22023") return fail(ZID_NEEDED);
    if (error?.code === "PT429") {
      return fail(
        "加入的人有点多，请一分钟后再试|Lots of people joining right now, try again in a minute",
      );
    }
    console.error("[auth] create member failed", {
      code: error?.code,
      message: error?.message,
    });
    return fail("卡片生成失败，请稍后再试|Couldn't make your card, try again");
  }
  return ok(toMember(data, session.email));
}

/* ---------- optional survey ---------- */

export async function surveyDone(): Promise<boolean> {
  if (devMode()) return (await readDev())?.survey ?? false;
  const supabase = await getSupabaseAuth();
  if (!supabase) return false;
  const { data } = await supabase.rpc("my_join_survey_done");
  return Boolean(data);
}

export async function saveSurvey(input: SurveyInput): Promise<Result> {
  const session = await getSession();
  if (!session?.member) return fail("先生成你的卡片|Make your card first");
  if (devMode()) {
    // Never log the name or zID, even in development.
    console.info("[survey] dev, dropped:", {
      ...input,
      fullName: input.fullName && "[redacted]",
      zid: input.zid && "[redacted]",
    });
    const dev = await readDev();
    await writeDev({
      email: session.email,
      member: session.member,
      survey: true,
      card: dev?.card,
      zid: dev?.zid ?? input.zid,
    });
    return ok(undefined);
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { error } = await supabase.rpc("save_join_survey", {
    p_stalled_project:
      input.stalledProject === null ? null : input.stalledProject === "yes",
    p_blockers: input.blockers,
    p_referral_source: input.referralSource,
    p_next_event_interest: input.eventInterest,
    p_showcase_consent: input.showcaseConsent,
    p_affiliation_support: input.affiliationSupport,
    p_full_name: input.fullName,
    p_zid: input.zid,
    p_affiliation_consent: input.affiliationConsent,
  });
  if (error) {
    console.error("[auth] save survey failed", {
      code: error.code,
      message: error.message,
    });
    return fail("提交失败，请稍后再试|Couldn't submit, please try again");
  }
  return ok(undefined);
}

/* ---------- zID ---------- */

/** The signed-in member's zID, from joining or the survey; null if none. */
export async function getMyZid(): Promise<string | null> {
  const session = await getSession();
  if (!session?.member) return null;
  if (devMode()) return (await readDev())?.zid ?? null;
  const supabase = await getSupabaseAuth();
  if (!supabase) return null;
  const { data } = await supabase.rpc("my_zid");
  return typeof data === "string" ? data : null;
}

/**
 * Adds a zID for a member who joined without one. Once set it stays (an admin
 * can change it); returns whichever zID is stored.
 */
export async function saveMyZid(zid: string): Promise<Result<string>> {
  const session = await getSession();
  if (!session?.member) return fail("先生成你的卡片|Make your card first");
  if (devMode()) {
    const dev = await readDev();
    const saved = dev?.zid ?? zid;
    await writeDev({
      email: session.email,
      member: session.member,
      survey: dev?.survey ?? false,
      card: dev?.card,
      zid: saved,
    });
    return ok(saved);
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { data, error } = await supabase.rpc("save_my_zid", { p_zid: zid });
  if (error || typeof data !== "string") {
    console.error("[auth] save zid failed", {
      code: error?.code,
      message: error?.message,
    });
    return fail("保存失败，请稍后再试|Couldn't save, please try again");
  }
  return ok(data);
}

/* ---------- sign-in email ---------- */

const SAME_EMAIL = "这就是你现在的登录邮箱|That's already your sign-in email";

/** Sends a 6-digit code to the new address; nothing changes until it's confirmed. */
export async function requestEmailChange(email: string): Promise<Result> {
  const session = await getSession();
  if (!session?.member) return fail("先生成你的卡片|Make your card first");
  if (email === session.email.toLowerCase()) return fail(SAME_EMAIL);
  if (devMode()) {
    const dev = await readDev();
    if (dev) await writeDev({ ...dev, pendingEmail: email });
    return ok(undefined);
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { error } = await supabase.auth.updateUser({ email });
  if (!error) return ok(undefined);
  if (error.code === "email_exists") {
    return fail(
      "这个邮箱已经是另一位成员的登录邮箱|Another member already signs in with that email",
    );
  }
  if (error.status === 429) {
    return fail(
      "发送太频繁了，请一分钟后再试|Too many codes sent, try again in a minute",
    );
  }
  console.error("[auth] email change failed", {
    status: error.status,
    code: error.code,
  });
  return fail("验证码发送失败，请稍后再试|Couldn't send the code, try again");
}

/**
 * The code from the new address makes it the sign-in email. A school address
 * brings the verified seal; any other keeps it (sync_member_email() in the
 * database does the same for the real profile).
 */
export async function confirmEmailChange(
  email: string,
  code: string,
): Promise<Result<string>> {
  const session = await getSession();
  if (!session?.member) return fail("先生成你的卡片|Make your card first");
  const wrong = fail(
    "验证码不对或已过期，重新发一个试试|That code is wrong or expired, send a new one",
  );
  if (devMode()) {
    const dev = await readDev();
    if (!dev?.member || dev.pendingEmail !== email) return wrong;
    // Stars are kept by email in development; they move with it.
    const stars = await readDevStars(dev.email);
    await writeDevStars({ ...stars, email });
    await writeDev({
      email,
      member: { ...dev.member, ...afterEmailChange(dev.member, email), email },
      survey: dev.survey,
      card: dev.card,
      zid: dev.zid ?? zidFromEmail(email),
    });
    return ok(email);
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email_change",
  });
  if (error) return wrong;
  // With "Secure email change" still on in Supabase, the old address has to
  // confirm too and the email stays as it was.
  if (data.user?.email?.toLowerCase() !== email) {
    console.error("[auth] email change still pending after the new code");
    return fail(
      "邮箱还没换好，请稍后再试|Your email hasn't changed yet, try again later",
    );
  }
  return ok(email);
}

/* ---------- card studio ---------- */

type CardRow = {
  material: string;
  tint: string;
  pattern: string;
  tagline: string;
  stickers: unknown;
};

/**
 * The signed-in member's saved card design, or until they save one the design
 * seeded from their number, which their projects show too. Memoised per request.
 */
export const getCardDesign = cache(async (): Promise<CardDesign> => {
  const session = await getSession();
  if (!session?.member) return DEFAULT_DESIGN;
  const seeded = seededDesign(memberSeed(session.member.memberNo)).design;
  if (devMode()) {
    const card = (await readDev())?.card;
    return card ? readDesign(card) : seeded;
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return seeded;
  const { data } = await supabase
    .from("member_cards")
    .select("material, tint, pattern, tagline, stickers")
    .eq("user_id", session.member.id)
    .maybeSingle<CardRow>();
  return data ? readDesign(data) : seeded;
});

const VERIFIED_ONLY =
  "五色全息、阳极钛和校园贴纸需要学校邮箱认证|Holo foil, titanium and campus stickers are for verified members";

/**
 * Saves the studio: the card's look in member_cards, and the builder-profile
 * back (mascot, what you're building, who you're looking for) in profiles.
 */
export async function saveCard(input: CardSaveInput): Promise<Result<Member>> {
  const session = await getSession();
  if (!session?.member) return fail("先生成你的卡片|Make your card first");
  const m = session.member;
  // The database trigger is the real check; this one just says it nicely.
  const locked = lockedParts(input.design);
  if (!m.verified && (locked.material || locked.stickers)) {
    return fail(VERIFIED_ONLY);
  }
  const member: Member = {
    ...m,
    spark: input.spark,
    building: input.building,
    lookingFor: input.lookingFor,
  };

  if (devMode()) {
    const dev = await readDev();
    await writeDev({
      email: session.email,
      member,
      survey: dev?.survey ?? false,
      card: input.design,
      zid: dev?.zid,
    });
    return ok(member);
  }

  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { material, tint, pattern, tagline, stickers } = input.design;
  const row = { material, tint, pattern, tagline, stickers };
  const update = () =>
    supabase
      .from("member_cards")
      .update(row)
      .eq("user_id", m.id)
      .select("user_id");
  let { data: updated, error } = await update();
  if (!error && !updated?.length) {
    ({ error } = await supabase
      .from("member_cards")
      .insert({ user_id: m.id, ...row }));
    // Saved twice at once: the other request made the row, so update it.
    if (error?.code === "23505") ({ data: updated, error } = await update());
  }
  if (error) {
    if (error.code === "42501") return fail(VERIFIED_ONLY);
    console.error("[auth] save card failed", {
      code: error.code,
      message: error.message,
    });
    return fail("保存失败，请稍后再试|Couldn't save your card, try again");
  }
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      spark: input.spark,
      building: input.building,
      looking_for: input.lookingFor,
    })
    .eq("id", m.id);
  if (profileError) {
    console.error("[auth] save card back failed", {
      code: profileError.code,
      message: profileError.message,
    });
    return fail(
      "卡面已保存，背面没存上，请再点一次保存|The front saved but the back didn't, press save again",
    );
  }
  return ok(member);
}

/* ---------- projects ---------- */

/**
 * The signed-in member and a database client acting as them, for writes the
 * database ties to the member (a project's owner_id must be auth.uid()). Null
 * for visitors, people without a card yet, and development without Supabase.
 */
export async function memberWriter() {
  if (devMode()) return null;
  const session = await getSession();
  if (!session?.member) return null;
  const db = await getSupabaseAuth();
  return db ? { db, member: session.member } : null;
}

/** Shows or hides the member's card on /m/<handle> and the wall on /people. */
export async function setPublicCard(on: boolean): Promise<Result> {
  const session = await getSession();
  if (!session?.member) return fail("先生成你的卡片|Make your card first");
  if (devMode()) {
    const dev = await readDev();
    if (dev?.member) {
      await writeDev({ ...dev, member: { ...dev.member, isPublic: on } });
    }
    return ok(undefined);
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { error } = await supabase
    .from("profiles")
    .update({ is_public: on })
    .eq("id", session.member.id);
  if (error) {
    console.error("[auth] public card failed", {
      code: error.code,
      message: error.message,
    });
    return fail("没存上，请稍后再试|Couldn't save that, try again");
  }
  return ok(undefined);
}

/** Shows or hides the member's card on the projects they own. */
export async function setCardOnProjects(on: boolean): Promise<Result> {
  const session = await getSession();
  if (!session?.member) return fail("先生成你的卡片|Make your card first");
  if (devMode()) {
    const dev = await readDev();
    if (dev?.member) {
      await writeDev({ ...dev, member: { ...dev.member, cardOnProjects: on } });
    }
    return ok(undefined);
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { error } = await supabase
    .from("profiles")
    .update({ card_on_projects: on })
    .eq("id", session.member.id);
  if (error) {
    console.error("[auth] card on projects failed", {
      code: error.code,
      message: error.message,
    });
    return fail("没存上，请稍后再试|Couldn't save that, try again");
  }
  return ok(undefined);
}

/* ---------- stars ---------- */

// Development keeps stars in a second cookie, tied to the signed-in email, so
// the session writers above don't have to carry them.
const DEV_STARS_COOKIE = "bs_dev_stars";
/** Starred slugs with when, newest first. */
type DevStars = { email: string; stars: { slug: string; at: string }[] };

async function readDevStars(email: string): Promise<DevStars> {
  const raw = (await cookies()).get(DEV_STARS_COOKIE)?.value;
  try {
    const dev = raw
      ? (JSON.parse(Buffer.from(raw, "base64url").toString()) as DevStars)
      : null;
    if (dev?.email === email) return dev;
  } catch {}
  return { email, stars: [] };
}

async function writeDevStars(dev: DevStars | null) {
  const store = await cookies();
  if (!dev) {
    store.delete(DEV_STARS_COOKIE);
    return;
  }
  store.set(
    DEV_STARS_COOKIE,
    Buffer.from(JSON.stringify(dev)).toString("base64url"),
    { httpOnly: true, sameSite: "lax", path: "/" },
  );
}

/** Projects the signed-in member starred, newest first. Memoised per request. */
export const getMyStars = cache(async (): Promise<StarredProject[]> => {
  const session = await getSession();
  if (!session?.member) return [];
  if (devMode()) {
    const { stars } = await readDevStars(session.email);
    return stars.flatMap(({ slug, at }) => {
      const p = sampleProjects.find((s) => s.slug === slug);
      return p
        ? [{ slug, name: p.name, ownerName: p.ownerName, starredAt: at }]
        : [];
    });
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return [];
  // RLS returns only this member's stars, and only approved projects embed.
  const { data, error } = await supabase
    .from("project_stars")
    .select("created_at,projects!inner(slug,name,owner_name)")
    .order("created_at", { ascending: false })
    .limit(200)
    .overrideTypes<
      {
        created_at: string;
        projects: { slug: string; name: string; owner_name: string };
      }[]
    >();
  if (error) {
    console.error("[auth] my stars failed", { code: error.code });
    return [];
  }
  return data.map((s) => ({
    slug: s.projects.slug,
    name: s.projects.name,
    ownerName: s.projects.owner_name,
    starredAt: s.created_at,
  }));
});

/** Stars or unstars a public project; returns its new star count. */
export async function setStar(
  slug: string,
  starred: boolean,
): Promise<Result<number>> {
  const session = await getSession();
  if (!session?.member) return fail("先生成你的卡片|Make your card first");

  if (devMode()) {
    const project = sampleProjects.find((p) => p.slug === slug);
    if (!project) return fail("找不到这个项目|Project not found");
    const dev = await readDevStars(session.email);
    dev.stars = dev.stars.filter((s) => s.slug !== slug);
    if (starred) dev.stars.unshift({ slug, at: new Date().toISOString() });
    await writeDevStars(dev);
    return ok(project.starCount + (starred ? 1 : 0));
  }

  const supabase = await getSupabaseAuth();
  if (!supabase) return fail(CLOSED);
  const { data, error } = await supabase.rpc("set_project_star", {
    p_slug: slug,
    p_starred: starred,
  });
  if (error || typeof data !== "number") {
    if (error?.code === "P0002") {
      return fail("找不到这个项目|Project not found");
    }
    if (error?.code === "PT429") {
      return fail("点得太快了，请稍后再试|Too fast, try again in a moment");
    }
    console.error("[auth] set star failed", {
      code: error?.code,
      message: error?.message,
    });
    return fail("没点上，请再试一次|That didn't go through, try again");
  }
  return ok(data);
}
