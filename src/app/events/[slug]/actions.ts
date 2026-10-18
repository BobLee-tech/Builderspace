"use server";

import { updateTag } from "next/cache";
import { getEvent } from "@/lib/data";
import { submitFailed } from "@/lib/form-actions";
import {
  fieldErrors,
  parseRegistrationForm,
  type RegistrationState,
} from "@/lib/forms";
import { looksAutomated } from "@/lib/spam";
import { getSupabase } from "@/lib/supabase/client";
import type { RegistrationStatus } from "@/lib/types";

/** SQLSTATEs raised by register_for_event(). */
const NOT_FOUND = "PT404";
const CLOSED = "PT410";
const GROUP_CLOSED = "PT422";

const groupClosedMessage =
  "这场活动暂不开放这一类报名|This event isn't open to that group";

const closedMessage = "报名已截止|Sign-up has closed";

export async function registerForEvent(
  _prev: RegistrationState,
  form: FormData,
): Promise<RegistrationState> {
  // Bots get a convincing success and nothing is stored.
  if (looksAutomated(form)) {
    return {
      status: "ok",
      name: String(form.get("fullName") ?? ""),
      result: "confirmed",
      already: false,
    };
  }

  const parsed = parseRegistrationForm(form);
  if (!parsed.success) {
    return {
      status: "error",
      message: "有几项还没填好|A few fields need attention",
      fieldErrors: fieldErrors(parsed.error),
    };
  }
  const r = parsed.data;

  const event = await getEvent(r.slug);
  if (!event?.registrationClosesAt) {
    return { status: "error", message: "找不到这场活动|Event not found" };
  }
  // The database decides; this only saves a round trip once it has closed.
  if (Date.now() >= Date.parse(event.registrationClosesAt)) {
    return { status: "error", message: closedMessage };
  }
  if (event.seatQuotas && !(r.seatGroup in event.seatQuotas)) {
    return { status: "error", message: groupClosedMessage };
  }

  const db = getSupabase();
  if (!db) {
    if (process.env.NODE_ENV === "production") {
      return {
        status: "error",
        message: "报名暂未开放，请稍后再试|Sign-up isn't open yet",
      };
    }
    // Never log the name or contact details, even in development.
    console.info("[signup] Supabase not configured, dropped:", {
      ...r,
      fullName: "[redacted]",
      wechat: "[redacted]",
      zid: r.zid && "[redacted]",
    });
    return {
      status: "ok",
      name: r.fullName,
      result: "confirmed",
      already: false,
    };
  }

  const { data, error } = await db
    .rpc("register_for_event", {
      p_event_slug: r.slug,
      p_full_name: r.fullName,
      p_wechat: r.wechat,
      p_seat_group: r.seatGroup,
      p_zid: r.zid,
      p_school: r.school,
      p_occupation: r.occupation,
      p_github_username: r.githubUsername,
      p_photo_consent: r.photoConsent,
      p_channel: r.channel,
    })
    .single<{ status: RegistrationStatus; already_registered: boolean }>();
  if (error?.code === CLOSED)
    return { status: "error", message: closedMessage };
  if (error?.code === GROUP_CLOSED) {
    return { status: "error", message: groupClosedMessage };
  }
  if (error?.code === NOT_FOUND) {
    return { status: "error", message: "找不到这场活动|Event not found" };
  }
  if (error) return submitFailed("signup", error);

  // The new count shows on this response; other visitors within a minute.
  if (!data.already_registered) updateTag("event-signups");
  return {
    status: "ok",
    name: r.fullName,
    result: data.status,
    already: data.already_registered,
  };
}
