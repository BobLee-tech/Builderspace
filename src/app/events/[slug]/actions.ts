"use server";

import { updateTag } from "next/cache";
import { getEvent } from "@/lib/data";
import { submitFailed } from "@/lib/form-actions";
import {
  fieldErrors,
  maskEmail,
  parseRegistrationForm,
  type RegistrationState,
} from "@/lib/forms";
import { getSignupStore, mySignupId, rememberSignup } from "@/lib/signup-store";
import { looksAutomated } from "@/lib/spam";

/** SQLSTATEs raised by register_for_event(). */
const NOT_FOUND = "PT404";
const CLOSED = "PT410";
const GROUP_CLOSED = "PT422";
/** Unique index: the same WeChat ID or email signed up in the same instant. */
const DUPLICATE = "23505";

const groupClosedMessage =
  "这场活动暂不开放这一类报名|This event isn't open to that group";

const closedMessage = "报名已截止|Sign-up has closed";

export async function registerForEvent(
  _prev: RegistrationState,
  form: FormData,
): Promise<RegistrationState> {
  // Bots get a convincing success and nothing is stored or sent.
  if (looksAutomated(form)) {
    return {
      status: "ok",
      signup: {
        name: String(form.get("fullName") ?? ""),
        status: "confirmed",
        emailHint: maskEmail(String(form.get("email") ?? "")),
      },
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

  const store = getSignupStore();
  if (!store) {
    return {
      status: "error",
      message: "报名暂未开放，请稍后再试|Sign-up isn't open yet",
    };
  }
  const result = await store.register(r);
  if ("error" in result) {
    const { code } = result.error;
    if (code === CLOSED) return { status: "error", message: closedMessage };
    if (code === GROUP_CLOSED) {
      return { status: "error", message: groupClosedMessage };
    }
    if (code === NOT_FOUND) {
      return { status: "error", message: "找不到这场活动|Event not found" };
    }
    if (code === DUPLICATE) {
      return {
        status: "error",
        message:
          "这个微信号或邮箱刚刚报过名，刷新页面看看|This WeChat ID or email just signed up, try refreshing",
      };
    }
    return submitFailed("signup", result.error);
  }

  // From now on this browser gets the success card, refreshed or not.
  await rememberSignup(r.slug, result.id);
  // The new count shows on this response; other visitors within a minute.
  // The last seat can close sign-up (events.close_when_full), so the event
  // row is refreshed too.
  if (!result.already) {
    updateTag("event-signups");
    updateTag("events");
  }
  // An earlier sign-up shows what it was made with, not what was just typed.
  const signup = (await store.mine(r.slug, result.id)) ?? {
    name: r.fullName,
    status: result.status,
    emailHint: maskEmail(r.email),
  };
  return { status: "ok", signup, already: result.already };
}

export type ResendState = { status: "ok" | "error"; message: string };

const notFound: ResendState = {
  status: "error",
  message: "找不到你的报名|We couldn't find your sign-up",
};

/** The success card's "send it again", for this browser's sign-up. */
export async function resendConfirmation(): Promise<ResendState> {
  const id = await mySignupId();
  const store = getSignupStore();
  if (!id || !store) return notFound;
  switch (await store.resend(id)) {
    case "sent":
      return {
        status: "ok",
        message: "已重发，几分钟内会到|Sent again, give it a few minutes",
      };
    case "wait":
      return {
        status: "error",
        message:
          "刚发过，10 分钟后再试|It was just sent, try again in 10 minutes",
      };
    case "missing":
      return notFound;
    case "failed":
      return {
        status: "error",
        message:
          "邮件暂时发不出去，请稍后再试|Couldn't send the email right now",
      };
  }
}
