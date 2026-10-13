// All event times are shown in Sydney time, whatever the server's zone is.
const TZ = "Australia/Sydney";

const dateFmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ,
  month: "numeric",
  day: "numeric",
  weekday: "short",
});
const shortDateFmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ,
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 10/21周三 */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** 10/21 */
export function formatShortDate(iso: string): string {
  return shortDateFmt.format(new Date(iso));
}

/** 18:30 */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** 18:30 – 20:30 */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${timeFmt.format(new Date(startIso))} – ${timeFmt.format(new Date(endIso))}`;
}
