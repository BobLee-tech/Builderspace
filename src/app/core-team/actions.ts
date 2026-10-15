"use server";

import { parseVolunteerForm, type FormState } from "@/lib/forms";
import { invalidForm, submitFailed, withoutDatabase } from "@/lib/form-actions";
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
  if (!parsed.success) return invalidForm(parsed.error);

  const db = getSupabase();
  if (!db) {
    // Never log the contact details, even in development.
    const { email, ...loggable } = parsed.data;
    return withoutDatabase(
      "volunteer",
      "申请暂未开放，请稍后再试|Applications aren't open yet",
      { ...loggable, email: email && "[redacted]" },
      { status: "ok", nickname: parsed.data.nickname },
    );
  }

  const v = parsed.data;
  // The database only lets visitors write these columns; status and notes are
  // for ops in the dashboard.
  const { error } = await db.from("volunteer_applications").insert({
    nickname: v.nickname,
    email: v.email,
    school_degree: v.schoolDegree,
    positions: v.positions,
    weekly_hours: v.weeklyHours,
    about: v.about,
    portfolio_url: v.portfolioUrl,
    channel: v.channel,
    data_consent: v.dataConsent,
  });
  if (error) return submitFailed("volunteer", error);
  return { status: "ok", nickname: v.nickname };
}
