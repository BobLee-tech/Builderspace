"use server";

import {
  fieldErrors,
  parseProjectUpdateForm,
  type FormState,
} from "@/lib/forms";
import { looksAutomated } from "@/lib/spam";
import { getSupabase } from "@/lib/supabase/client";

export async function submitProjectUpdate(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  if (looksAutomated(form)) return { status: "ok" };

  const parsed = parseProjectUpdateForm(form);
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
        message: "暂时无法提交，请稍后再试|Can't submit right now",
      };
    }
    console.info("[update] Supabase not configured, dropped:", parsed.data);
    return { status: "ok" };
  }

  const v = parsed.data;
  // RLS only exposes approved projects, so this also rejects unknown slugs.
  const { data: project, error: lookupError } = await db
    .from("projects")
    .select("id")
    .eq("slug", v.slug)
    .maybeSingle();
  if (lookupError) {
    console.error("[update] project lookup failed", lookupError);
    return {
      status: "error",
      message: "提交失败，请稍后再试|Couldn't submit, please try again",
    };
  }
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
  if (error) {
    console.error("[update] insert failed", error);
    return {
      status: "error",
      message: "提交失败，请稍后再试|Couldn't submit, please try again",
    };
  }
  return { status: "ok" };
}
