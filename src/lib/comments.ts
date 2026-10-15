import type { CommentKind, ProjectComment } from "./types";

export type Thread = {
  id: string;
  /** null when the top-level comment was deleted but replies remain. */
  root: ProjectComment | null;
  replies: ProjectComment[];
  /** Latest activity in the thread, for "newest first". */
  at: string;
};

/** Top-level comments of one kind (replies have none). */
export function countKind(comments: ProjectComment[], kind: CommentKind) {
  return comments.filter((c) => !c.parentId && c.kind === kind).length;
}

/**
 * Groups comments (oldest first) into one-level threads. Replies whose comment
 * was deleted stay together under a placeholder thread.
 */
export function threadsOf(comments: ProjectComment[]): Thread[] {
  const byId = new Map<string, Thread>();
  for (const c of comments) {
    if (!c.parentId)
      byId.set(c.id, { id: c.id, root: c, replies: [], at: c.createdAt });
  }
  for (const c of comments) {
    if (!c.parentId) continue;
    let t = byId.get(c.parentId);
    if (!t) {
      t = { id: c.parentId, root: null, replies: [], at: c.createdAt };
      byId.set(c.parentId, t);
    }
    t.replies.push(c);
    if (c.createdAt > t.at) t.at = c.createdAt;
  }
  return [...byId.values()];
}
