"use server";

import { fieldErrors, parseJoinForm, type FormState } from "@/lib/forms";
import { looksAutomated } from "@/lib/spam";
import { getSupabase } from "@/lib/supabase/client";

export async function submitJoin(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  // Bots get a convincing success and nothing is stored.
  if (looksAutomated(form)) {
    return { status: "ok", nickname: String(form.get("nickname") ?? "") };
  }

  const parsed = parseJoinForm(form);
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
        message: "报名暂未开放，请稍后再试|Sign-up isn't open yet",
      };
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
    stalled_project: v.stalledProject === "yes",
    blockers: v.blockers,
    weekly_hours: v.weeklyHours,
    referral_source: v.referralSource,
    channel: v.channel,
    showcase_consent: v.showcaseConsent,
  });
  if (error) {
    console.error("[join] insert failed", error);
    return {
      status: "error",
      message: "提交失败，请稍后再试|Couldn't submit, please try again",
    };
  }
  return { status: "ok", nickname: v.nickname };
}
