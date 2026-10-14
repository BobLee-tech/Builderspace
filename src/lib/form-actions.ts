import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";
import { fieldErrors, type FormState } from "./forms";

/** SQLSTATE raised by throttle_public_inserts(); PostgREST answers HTTP 429. */
const THROTTLED = "PT429";

export function invalidForm(error: z.ZodError): FormState {
  return {
    status: "error",
    message: "有几项还没填好|A few fields need attention",
    fieldErrors: fieldErrors(error),
  };
}

/**
 * No Supabase configured: the form is closed in production, and in development
 * the submission is logged (pass it already redacted) and dropped.
 */
export function withoutDatabase(
  scope: string,
  closedMessage: string,
  loggable: unknown,
  ok: FormState,
): FormState {
  if (process.env.NODE_ENV === "production") {
    return { status: "error", message: closedMessage };
  }
  console.info(`[${scope}] Supabase not configured, dropped:`, loggable);
  return ok;
}

export function submitFailed(scope: string, error: PostgrestError): FormState {
  if (error.code === THROTTLED) {
    return {
      status: "error",
      message:
        "提交的人有点多，请一分钟后再试|Lots of submissions right now, please try again in a minute",
    };
  }
  // `details` echoes the failing row (contact details, zID), so it stays out
  // of the logs.
  console.error(`[${scope}] submit failed`, {
    code: error.code,
    message: error.message,
    hint: error.hint,
  });
  return {
    status: "error",
    message: "提交失败，请稍后再试|Couldn't submit, please try again",
  };
}
