"use server";

import {
  fieldErrors,
  parseProjectForm,
  projectSlug,
  type FormState,
} from "@/lib/forms";
import { getSupabase } from "@/lib/supabase/client";

export async function submitProject(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseProjectForm(form);
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
      return { status: "error", message: "投稿暂未开放，请稍后再试" };
    }
    console.info("[project] Supabase not configured, dropped:", parsed.data);
    return { status: "ok" };
  }

  const v = parsed.data;
  // Inserted as pending; RLS rejects anything else and hides it until approved.
  const { error } = await db.from("projects").insert({
    slug: projectSlug(v.name, crypto.randomUUID().slice(0, 6)),
    name: v.name,
    problem: v.problem,
    target_user: v.targetUser,
    needed_roles: v.neededRoles,
    next_step: v.nextStep,
    owner_name: v.ownerName,
    contact: v.contact,
    repo_url: v.repoUrl,
    demo_url: v.demoUrl,
    review_status: "pending",
  });
  if (error) {
    console.error("[project] insert failed", error);
    return { status: "error", message: "提交失败，请稍后再试" };
  }
  return { status: "ok" };
}
