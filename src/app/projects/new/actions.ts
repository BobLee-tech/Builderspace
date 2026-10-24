"use server";

import { memberWriter } from "@/lib/auth";
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

  const anon = getSupabase();
  if (!anon) {
    return withoutDatabase(
      "project",
      "投稿暂未开放，请稍后再试|Submissions aren't open yet",
      parsed.data,
      { status: "ok" },
    );
  }

  const v = parsed.data;
  // A signed-in member submits as themselves, so the project carries their
  // card (owner_id must be auth.uid(), which only their own client can be);
  // visitors still submit anonymously.
  const member = await memberWriter();
  const db = member?.db ?? anon;
  // Inserted as pending; RLS rejects anything else and hides it until approved.
  const { error } = await db.from("projects").insert({
    slug: projectSlug(v.name, crypto.randomUUID().slice(0, 6)),
    name: v.name,
    pitch: v.pitch,
    problem: v.problem,
    target_user: v.targetUser,
    needed_roles: v.neededRoles,
    next_step: v.nextStep,
    owner_name: member?.member.nickname ?? v.ownerName,
    owner_id: member?.member.id ?? null,
    contact: v.contact,
    repo_url: v.repoUrl,
    demo_url: v.demoUrl,
    cover_path: v.media.coverPath,
    cover_focus_x: v.media.coverFocusX,
    cover_focus_y: v.media.coverFocusY,
    video_path: v.media.videoPath,
    video_poster_path: v.media.videoPosterPath,
    video_seconds: v.media.videoSeconds,
    review_status: "pending",
  });
  if (error) return submitFailed("project", error);
  return { status: "ok" };
}
