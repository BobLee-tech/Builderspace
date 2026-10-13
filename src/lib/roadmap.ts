// The next eight weeks on the events page, aligned to the UNSW T3 2026 calendar.
// Update once a term; dates are Sydney local days.

type Bi = { zh: string; en: string };

export const ROADMAP_START = "2026-10-12";
export const ROADMAP_DAYS = 56;

export const ROADMAP_WEEKS: { label: string; off?: boolean; plan: Bi }[] = [
  { label: "W1", plan: { zh: "预热 · 官网上线", en: "Warm-up · site live" } },
  {
    label: "W2",
    off: true,
    plan: { zh: "停课周 · 首场工作坊", en: "Flex week · first workshop" },
  },
  {
    label: "W3",
    plan: { zh: "组队 Pitch · Build Night", en: "Team pitch · Build Night" },
  },
  {
    label: "W4",
    plan: { zh: "Demo Night 1 · 中期检查", en: "Demo Night 1 · check-in" },
  },
  { label: "W5", plan: { zh: "Build Night", en: "Build Night" } },
  {
    label: "W6",
    plan: {
      zh: "Demo Night 2 · 线下最后一场",
      en: "Demo Night 2 · last in person",
    },
  },
  {
    label: "W7",
    off: true,
    plan: { zh: "复习周 · 线上答疑", en: "Study week · online Q&A" },
  },
  { label: "W8", off: true, plan: { zh: "考试期", en: "Exams" } },
];

export const ROADMAP_MARKS: {
  date: string;
  kind: "checkpoint" | "lastday";
  label: Bi;
}[] = [
  {
    date: "2026-11-08",
    kind: "checkpoint",
    label: { zh: "中期检查 11/8", en: "Check-in 11/8" },
  },
  {
    date: "2026-11-20",
    kind: "lastday",
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

/** Monday of week `i`, formatted m/d. */
export function roadmapWeekStart(i: number) {
  const d = new Date(sydneyDay(ROADMAP_START) + i * 7 * DAY + 12 * 3_600_000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}
