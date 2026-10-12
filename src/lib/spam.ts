// Cheap bot filters for the public forms. No CAPTCHA: most of them don't load
// in mainland China, where many members spend the holidays.

export const HONEYPOT_FIELD = "website";
export const STARTED_AT_FIELD = "startedAt";
/** People need longer than this to fill any of our forms. */
export const MIN_FILL_MS = 2500;

/**
 * True when the submission looks automated: the hidden honeypot was filled,
 * or the form came back faster than a person could type it. Callers should
 * pretend success so bots get no signal.
 */
export function looksAutomated(form: FormData, now = Date.now()): boolean {
  if (String(form.get(HONEYPOT_FIELD) ?? "").trim() !== "") return true;
  const started = Number(form.get(STARTED_AT_FIELD));
  if (!Number.isFinite(started) || started <= 0) return true;
  return now - started < MIN_FILL_MS;
}
