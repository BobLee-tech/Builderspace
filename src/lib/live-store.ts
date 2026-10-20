import "server-only";
import { createHash, randomBytes } from "node:crypto";
import {
  EMPTY_STATE,
  isCheckedHost,
  isLiveStep,
  titleFromHtml,
  type AnswerStep,
  type HostResponse,
  type HostState,
  type LinkAnswer,
  type LinkCheck,
  type LiveMe,
  type LiveState,
  type LiveStep,
  type SiteLink,
} from "./event-live";
import { getSupabase } from "./supabase/client";

// Everything the live pages read and write, through the security-definer
// functions in 20261021000000_event_live.sql. Without Supabase, development
// keeps it in memory and production says it's closed.

/** busy: the sign-up table's insert throttle (20 a minute) turned away a
 * walk-in; trying again shortly works. */
export type JoinResult = "ok" | "closed" | "denied" | "busy";
export type WriteResult = "ok" | "denied" | "closed";
export type HostResult = "ok" | "denied" | "throttled" | "missing";

export type LiveStore = {
  /** Events whose live page is on right now. */
  liveSlugs(): Promise<string[]>;
  /** Signs this device in by name: the matching sign-up, or a new walk-in. */
  join(slug: string, fullName: string, token: string): Promise<JoinResult>;
  state(slug: string): Promise<LiveState | null>;
  me(slug: string, token: string): Promise<LiveMe | null>;
  submit(
    slug: string,
    token: string,
    step: AnswerStep,
    payload: object,
    onWall: boolean,
  ): Promise<WriteResult>;
  heart(
    slug: string,
    token: string,
    responseId: string,
    on: boolean,
    note: string | null,
  ): Promise<"ok" | "denied">;
  hostState(
    slug: string,
    key: string,
  ): Promise<HostState | "denied" | "throttled" | null>;
  hostStep(
    slug: string,
    key: string,
    step: LiveStep | null,
  ): Promise<HostResult>;
  hostSpotlight(
    slug: string,
    key: string,
    id: string | null,
  ): Promise<HostResult>;
  hostHide(
    slug: string,
    key: string,
    id: string,
    hidden: boolean,
  ): Promise<HostResult>;
};

export const newLiveToken = () => randomBytes(32).toString("hex");

export function getLiveStore(): LiveStore | null {
  const db = getSupabase();
  if (db) return supabaseStore(db);
  if (process.env.NODE_ENV === "production") return null;
  return memoryStore();
}

/** Turns a string reply from the database into one of the known answers. */
function oneOf<const T extends string>(
  value: unknown,
  known: readonly T[],
  fallback: NoInfer<T>,
): T {
  return known.includes(value as T) ? (value as T) : fallback;
}

function supabaseStore(
  db: NonNullable<ReturnType<typeof getSupabase>>,
): LiveStore {
  async function call(fn: string, args: Record<string, unknown>) {
    const { data, error } = await db.rpc(fn, args);
    if (error) {
      // `details` can echo arguments (tokens, WeChat IDs), so it stays out.
      console.error(`[live] ${fn} failed`, {
        code: error.code,
        message: error.message,
      });
      throw Object.assign(new Error(`live ${fn} failed`), { code: error.code });
    }
    return data as unknown;
  }
  const hostVerdict = ["ok", "denied", "throttled", "missing"] as const;

  return {
    async liveSlugs() {
      const { data, error } = await db
        .from("events")
        .select("slug")
        .eq("published", true)
        .not("live_step", "is", null)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data.map((e) => e.slug as string);
    },
    async join(slug, fullName, token) {
      try {
        const r = await call("live_join", {
          p_slug: slug,
          p_full_name: fullName,
          p_token: token,
        });
        return oneOf(r, ["ok", "closed", "denied"], "denied");
      } catch (e) {
        if ((e as { code?: string }).code === "PT429") return "busy";
        throw e;
      }
    },
    async state(slug) {
      const r = (await call("live_state", {
        p_slug: slug,
      })) as LiveState | null;
      if (!r) return null;
      return { ...EMPTY_STATE, ...r, step: isLiveStep(r.step) ? r.step : null };
    },
    async me(slug, token) {
      return (await call("live_me", {
        p_slug: slug,
        p_token: token,
      })) as LiveMe | null;
    },
    async submit(slug, token, step, payload, onWall) {
      const r = await call("live_submit", {
        p_slug: slug,
        p_token: token,
        p_step: step,
        p_payload: payload,
        p_on_wall: onWall,
      });
      return oneOf(r, ["ok", "denied", "closed"], "denied");
    },
    async heart(slug, token, responseId, on, note) {
      const r = await call("live_heart", {
        p_slug: slug,
        p_token: token,
        p_response_id: responseId,
        p_on: on,
        p_note: note,
      });
      return r === "ok" ? "ok" : "denied";
    },
    async hostState(slug, key) {
      const r = (await call("live_host_state", {
        p_slug: slug,
        p_admin_key: key,
      })) as (HostState & { denied?: undefined }) | { denied: string } | null;
      if (!r) return null;
      if (r.denied) return r.denied === "throttled" ? "throttled" : "denied";
      const s = r as HostState;
      return { ...s, step: isLiveStep(s.step) ? s.step : null };
    },
    async hostStep(slug, key, step) {
      const r = await call("live_host_step", {
        p_slug: slug,
        p_admin_key: key,
        p_step: step ?? "",
      });
      return oneOf(r, hostVerdict, "denied");
    },
    async hostSpotlight(slug, key, id) {
      const r = await call("live_host_spotlight", {
        p_slug: slug,
        p_admin_key: key,
        p_response_id: id,
      });
      return oneOf(r, hostVerdict, "denied");
    },
    async hostHide(slug, key, id, hidden) {
      const r = await call("live_host_hide", {
        p_slug: slug,
        p_admin_key: key,
        p_response_id: id,
        p_hidden: hidden,
      });
      return oneOf(r, hostVerdict, "denied");
    },
  };
}

