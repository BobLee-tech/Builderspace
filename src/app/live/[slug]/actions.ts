"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_KEY_COOKIE } from "@/lib/admin";
import {
  feedbackSchema,
  isLiveStep,
  LIVE_COOKIE,
  liveConfig,
  parseSiteLink,
  pollSchema,
  type FeedbackAnswer,
  type LinkAnswer,
  type LinkCheck,
  type LiveStep,
} from "@/lib/event-live";
import {
  checkSite,
  getLiveStore,
  newLiveToken,
  type LiveStore,
} from "@/lib/live-store";

export type LiveResult =
  | { status: "ok"; check?: LinkCheck }
  | { status: "error"; message: string }
  /** Something looks off; sending again with `confirmed` goes through. */
  | { status: "confirm"; message: string };

const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);
const idSchema = z.uuid().or(z.string().regex(/^[0-9a-f]{16}$/));

const CLOSED: LiveResult = {
  status: "error",
  message: "现场还没开始，或者已经结束了|The live page isn't on right now",
};
const FAILED = {
  status: "error" as const,
  message: "出了点问题，再试一次|Something went wrong, try again",
};
const WHO: LiveResult = {
  status: "error",
  message: "先认一下你是谁|Tell us who you are first",
};

/** Runs against the store, turning a database failure into a retry message. */
async function withStore(run: (store: LiveStore) => Promise<LiveResult>) {
  const store = getLiveStore();
  if (!store) return CLOSED;
  try {
    return await run(store);
  } catch {
    return FAILED;
  }
}

async function token() {
  return (await cookies()).get(LIVE_COOKIE)?.value ?? "";
}

async function remember(value: string) {
  (await cookies()).set(LIVE_COOKIE, value, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 3,
  });
}

function identifyMessage(r: string): LiveResult {
  switch (r) {
    case "ok":
      return { status: "ok" };
    case "unknown":
      return {
        status: "error",
        message:
          "没找到这个微信号。换报名时填的那个试试，或者点下面的现场补登|We couldn't find that WeChat ID. Try the one you signed up with, or register here below",
      };
    case "closed":
      return CLOSED;
    case "throttled":
      return {
        status: "error",
        message: "试的人有点多，一分钟后再试|Too many tries, wait a minute",
      };
    default:
      return FAILED;
  }
}

// ---------- who you are ----------

export async function identify(
  slug: string,
  wechat: string,
): Promise<LiveResult> {
  const wx = z.string().trim().min(1).max(60).safeParse(wechat);
  if (!slugSchema.safeParse(slug).success) return FAILED;
  if (!wx.success) {
    return { status: "error", message: "填一下微信号|Enter your WeChat ID" };
  }
  return withStore(async (store) => {
    const t = newLiveToken();
    const r = await store.identify(slug, wx.data, t);
    if (r === "ok") await remember(t);
    return identifyMessage(r);
  });
}

const walkInSchema = z.object({
  fullName: z.string().trim().min(1, "必填|Required").max(40),
  wechat: z.string().trim().min(1, "必填|Required").max(60),
  school: z
    .string()
    .trim()
    .max(80)
    .transform((v) => v || null),
  githubUsername: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, "") || null)
    .pipe(
      z
        .string()
        .regex(
          /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i,
          "GitHub 用户名只有字母、数字和连字符|A GitHub username is letters, digits and hyphens",
        )
        .nullable(),
    ),
});

export async function walkIn(
  slug: string,
  input: {
    fullName: string;
    wechat: string;
    school: string;
    githubUsername: string;
  },
): Promise<LiveResult> {
  const parsed = walkInSchema.safeParse(input);
  if (!slugSchema.safeParse(slug).success) return FAILED;
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? FAILED.message,
    };
  }
  return withStore(async (store) => {
    const t = newLiveToken();
    const r = await store.walkIn(slug, parsed.data, t);
    if (r === "ok") await remember(t);
    return identifyMessage(r);
  });
}

/** "Not me": two people sharing a laptop, or a wrong match. */
export async function forgetMe(): Promise<void> {
  (await cookies()).delete(LIVE_COOKIE);
}

// ---------- handing things in ----------

export async function vote(
  slug: string,
  choice: string,
  note: string,
): Promise<LiveResult> {
  const parsed = pollSchema.safeParse({ choice, note });
  const options = liveConfig(slug).poll?.options ?? [];
  if (!slugSchema.safeParse(slug).success) return FAILED;
  if (!parsed.success || !options.some((o) => o.key === parsed.data.choice)) {
    return {
      status: "error",
      message: parsed.success
        ? "选一个|Pick one"
        : parsed.error.issues[0].message,
    };
  }
  return withStore(async (store) => {
    const r = await store.submit(
      slug,
      await token(),
      "poll",
      parsed.data,
      false,
    );
    return r === "ok" ? { status: "ok" } : r === "closed" ? CLOSED : WHO;
  });
}

