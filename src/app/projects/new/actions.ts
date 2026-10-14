"use server";

import { parseProjectForm, projectSlug, type FormState } from "@/lib/forms";
import { invalidForm, submitFailed, withoutDatabase } from "@/lib/form-actions";
import { looksAutomated } from "@/lib/spam";
import { getSupabase } from "@/lib/supabase/client";

export async function submitProject(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  if (looksAutomated(form)) return { status: "ok" };

  const parsed = parseProjectForm(form);
  if (!parsed.success) return invalidForm(parsed.error);

  const db = getSupabase();
  if (!db) {
    return withoutDatabase(
      "project",
      "投稿暂未开放，请稍后再试|Submissions aren't open yet",
      parsed.data,
      { status: "ok" },
    );
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
  if (error) return submitFailed("project", error);
  return { status: "ok" };
}
