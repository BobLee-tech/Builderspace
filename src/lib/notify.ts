// The owner's two email settings per project, as project_notify_prefs stores
// them (20261101000000_owner_notify.sql, which also does the sending).

type Bi = { zh: string; en: string };

export const NOTIFY_COMMENTS = ["instant", "daily", "off"] as const;
export const NOTIFY_STARS = ["weekly", "milestone", "off"] as const;
export type NotifyComments = (typeof NOTIFY_COMMENTS)[number];
export type NotifyStars = (typeof NOTIFY_STARS)[number];

export type NotifyPrefs = { comments: NotifyComments; stars: NotifyStars };
export const DEFAULT_NOTIFY: NotifyPrefs = {
  comments: "instant",
  stars: "weekly",
};

export const NOTIFY_COMMENTS_LABEL: Record<NotifyComments, Bi> = {
  instant: { zh: "即时", en: "Right away" },
  daily: { zh: "每日汇总", en: "Daily" },
  off: { zh: "不提醒", en: "Off" },
};
export const NOTIFY_STARS_LABEL: Record<NotifyStars, Bi> = {
  weekly: { zh: "每周汇总", en: "Weekly" },
  milestone: { zh: "只在里程碑", en: "Milestones" },
  off: { zh: "不提醒", en: "Off" },
};

export const NOTIFY_COMMENTS_HINT: Record<NotifyComments, Bi> = {
  instant: {
    zh: "10 分钟内的评论合成一封",
    en: "Comments within 10 minutes come in one email",
  },
  daily: { zh: "悉尼时间早上 9 点", en: "9am Sydney time" },
  off: { zh: "只在项目页上看", en: "Check the project page yourself" },
};
export const NOTIFY_STARS_HINT: Record<NotifyStars, Bi> = {
  weekly: {
    zh: "周一早上，这周没人 Star 就不发",
    en: "Mondays, only if someone starred",
  },
  milestone: {
    zh: "第 1、10、50、100 个 Star",
    en: "Your 1st, 10th, 50th and 100th star",
  },
  off: { zh: "不发 Star 的信", en: "No star emails" },
};

/** Reads both settings from a form, falling back to the defaults. */
export function readNotify(form: FormData): NotifyPrefs {
  const c = form.get("notifyComments");
  const s = form.get("notifyStars");
  return {
    comments: NOTIFY_COMMENTS.find((v) => v === c) ?? DEFAULT_NOTIFY.comments,
    stars: NOTIFY_STARS.find((v) => v === s) ?? DEFAULT_NOTIFY.stars,
  };
}

/** Which mail an unsubscribe link turns off. */
export type UnsubscribeKind = "comments" | "stars";
export const isUnsubscribeKind = (k: unknown): k is UnsubscribeKind =>
  k === "comments" || k === "stars";
