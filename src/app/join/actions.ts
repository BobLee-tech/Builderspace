"use server";

import { fieldErrors, parseJoinForm, type FormState } from "@/lib/forms";
import { getSupabase } from "@/lib/supabase/client";

export async function submitJoin(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseJoinForm(form);
  if (!parsed.success) {
    return {
      status: "error",
      message: "有几项还没填好",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const db = getSupabase();
  if (!db) {
    if (process.env.NODE_ENV === "production") {
      return { status: "error", message: "报名暂未开放，请稍后再试" };
    }
    console.info("[join] Supabase not configured, dropped:", parsed.data);
    return { status: "ok", nickname: parsed.data.nickname };
  }

  const v = parsed.data;
  const { error } = await db.from("join_submissions").insert({
    nickname: v.nickname,
    school_degree: v.schoolDegree,
    major: v.major,
    skills: v.skills,
    idea: v.idea,
    weekly_hours: v.weeklyHours,
    referral_source: v.referralSource,
    showcase_consent: v.showcaseConsent,
  });
  if (error) {
    console.error("[join] insert failed", error);
    return { status: "error", message: "提交失败，请稍后再试" };
  }
  return { status: "ok", nickname: v.nickname };
}