// ---------- development without Supabase ----------

type MemPerson = {
  id: string;
  slug: string;
  name: string;
  github: string | null;
  checkedIn: boolean;
  walkIn: boolean;
};
type MemResponse = {
  id: string;
  personId: string;
  step: AnswerStep;
  payload: Record<string, unknown>;
  onWall: boolean;
  hidden: boolean;
  at: number;
};
type MemEvent = { step: LiveStep | null; spotlight: string | null };
type Mem = {
  events: Map<string, MemEvent>;
  people: MemPerson[];
  sessions: Map<string, string>;
  responses: MemResponse[];
  hearts: {
    responseId: string;
    personId: string;
    note: string | null;
    at: number;
  }[];
};

const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const id = () => randomBytes(8).toString("hex");

// Survives hot reloads in `next dev`.
const globalMem = globalThis as typeof globalThis & { __bsLive?: Mem };

function mem(): Mem {
  if (!globalMem.__bsLive) {
    const m: Mem = {
      events: new Map(),
      people: [],
      sessions: new Map(),
      responses: [],
      hearts: [],
    };
    // A few people who already handed things in, so the screen has something
    // to show while you try it.
    const seed = [
      ["Ada", "claude", "ada-lin", "写代码最稳", "额度不够用"],
      ["林林", "deepseek", "linlin-design", "免费又快", ""],
      ["Kai", "chatgpt", "kaiwong", "", "话太多"],
      ["Mia", "gemini", "mia-studio", "", ""],
    ] as const;
    for (const [name, choice, gh, like, pain] of seed) {
      const p: MemPerson = {
        id: id(),
        slug: "put-yourself-online",
        name,
        github: gh,
        checkedIn: true,
        walkIn: false,
      };
      m.people.push(p);
      m.responses.push(
        {
          id: id(),
          personId: p.id,
          step: "poll",
          payload: { choice, like: like || undefined, pain: pain || undefined },
          onWall: false,
          hidden: false,
          at: Date.now(),
        },
        {
          id: id(),
          personId: p.id,
          step: "link",
          payload: {
            url: `https://${gh}.github.io`,
            host: `${gh}.github.io`,
            kind: "pages",
            check: "live",
            title: `${name} · Personal site`,
            checkedAt: new Date().toISOString(),
          },
          onWall: true,
          hidden: false,
          at: Date.now(),
        },
      );
    }
    globalMem.__bsLive = m;
  }
  return globalMem.__bsLive;
}

