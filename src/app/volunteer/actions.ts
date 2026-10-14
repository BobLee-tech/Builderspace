"use server";

import { fieldErrors, parseVolunteerForm, type FormState } from "@/lib/forms";
import { looksAutomated } from "@/lib/spam";
import { getSupabase } from "@/lib/supabase/client";

export async function submitVolunteer(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  // Bots get a convincing success and nothing is stored.
  if (looksAutomated(form)) {
    return { status: "ok", nickname: String(form.get("nickname") ?? "") };
  }

  const parsed = parseVolunteerForm(form);
  if (!parsed.success) {
    return {
      status: "error",
      message: "有几项还没填好|A few fields need attention",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const db = getSupabase();
  if (!db) {
    if (process.env.NODE_ENV === "production") {
      return {
        status: "error",
        message: "申请暂未开放，请稍后再试|Applications aren't open yet",
      };
    }
    // Never log the contact details, even in development.
    const { contact, ...loggable } = parsed.data;
    console.info("[volunteer] Supabase not configured, dropped:", {
      ...loggable,
      contact: contact && "[redacted]",
    });
    return { status: "ok", nickname: parsed.data.nickname };
  }

  const v = parsed.data;
  // The database only lets visitors write these columns; status and notes are
  // for ops in the dashboard.
  const { error } = await db.from("volunteer_applications").insert({
    nickname: v.nickname,
    contact: v.contact,
    school_degree: v.schoolDegree,
    positions: v.positions,
    weekly_hours: v.weeklyHours,
    about: v.about,
    portfolio_url: v.portfolioUrl,
    channel: v.channel,
    data_consent: v.dataConsent,
  });
  if (error) {
    console.error("[volunteer] insert failed", error);
    return {
      status: "error",
      message: "提交失败，请稍后再试|Couldn't submit, please try again",
    };
  }
  return { status: "ok", nickname: v.nickname };
}