export async function handInLink(
  slug: string,
  input: string,
  onWall: boolean,
  confirmed: boolean,
): Promise<LiveResult> {
  if (!slugSchema.safeParse(slug).success) return FAILED;
  const link = typeof input === "string" ? parseSiteLink(input) : null;
  if (!link) {
    return {
      status: "error",
      message:
        "看起来不像网址，例如 用户名.github.io|That doesn't look like a link, e.g. username.github.io",
    };
  }
  return withStore(async (store) => {
    const t = await token();
    const me = await store.me(slug, t);
    if (!me) return WHO;
    const signedUpAs = me.github?.toLowerCase();
    if (
      !confirmed &&
      link.githubUser &&
      signedUpAs &&
      link.githubUser !== signedUpAs
    ) {
      return {
        status: "confirm",
        message: `报名填的 GitHub 用户名是 ${signedUpAs}，网址里是 ${link.githubUser}。没错的话再点一次交上去|You signed up as ${signedUpAs}, but the link says ${link.githubUser}. If it's right, tap again`,
      };
    }
    const { check, title } = await checkSite(link);
    const answer: LinkAnswer = {
      url: link.url,
      host: link.host,
      kind: link.kind,
      check,
      title,
      checkedAt: new Date().toISOString(),
    };
    const r = await store.submit(slug, t, "link", answer, onWall === true);
    return r === "ok" ? { status: "ok", check } : r === "closed" ? CLOSED : WHO;
  });
}

/** Looks at a link that wasn't up yet (GitHub Pages takes a few minutes). */
export async function recheckLink(slug: string): Promise<LiveResult> {
  if (!slugSchema.safeParse(slug).success) return FAILED;
  return withStore(async (store) => {
    const t = await token();
    const me = await store.me(slug, t);
    const prev = me?.responses.link;
    if (!prev) return WHO;
    if (prev.payload.check === "live") return { status: "ok", check: "live" };
    const link = parseSiteLink(prev.payload.url);
    if (!link) return FAILED;
    const { check, title } = await checkSite(link);
    if (check === prev.payload.check) return { status: "ok", check };
    const answer: LinkAnswer = {
      ...prev.payload,
      check,
      title: title ?? prev.payload.title,
      checkedAt: new Date().toISOString(),
    };
    const r = await store.submit(slug, t, "link", answer, prev.onWall);
    return r === "ok" ? { status: "ok", check } : r === "closed" ? CLOSED : WHO;
  });
}

export async function sendFeedback(
  slug: string,
  input: FeedbackAnswer,
  photoConsent: boolean,
): Promise<LiveResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!slugSchema.safeParse(slug).success) return FAILED;
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }
  return withStore(async (store) => {
    const r = await store.submit(
      slug,
      await token(),
      "feedback",
      parsed.data,
      false,
      photoConsent === true,
    );
    return r === "ok" ? { status: "ok" } : r === "closed" ? CLOSED : WHO;
  });
}

export async function like(
  slug: string,
  responseId: string,
  on: boolean,
  note: string,
): Promise<LiveResult> {
  const text = z
    .string()
    .trim()
    .max(80)
    .safeParse(note ?? "");
  if (
    !slugSchema.safeParse(slug).success ||
    !idSchema.safeParse(responseId).success
  ) {
    return FAILED;
  }
  if (!text.success) {
    return { status: "error", message: "最多 80 个字|At most 80 characters" };
  }
  return withStore(async (store) => {
    const r = await store.heart(
      slug,
      await token(),
      responseId,
      on === true,
      text.data || null,
    );
    return r === "ok" ? { status: "ok" } : WHO;
  });
}

// ---------- host ----------

async function adminKey() {
  return (await cookies()).get(ADMIN_KEY_COOKIE)?.value ?? "";
}

function hostMessage(r: string): LiveResult {
  if (r === "ok") return { status: "ok" };
  if (r === "throttled") {
    return {
      status: "error",
      message:
        "口令输错太多次，10 分钟后再试|Too many wrong keys, wait 10 minutes",
    };
  }
  if (r === "missing")
    return { status: "error", message: "找不到这一条|Not found" };
  return {
    status: "error",
    message: "先在 /admin 输入管理员口令|Sign in at /admin first",
  };
}

export async function setLiveStep(
  slug: string,
  step: LiveStep | null,
): Promise<LiveResult> {
  if (
    !slugSchema.safeParse(slug).success ||
    (step !== null && !isLiveStep(step))
  ) {
    return FAILED;
  }
  return withStore(async (store) =>
    hostMessage(await store.hostStep(slug, await adminKey(), step)),
  );
}

export async function setSpotlight(
  slug: string,
  responseId: string | null,
): Promise<LiveResult> {
  if (
    !slugSchema.safeParse(slug).success ||
    (responseId !== null && !idSchema.safeParse(responseId).success)
  ) {
    return FAILED;
  }
  return withStore(async (store) =>
    hostMessage(await store.hostSpotlight(slug, await adminKey(), responseId)),
  );
}

export async function setHidden(
  slug: string,
  responseId: string,
  hidden: boolean,
): Promise<LiveResult> {
  if (
    !slugSchema.safeParse(slug).success ||
    !idSchema.safeParse(responseId).success
  ) {
    return FAILED;
  }
  return withStore(async (store) =>
    hostMessage(
      await store.hostHide(slug, await adminKey(), responseId, hidden === true),
    ),
  );
}
