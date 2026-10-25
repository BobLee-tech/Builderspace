import "server-only";
import { randomUUID } from "node:crypto";
import type { PostgrestError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { maskEmail, type RegistrationInput } from "./forms";
import { getSupabase } from "./supabase/client";
import type { MySignup, RegistrationStatus } from "./types";

// Event sign-ups, through the security-definer functions in
// 20261020040000_event_registration_email.sql. The database sends the
// confirmation email; this side remembers which sign-up this browser made in
// an httpOnly cookie scoped to the event page, so a refresh shows the success
// card instead of the form. Without Supabase, development keeps sign-ups in
// memory (and sends nothing) and production refuses.

export type RegisterResult =
  | { id: string; status: RegistrationStatus; already: boolean }
  | { error: PostgrestError };

/** sent · wait (sent in the last 10 minutes) · missing · failed */
export type ResendResult = "sent" | "wait" | "missing" | "failed";

export type SignupStore = {
  register(r: RegistrationInput): Promise<RegisterResult>;
  mine(slug: string, id: string): Promise<MySignup | null>;
  resend(id: string): Promise<ResendResult>;
};

export function getSignupStore(): SignupStore | null {
  const db = getSupabase();
  if (db) return supabaseStore(db);
  if (process.env.NODE_ENV === "production") return null;
  return memoryStore();
}

// ---------- this browser's sign-up ----------

const COOKIE = "bs-signup";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Only in a Server Action: cookies can't be set while rendering. */
export async function rememberSignup(slug: string, id: string) {
  (await cookies()).set(COOKIE, id, {
    // Each event page keeps its own; other pages never see it.
    path: `/events/${slug}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function mySignupId(): Promise<string | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  return id && UUID.test(id) ? id : null;
}

/**
 * The sign-up this browser made for the event, or null (none, cancelled, or
 * the lookup failed: the form shows, and signing up again finds the old one).
 * Reads cookies, so call it inside <Suspense>, never under "use cache".
 */
export async function findMySignup(slug: string): Promise<MySignup | null> {
  const id = await mySignupId();
  if (!id) return null;
  try {
    return (await getSignupStore()?.mine(slug, id)) ?? null;
  } catch {
    return null;
  }
}

// ---------- Supabase ----------

function supabaseStore(
  db: NonNullable<ReturnType<typeof getSupabase>>,
): SignupStore {
  return {
    async register(r) {
      const { data, error } = await db
        .rpc("register_for_event", {
          p_event_slug: r.slug,
          p_full_name: r.fullName,
          p_wechat: r.wechat,
          p_email: r.email,
          p_seat_group: r.seatGroup,
          p_zid: r.zid,
          p_school: r.school,
          p_occupation: r.occupation,
          p_github_username: r.githubUsername,
          p_coding_level: r.codingLevel,
          p_channel: r.channel,
        })
        .single<{
          status: RegistrationStatus;
          already_registered: boolean;
          registration_id: string;
        }>();
      if (error) return { error };
      return {
        id: data.registration_id,
        status: data.status,
        already: data.already_registered,
      };
    },

    async mine(slug, id) {
      const { data, error } = await db
        .rpc("my_event_registration", {
          p_event_slug: slug,
          p_registration_id: id,
        })
        .maybeSingle<{
          full_name: string;
          status: RegistrationStatus;
          email_hint: string | null;
        }>();
      if (error) {
        console.error("[signup] lookup failed", {
          code: error.code,
          message: error.message,
        });
        return null;
      }
      return (
        data && {
          name: data.full_name,
          status: data.status,
          emailHint: data.email_hint,
        }
      );
    },

    async resend(id) {
      const { data, error } = await db.rpc("resend_event_confirmation", {
        p_registration_id: id,
      });
      if (error) {
        console.error("[signup] resend failed", {
          code: error.code,
          message: error.message,
        });
        return "failed";
      }
      return (
        (["sent", "wait", "missing"] as const).find((v) => v === data) ??
        "failed"
      );
    },
  };
}

// ---------- development without Supabase ----------

type MemSignup = {
  id: string;
  slug: string;
  name: string;
  wechat: string;
  email: string;
  sentAt: number;
};

const globalMem = globalThis as typeof globalThis & {
  __bsSignups?: MemSignup[];
};

function memoryStore(): SignupStore {
  const all = (globalMem.__bsSignups ??= []);
  const toMine = (s: MemSignup): MySignup => ({
    name: s.name,
    status: "confirmed",
    emailHint: maskEmail(s.email),
  });
  return {
    async register(r) {
      // Same rule as the database: one sign-up per WeChat ID and per email.
      const prev = all.find(
        (s) =>
          s.slug === r.slug &&
          (s.wechat.toLowerCase() === r.wechat.toLowerCase() ||
            s.email === r.email),
      );
      if (prev) return { id: prev.id, status: "confirmed", already: true };
      const id = randomUUID();
      all.push({
        id,
        slug: r.slug,
        name: r.fullName,
        wechat: r.wechat,
        email: r.email,
        sentAt: Date.now(),
      });
      console.info("[signup] development: kept in memory, no email sent");
      return { id, status: "confirmed", already: false };
    },
    async mine(slug, id) {
      const s = all.find((x) => x.id === id && x.slug === slug);
      return s ? toMine(s) : null;
    },
    async resend(id) {
      const s = all.find((x) => x.id === id);
      if (!s) return "missing";
      if (Date.now() - s.sentAt < 10 * 60 * 1000) return "wait";
      s.sentAt = Date.now();
      return "sent";
    },
  };
}
