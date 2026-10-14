"use server";

import { parseJoinForm, type FormState } from "@/lib/forms";
import { invalidForm, submitFailed, withoutDatabase } from "@/lib/form-actions";
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
  if (!parsed.success) return invalidForm(parsed.error);

  const db = getSupabase();
  if (!db) {
    // Never log the name or zID, even in development.
    const { fullName, zid, ...loggable } = parsed.data;
    return withoutDatabase(
      "join",
      "报名暂未开放，请稍后再试|Sign-up isn't open yet",
      {
        ...loggable,
        fullName: fullName && "[redacted]",
        zid: zid && "[redacted]",
      },
      { status: "ok", nickname: parsed.data.nickname },
    );
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
    next_event_interest: v.eventInterest,
    availability: v.availability,
    affiliation_support: v.affiliationSupport,
    full_name: v.fullName,
    zid: v.zid,
    affiliation_consent: v.affiliationConsent,
  });
  if (error) return submitFailed("join", error);
  return { status: "ok", nickname: v.nickname };
}
