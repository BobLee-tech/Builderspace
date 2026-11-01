import "server-only";
import type { NotifyComments, NotifyStars, UnsubscribeKind } from "./notify";
import { getSupabase, isSupabaseConfigured } from "./supabase/client";

// The unsubscribe link at the bottom of every owner email: a project's token
// and which kind of mail, no sign-in (owner_unsubscribe in
// 20261101000000_owner_notify.sql). Without Supabase, development answers for
// a made-up project so /unsubscribe can be looked at.

export type UnsubscribeTarget = {
  name: string;
  comments: NotifyComments;
  stars: NotifyStars;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const devMode = () =>
  !isSupabaseConfigured() && process.env.NODE_ENV !== "production";

/** The project a link is for and its current settings; null for a bad link. */
export async function peekUnsubscribe(
  token: string,
): Promise<UnsubscribeTarget | null> {
  if (!UUID.test(token)) return null;
  if (devMode())
    return { name: "CourseMate", comments: "instant", stars: "weekly" };
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .rpc("owner_unsubscribe_peek", { p_token: token })
    .maybeSingle<UnsubscribeTarget>();
  if (error) {
    console.error("[unsubscribe] peek failed", { code: error.code });
    return null;
  }
  return data;
}

/** Turns one kind of mail off; true when the link was good. */
export async function unsubscribe(
  token: string,
  kind: UnsubscribeKind,
): Promise<boolean> {
  if (!UUID.test(token)) return false;
  if (devMode()) return true;
  const db = getSupabase();
  if (!db) return false;
  const { data, error } = await db.rpc("owner_unsubscribe", {
    p_token: token,
    p_kind: kind,
  });
  if (error) {
    console.error("[unsubscribe] failed", { code: error.code });
    return false;
  }
  return typeof data === "string";
}
