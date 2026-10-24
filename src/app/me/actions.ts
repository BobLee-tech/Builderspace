"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getMyZid, saveMyZid, saveSurvey, signOut } from "@/lib/auth";
import { fieldErrors, type FormState } from "@/lib/forms";
import { parseSurvey, zidSchema } from "@/lib/member-forms";

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
