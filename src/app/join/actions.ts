"use server";

import { redirect } from "next/navigation";
import { createMember, getSession, sendCode, verifyCode } from "@/lib/auth";
import { fieldErrors, localPath } from "@/lib/forms";
import {
  codeSchema,
  emailSchema,
  parseMemberProfile,
} from "@/lib/member-forms";
import { HONEYPOT_FIELD } from "@/lib/spam";

export type StepState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "ok"; email?: string; hasCard?: boolean };

/** Step 1: email in, a 6-digit code goes out. */
export async function requestCode(
  _prev: StepState,
  form: FormData,
): Promise<StepState> {
  const parsed = emailSchema.safeParse(form.get("email") ?? "");
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0].message,
      fieldErrors: { email: parsed.error.issues[0].message },
    };
  }
  // Bots that fill the honeypot get a convincing answer and no email. The
  // timing check other forms use is skipped here: autofill can beat it, and a
  // person who never gets their code has no way to tell.
  if (String(form.get(HONEYPOT_FIELD) ?? "").trim()) {
    return { status: "ok", email: parsed.data };
  }
  const sent = await sendCode(parsed.data);
  return sent.ok
    ? { status: "ok", email: parsed.data }
    : { status: "error", message: sent.message };
}

/** Step 2: the code signs the member in; returning members go to their card. */
export async function confirmCode(
  _prev: StepState,
  form: FormData,
): Promise<StepState> {
  const email = emailSchema.safeParse(form.get("email") ?? "");
  const code = codeSchema.safeParse(form.get("code") ?? "");
  if (!email.success || !code.success) {
    const message = (code.error ?? email.error)!.issues[0].message;
    return { status: "error", message, fieldErrors: { code: message } };
  }
  const verified = await verifyCode(email.data, code.data);
  if (!verified.ok) {
    return {
      status: "error",
      message: verified.message,
      fieldErrors: { code: verified.message },
    };
  }
  // Returning members go to their card, or back to the page that sent them.
  if (verified.value.hasCard) redirect(localPath(form.get("next")) ?? "/me");
  return { status: "ok", hasCard: false };
}

/** Steps 3 and 4: profile and mascot make the card, numbered in join order. */
export async function makeCard(
  _prev: StepState,
  form: FormData,
): Promise<StepState> {
  const session = await getSession();
  if (!session) {
    return {
      status: "error",
      message: "先用邮箱登录|Sign in with your email first",
    };
  }
  const parsed = parseMemberProfile(form, session.email);
  if (!parsed.success) {
    return {
      status: "error",
      message: "有几项还没填好|A few fields need attention",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const made = await createMember(parsed.data);
  if (!made.ok) return { status: "error", message: made.message };
  // The welcome screen offers the way back to the page that sent them.
  const next = localPath(form.get("next"));
  redirect(next ? `/welcome?next=${encodeURIComponent(next)}` : "/welcome");
}
