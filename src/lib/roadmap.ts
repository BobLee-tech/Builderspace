// The next eight weeks on the events page, aligned to the UNSW T3 2026 calendar.
// Update once a term; dates are Sydney local days.

type Bi = { zh: string; en: string };

export const ROADMAP_START = "2026-10-12";
export const ROADMAP_DAYS = 56;

/**
 * The school calendar for each week (`term`) and anything already settled
 * that isn't an event (`plan`). Events themselves come from the events table
 * and land in their week; a later week with neither reads "TBD".
 */
export const ROADMAP_WEEKS: {
  label: string;
  off?: boolean;
  term?: Bi;
  plan?: Bi;
}[] = [
  { label: "W1", plan: { zh: "预热 · 官网上线", en: "Warm-up · site live" } },
  { label: "W2", off: true, term: { zh: "停课周", en: "Flex week" } },
  { label: "W3" },
  { label: "W4" },
  { label: "W5" },
  { label: "W6" },
  { label: "W7", off: true, term: { zh: "复习周", en: "Study week" } },
  { label: "W8", off: true, term: { zh: "考试期", en: "Exams" } },
];

/** Dates worth a line on the strip: the school calendar only. */
export const ROADMAP_MARKS: { date: string; label: Bi }[] = [
  {
    date: "2026-11-20",
    label: { zh: "T3 最后教学日 11/20", en: "Last T3 teaching day 11/20" },
  },
];

const DAY = 86_400_000;
/** Midnight in Sydney for a yyyy-mm-dd day (AEDT, UTC+11, for the whole of T3). */
const sydneyDay = (d: string) => Date.parse(`${d}T00:00:00+11:00`);

/** 0–1 position of a date (or timestamp) along the strip. */
export function roadmapOffset(at: string | number) {
  const t = typeof at === "string" ? sydneyDay(at) : at;
  return (t - sydneyDay(ROADMAP_START)) / (ROADMAP_DAYS * DAY);
}

/** Index of the week a moment falls in, or -1 outside the strip. */
export function roadmapWeek(at: string | number) {
  const k = roadmapOffset(typeof at === "string" ? Date.parse(at) : at);
  return k < 0 || k >= 1 ? -1 : Math.floor(k * ROADMAP_WEEKS.length);
}

/** Monday of week `i`, formatted m/d. */
export function roadmapWeekStart(i: number) {
  const d = new Date(sydneyDay(ROADMAP_START) + i * 7 * DAY + 12 * 3_600_000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}
