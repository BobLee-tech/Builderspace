"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  confirmEmailChange,
  getMyZid,
  requestEmailChange,
  saveMyZid,
  saveSurvey,
  setCardOnProjects,
  setPublicCard,
  signOut,
} from "@/lib/auth";
import { fieldErrors, type FormState } from "@/lib/forms";
import {
  codeSchema,
  emailSchema,
  parseSurvey,
  zidSchema,
} from "@/lib/member-forms";

export async function submitSurvey(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseSurvey(form, await getMyZid());
  if (!parsed.success) {
    return {
      status: "error",
      message: "有几项还没填好|A few fields need attention",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const saved = await saveSurvey(parsed.data);
  return saved.ok
    ? { status: "ok" }
    : { status: "error", message: saved.message };
}

/** A member who joined before zIDs were asked for adds theirs on /me. */
export async function addZid(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = zidSchema.safeParse(form.get("zid") ?? "");
  if (!parsed.success) {
    const message = parsed.error.issues[0].message;
    return { status: "error", message, fieldErrors: { zid: message } };
  }
  const saved = await saveMyZid(parsed.data);
  if (!saved.ok) return { status: "error", message: saved.message };
  // /me reads the zID per request: the form goes and the details show it.
  refresh();
  return { status: "ok" };
}

export async function logOut() {
  await signOut();
  redirect("/join");
}

/** Shows or hides the member's card on the projects they own. */
export async function toggleCardOnProjects(form: FormData) {
  const saved = await setCardOnProjects(form.get("on") === "1");
  // Project pages cache the owners' cards; show the change right away.
  if (saved.ok) updateTag("cards");
  refresh();
}

/** Shows or hides the member's card on /m/<handle> and the wall on /people. */
export async function togglePublicCard(form: FormData) {
  const saved = await setPublicCard(form.get("on") === "1");
  if (saved.ok) updateTag("cards");
  refresh();
}

export type EmailStep =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "ok"; email: string };

/** Changing the sign-in email, step 1: a code goes to the new address. */
export async function sendEmailCode(
  _prev: EmailStep,
  form: FormData,
): Promise<EmailStep> {
  const parsed = emailSchema.safeParse(form.get("email") ?? "");
  if (!parsed.success) {
    const message = parsed.error.issues[0].message;
    return { status: "error", message, fieldErrors: { email: message } };
  }
  const sent = await requestEmailChange(parsed.data);
  return sent.ok
    ? { status: "ok", email: parsed.data }
    : {
        status: "error",
        message: sent.message,
        fieldErrors: { email: sent.message },
      };
}

/** Step 2: the code makes it the sign-in email. */
export async function confirmEmailCode(
  _prev: EmailStep,
  form: FormData,
): Promise<EmailStep> {
  const email = emailSchema.safeParse(form.get("email") ?? "");
  const code = codeSchema.safeParse(form.get("code") ?? "");
  if (!email.success || !code.success) {
    const message = (code.error ?? email.error)!.issues[0].message;
    return { status: "error", message, fieldErrors: { code: message } };
  }
  const changed = await confirmEmailChange(email.data, code.data);
  if (!changed.ok) {
    return {
      status: "error",
      message: changed.message,
      fieldErrors: { code: changed.message },
    };
  }
  // A school address brings the seal, which public and project cards print.
  updateTag("cards");
  refresh();
  return { status: "ok", email: changed.value };
}
