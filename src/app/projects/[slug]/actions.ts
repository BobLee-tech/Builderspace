"use server";

import { parseProjectUpdateForm, type FormState } from "@/lib/forms";
import { invalidForm, submitFailed, withoutDatabase } from "@/lib/form-actions";
import { looksAutomated } from "@/lib/spam";
import { getSupabase } from "@/lib/supabase/client";

export async function submitProjectUpdate(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  if (looksAutomated(form)) return { status: "ok" };

  const parsed = parseProjectUpdateForm(form);
  if (!parsed.success) return invalidForm(parsed.error);

  const db = getSupabase();
  if (!db) {
    return withoutDatabase(
      "update",
      "暂时无法提交，请稍后再试|Can't submit right now",
      parsed.data,
      { status: "ok" },
    );
  }

  const v = parsed.data;
  // RLS only exposes approved projects, so this also rejects unknown slugs.
  const { data: project, error: lookupError } = await db
    .from("projects")
    .select("id")
    .eq("slug", v.slug)
    .maybeSingle();
  if (lookupError) return submitFailed("update", lookupError);
  if (!project)
    return { status: "error", message: "找不到这个项目|Project not found" };

  // Inserted as pending; it joins the timeline and the north-star count once
  // ops approve it.
  const { error } = await db.from("project_updates").insert({
    project_id: project.id,
    kind: v.kind,
    body: v.body,
    url: v.url,
    submitted_by: v.submittedBy,
    review_status: "pending",
  });
  if (error) return submitFailed("update", error);
  return { status: "ok" };
}
