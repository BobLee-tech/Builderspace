// Comment moderation on the site itself. There are no accounts: an admin types
// the key kept in Supabase Vault (comment_admin_key) once at /admin, and the
// database checks it on every delete (migration 20261015060000).

/** httpOnly: the key itself, read only by server actions. */
export const ADMIN_KEY_COOKIE = "bs-admin-key";
/** Readable by the page, only to decide whether to show the delete buttons. */
export const ADMIN_FLAG_COOKIE = "bs-admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** True when this browser has signed in at /admin (client side only). */
export function hasAdminFlag(): boolean {
  return document.cookie
    .split(";")
    .some((c) => c.trim() === `${ADMIN_FLAG_COOKIE}=1`);
}