function memoryStore(): LiveStore {
  const m = mem();
  const event = (slug: string) => {
    let e = m.events.get(slug);
    if (!e) m.events.set(slug, (e = { step: null, spotlight: null }));
    return e;
  };
  const person = (slug: string, token: string) => {
    const pid = m.sessions.get(hash(token));
    return m.people.find((p) => p.id === pid && p.slug === slug) ?? null;
  };
  const responsesOf = (slug: string) => {
    const ids = new Set(
      m.people.filter((p) => p.slug === slug).map((p) => p.id),
    );
    return m.responses.filter((r) => ids.has(r.personId));
  };
  const heartsOf = (rid: string) =>
    m.hearts.filter((h) => h.responseId === rid);
  const start = (p: MemPerson, token: string) => {
    m.sessions.set(hash(token), p.id);
    p.checkedIn = true;
  };
  const count = <T>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;

  return {
    async liveSlugs() {
      return [...m.events].filter(([, e]) => e.step).map(([slug]) => slug);
    },
    async join(slug, fullName, token) {
      if (!event(slug).step) return "closed";
      const name = fullName.trim().replace(/\s+/g, " ");
      if (!name || name.length > 40) return "denied";
      let p = m.people.find(
        (x) => x.slug === slug && x.name.toLowerCase() === name.toLowerCase(),
      );
      if (!p) {
        p = {
          id: id(),
          slug,
          name,
          github: null,
          checkedIn: false,
          walkIn: true,
        };
        m.people.push(p);
      }
      start(p, token);
      return "ok";
    },
    async state(slug) {
      const e = event(slug);
      const rs = responsesOf(slug);
      const nameOf = (pid: string) =>
        m.people.find((p) => p.id === pid)?.name ?? "";
      const poll: Record<string, number> = {};
      for (const r of rs.filter((x) => x.step === "poll")) {
        const c = String(r.payload.choice);
        poll[c] = (poll[c] ?? 0) + 1;
      }
      const links = rs.filter((r) => r.step === "link");
      const fb = rs.filter((r) => r.step === "feedback").map((r) => r.payload);
      const ratings = fb.map((f) => Number(f.rating));
      return {
        step: e.step,
        spotlight: e.spotlight,
        checkedIn: count(m.people, (p) => p.slug === slug && p.checkedIn),
        poll,
        pollNotes: rs
          .filter(
            (r) =>
              r.step === "poll" &&
              !r.hidden &&
              (r.payload.like || r.payload.pain),
          )
          .sort((a, b) => b.at - a.at)
          .slice(0, 12)
          .map((r) => ({
            choice: String(r.payload.choice),
            like: (r.payload.like as string | undefined) ?? null,
            pain: (r.payload.pain as string | undefined) ?? null,
          })),
        links: {
          total: links.length,
          live: count(links, (r) => r.payload.check === "live"),
          pending: count(links, (r) => r.payload.check === "pending"),
          pages: count(links, (r) => r.payload.kind === "pages"),
        },
        wall: links
          .filter((r) => r.onWall && !r.hidden)
          .map((r) => {
            const p = r.payload as LinkAnswer;
            return {
              id: r.id,
              name: nameOf(r.personId),
              url: p.url,
              host: p.host,
              kind: p.kind,
              check: p.check,
              title: p.title ?? null,
              hearts: heartsOf(r.id).length,
              at: r.at,
            };
          })
          .sort((a, b) => b.hearts - a.hearts || b.at - a.at)
          .map((w) => ({ ...w, at: undefined })),
        feedback: {
          n: fb.length,
          avg: ratings.length
            ? Math.round(
                (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10,
              ) / 10
            : null,
          friends: {
            "0": count(fb, (f) => f.friends === "0"),
            "1-2": count(fb, (f) => f.friends === "1-2"),
            "3-5": count(fb, (f) => f.friends === "3-5"),
            "6+": count(fb, (f) => f.friends === "6+"),
          },
        },
      };
    },
    async me(slug, token) {
      const p = person(slug, token);
      if (!p) return null;
      const mine = m.responses.filter((r) => r.personId === p.id);
      const link = mine.find((r) => r.step === "link");
      const got = link ? heartsOf(link.id) : [];
      return {
        name: p.name,
        github: p.github,
        responses: Object.fromEntries(
          mine.map((r) => [
            r.step,
            {
              id: r.id,
              payload: r.payload,
              onWall: r.onWall,
              hidden: r.hidden,
            },
          ]),
        ) as LiveMe["responses"],
        hearted: m.hearts
          .filter((h) => h.personId === p.id)
          .map((h) => h.responseId),
        received: {
          hearts: got.length,
          notes: got
            .filter((h) => h.note)
            .sort((a, b) => b.at - a.at)
            .map((h) => h.note!),
        },
      };
    },
    async submit(slug, token, step, payload, onWall) {
      const p = person(slug, token);
      if (!p) return "denied";
      if (!event(slug).step) return "closed";
      const prev = m.responses.find(
        (r) => r.personId === p.id && r.step === step,
      );
      if (prev) Object.assign(prev, { payload, onWall, at: Date.now() });
      else
        m.responses.push({
          id: id(),
          personId: p.id,
          step,
          payload: payload as Record<string, unknown>,
          onWall,
          hidden: false,
          at: Date.now(),
        });
      return "ok";
    },
    async heart(slug, token, responseId, on, note) {
      const p = person(slug, token);
      const r = m.responses.find((x) => x.id === responseId);
      if (
        !p ||
        !r ||
        r.step !== "link" ||
        !r.onWall ||
        r.hidden ||
        r.personId === p.id
      )
        return "denied";
      m.hearts = m.hearts.filter(
        (h) => !(h.responseId === responseId && h.personId === p.id && !on),
      );
      const h = m.hearts.find(
        (x) => x.responseId === responseId && x.personId === p.id,
      );
      if (on && h) h.note = note ?? h.note;
      else if (on)
        m.hearts.push({ responseId, personId: p.id, note, at: Date.now() });
      return "ok";
    },
    async hostState(slug) {
      const e = event(slug);
      const people = m.people.filter((p) => p.slug === slug);
      return {
        step: e.step,
        spotlight: e.spotlight,
        registered: people.length,
        checkedIn: count(people, (p) => p.checkedIn),
        walkIns: count(people, (p) => p.walkIn),
        responses: responsesOf(slug)
          .sort((a, b) => b.at - a.at)
          .map((r): HostResponse => {
            const p = people.find((x) => x.id === r.personId)!;
            return {
              id: r.id,
              step: r.step,
              name: p.name,
              github: p.github,
              payload: r.payload,
              onWall: r.onWall,
              hidden: r.hidden,
              hearts: heartsOf(r.id).length,
              at: new Date(r.at).toISOString(),
            };
          }),
      };
    },
    async hostStep(slug, _key, step) {
      const e = event(slug);
      e.step = step;
      if (step !== "show") e.spotlight = null;
      return "ok";
    },
    async hostSpotlight(slug, _key, rid) {
      const e = event(slug);
      if (
        rid &&
        !responsesOf(slug).some((r) => r.id === rid && r.step === "link")
      )
        return "missing";
      e.spotlight = rid;
      return "ok";
    },
    async hostHide(slug, _key, rid, hidden) {
      const r = responsesOf(slug).find((x) => x.id === rid);
      if (!r) return "missing";
      r.hidden = hidden;
      const e = event(slug);
      if (hidden && e.spotlight === rid) e.spotlight = null;
      return "ok";
    },
  };
}

// ---------- is the site up? ----------

const MAX_HOPS = 3;
const MAX_BYTES = 64 * 1024;

/**
 * Opens a handed-in site (only hosts in isCheckedHost, never following a
 * redirect elsewhere) and reads its <title>. A 404 on *.github.io means Pages
 * hasn't finished building, which takes up to ten minutes.
 */
export async function checkSite(
  link: SiteLink,
): Promise<{ check: LinkCheck; title?: string }> {
  if (!isCheckedHost(link.host)) return { check: "unchecked" };
  let url = link.url;
  try {
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const res = await fetch(url, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: {
          "user-agent":
            "BuilderSpace live check (+https://builderspace.dev/live)",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = new URL(res.headers.get("location") ?? "", url);
        if (next.protocol !== "https:" || !isCheckedHost(next.hostname)) {
          return { check: "unchecked" };
        }
        url = next.toString();
        continue;
      }
      if (res.status === 404) {
        return { check: link.kind === "pages" ? "pending" : "down" };
      }
      if (!res.ok) return { check: "unchecked" };
      return { check: "live", title: await readTitle(res) };
    }
  } catch {
    // Timeout or network trouble: we just don't know.
  }
  return { check: "unchecked" };
}

async function readTitle(res: Response): Promise<string | undefined> {
  if (!res.body || !(res.headers.get("content-type") ?? "").includes("html"))
    return undefined;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  void reader.cancel().catch(() => {});
  const html = new TextDecoder().decode(Buffer.concat(chunks));
  return titleFromHtml(html);
}
