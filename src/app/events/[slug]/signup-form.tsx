"use client";

import Link from "next/link";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { useActionState, useState, useTransition, type Ref } from "react";
import { FieldError, TextField, errorId } from "@/components/form-fields";
import { Arr } from "@/components/fx/arr";
import { useCelebration } from "@/components/fx/celebrate";
import { SpamGuard } from "@/components/spam-guard";
import { useRevealResult } from "@/components/use-reveal-result";
import { Msg, T, type Bi } from "@/components/t";
import { channelFromSearch, type RegistrationState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import {
  CODING_LEVELS,
  CODING_LEVEL_LABEL,
  SEAT_GROUP_LABEL,
  type EventSignups,
  type MySignup,
  type SeatGroup,
} from "@/lib/types";
import {
  registerForEvent,
  resendConfirmation,
  type ResendState,
} from "./actions";

export function SignupForm({
  slug,
  capacity,
  seatQuotas,
  signups,
  asksGithub,
  mine,
}: {
  slug: string;
  capacity: number | null;
  /** Seats per group; null means every group shares `capacity`. */
  seatQuotas: Partial<Record<SeatGroup, number>> | null;
  signups: EventSignups;
  asksGithub: boolean;
  /** This browser already signed up: the success card instead of the form. */
  mine: MySignup | null;
}) {
  const [state, action, pending] = useActionState<RegistrationState, FormData>(
    registerForEvent,
    { status: "idle" },
  );
  const reveal = useRevealResult(state);
  const celebrate = useCelebration(
    "join",
    state.status === "ok" &&
      state.signup.status === "confirmed" &&
      !state.already,
  );
  const [coding, setCoding] = useState("");
  const [unsw, setUnsw] = useState<"yes" | "no" | "">("");
  const [kind, setKind] = useState<"school" | "external" | "">("");
  const [otherSchool, setOtherSchool] = useState<SeatGroup | "">("");

  const open = (g: SeatGroup) => !seatQuotas || g in seatQuotas;
  const schoolGroups = (["usyd", "other_school"] as const).filter(open);
  const group: SeatGroup | null =
    unsw === "yes"
      ? "unsw"
      : unsw === "no" && kind === "external"
        ? "external"
        : unsw === "no" && kind === "school"
          ? otherSchool || (schoolGroups.length === 1 ? schoolGroups[0] : null)
          : null;
  // The chosen group (or the whole event) has no seats left.
  const full =
    group !== null &&
    ((capacity !== null && signups.confirmed >= capacity) ||
      (seatQuotas?.[group] !== undefined &&
        (signups.byGroup[group] ?? 0) >= seatQuotas[group]!));

  if (state.status === "ok" || mine) {
    return (
      <SignupDone
        ref={(node) => {
          reveal(node);
          celebrate(node);
        }}
        signup={state.status === "ok" ? state.signup : mine!}
        already={state.status === "ok" && state.already}
        asksGithub={asksGithub}
      />
    );
  }

  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      ref={reveal}
      onSubmit={submitWithoutReset((data) => {
        data.set("channel", channelFromSearch(window.location.search) ?? "");
        action(data);
      })}
      className="evp-form"
      noValidate
    >
      <SpamGuard />
      <input type="hidden" name="slug" value={slug} />
      <div className="row2">
        <TextField
          name="fullName"
          label={<T zh="姓名" en="Name" />}
          error={err.fullName}
          max={40}
        />
        <TextField
          name="wechat"
          label={<T zh="微信号" en="WeChat ID" />}
          error={err.wechat}
          max={60}
        />
      </div>

      <TextField
        name="email"
        label={
          <T zh="邮箱（报名确认发到这里）" en="Email (for your confirmation)" />
        }
        placeholder="you@example.com"
        error={err.email}
        max={254}
        email
      />

      <Choice
        name="codingLevel"
        legend={<T zh="有编程基础吗？" en="Have you coded before?" />}
        value={coding}
        onPick={setCoding}
        options={CODING_LEVELS.map((l) => [l, CODING_LEVEL_LABEL[l], false])}
        error={err.codingLevel}
      />

      <Choice
        name="unswStudent"
        legend={<T zh="是 UNSW 学生吗？" en="Are you a UNSW student?" />}
        value={unsw}
        onPick={(v) => setUnsw(v as "yes" | "no")}
        options={[
          ["yes", { zh: "是", en: "Yes" }, !open("unsw")],
          [
            "no",
            { zh: "不是", en: "No" },
            !schoolGroups.length && !open("external"),
          ],
        ]}
        error={err.unswStudent}
      />

      {unsw === "yes" && (
        <TextField
          name="zid"
          label={
            <T
              zh="zID（只用于活动登记，不公开）"
              en="zID (for event records only, never shown)"
            />
          }
          placeholder="z1234567"
          error={err.zid}
          max={8}
        />
      )}

      {unsw === "no" && (
        <>
          <Choice
            legend={<T zh="你是" en="You are" />}
            value={kind}
            onPick={(v) => setKind(v as "school" | "external")}
            options={[
              [
                "school",
                { zh: "其他学校学生", en: "A student elsewhere" },
                !schoolGroups.length,
              ],
              [
                "external",
                { zh: "校外成员", en: "Not a student" },
                !open("external"),
              ],
            ]}
            error={kind ? undefined : err.otherGroup}
            errorName="otherGroup"
          />
          {kind === "school" && (
            <Choice
              name="otherGroup"
              legend={<T zh="学校" en="University" />}
              value={
                otherSchool ||
                (schoolGroups.length === 1 ? schoolGroups[0] : "")
              }
              onPick={(v) => setOtherSchool(v as SeatGroup)}
              options={schoolGroups.map((g) => [g, SEAT_GROUP_LABEL[g], false])}
              error={err.otherGroup}
            />
          )}
          {kind === "school" && group === "other_school" && (
            <TextField
              name="school"
              label={<T zh="学校名" en="Which university" />}
              error={err.school}
              max={80}
            />
          )}
          {kind === "external" && (
            <>
              <input type="hidden" name="otherGroup" value="external" />
              <TextField
                name="occupation"
                label={<T zh="职业" en="What you do" />}
                placeholder="设计师 / Product manager…"
                error={err.occupation}
                max={80}
              />
            </>
          )}
        </>
      )}

      {asksGithub && (
        <TextField
          name="githubUsername"
          label={
            <T
              zh="GitHub 用户名（选填，还没有就留空）"
              en="GitHub username (optional, leave blank if you don't have one)"
            />
          }
          placeholder="octocat"
          error={err.githubUsername}
          max={80}
          optional
        />
      )}

      {state.status === "error" && (
        <p className="form-status err" role="alert">
          <Msg s={state.message} />
        </p>
      )}
      <button
        type="submit"
        className="btn solid primary evp-submit"
        disabled={pending}
      >
        {pending ? (
          <T zh="提交中…" en="Sending…" />
        ) : full ? (
          <T zh="报名候补" en="Join the waitlist" />
        ) : (
          <T zh="确认报名" en="Sign me up" />
        )}{" "}
        <Arr />
      </button>
      <p className="mute evp-note">
        <T
          zh="信息只用于这场活动的签到、登记和联系，可随时要求删除。不收学生证。"
          en="Used only for check-in, event records and contacting you about this event; deleted on request. We never ask for your student card."
        />
      </p>
    </form>
  );
}

/**
 * Radio chips that report the pick. An option the event doesn't take is
 * shown greyed out with a note, so people see why it can't be picked.
 */
function Choice({
  name,
  legend,
  options,
  value,
  onPick,
  error,
  errorName = name,
}: {
  /** Omit for a choice that only steers the form and isn't submitted. */
  name?: string;
  legend: React.ReactNode;
  options: [string, Bi, boolean][];
  value: string;
  onPick: (value: string) => void;
  error?: string;
  errorName?: string;
}) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="mono mute" style={{ marginBottom: 8 }}>
        {legend}
      </legend>
      <div className="filters">
        {options.map(([v, label, closed]) => (
          <label key={v} className="chip" data-off={closed ? "" : undefined}>
            <input
              type="radio"
              name={name ?? `${errorName}-kind`}
              value={v}
              checked={value === v}
              disabled={closed}
              onChange={() => onPick(v)}
              aria-describedby={
                error && errorName ? errorId(errorName) : undefined
              }
            />
            <T {...label} />
            {closed && (
              <span className="n">
                <T zh="本场不开放" en="not this time" />
              </span>
            )}
          </label>
        ))}
      </div>
      {errorName && <FieldError name={errorName} error={error} />}
    </fieldset>
  );
}

/**
 * After signing up, and on every later visit from the same browser: who it's
 * for, where the confirmation email went, and what happens next.
 */
export function SignupDone({
  ref,
  signup,
  already = false,
  asksGithub,
}: {
  ref?: Ref<HTMLDivElement>;
  signup: MySignup;
  /** Just tried to sign up again; nothing new was stored or sent. */
  already?: boolean;
  asksGithub: boolean;
}) {
  const waitlist = signup.status === "waitlist";
  return (
    <div ref={ref} className="evp-form evp-done" role="status">
      <p className="mono mute evp-done-tag">
        <i data-wait={waitlist ? "" : undefined} aria-hidden />
        {already ? (
          <T zh="你已经报过名了" en="Already signed up" />
        ) : waitlist ? (
          <T zh="已进入候补" en="On the waitlist" />
        ) : (
          <T zh="报名成功" en="You're in" />
        )}
      </p>
      <h2 className="h2" style={{ fontSize: 28 }}>
        {waitlist ? (
          <T
            zh={`${signup.name}，你在候补名单上。`}
            en={`${signup.name}, you're on the waitlist.`}
          />
        ) : (
          <T
            zh={`${signup.name}，现场见！`}
            en={`See you there, ${signup.name}!`}
          />
        )}
      </h2>
      {signup.emailHint && (
        <MailNote hint={signup.emailHint} already={already} />
      )}
      <p className="mute">
        {waitlist ? (
          <T
            zh="有人取消时，最早的候补自动递补，我们会微信通知你。"
            en="When someone cancels, the earliest person on the waitlist gets the seat and we'll message you on WeChat."
          />
        ) : (
          <T
            zh={`截止后我们会用微信拉你进参与者群。${asksGithub ? "来之前记得注册好 GitHub。" : ""}`}
            en={`After sign-up closes we'll add you to the group chat on WeChat.${asksGithub ? " Set up GitHub before you come." : ""}`}
          />
        )}
      </p>
      <div className="d-cta">
        {asksGithub && (
          <a
            href="https://github.com/signup"
            target="_blank"
            rel="noreferrer"
            className="btn ghost"
          >
            <T zh="注册 GitHub" en="Sign up for GitHub" /> <Arr diag />
          </a>
        )}
        <Link href="/events" className="btn ghost">
          <T zh="看看其他活动" en="More events" /> <Arr />
        </Link>
      </div>
    </div>
  );
}

/** Where the confirmation went, with a way to have it sent again. */
function MailNote({ hint, already }: { hint: string; already: boolean }) {
  const [sent, setSent] = useState<ResendState | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="evp-mail">
      <EnvelopeSimple weight="light" size={20} aria-hidden />
      <p>
        <b>
          {already ? (
            <T
              zh={`确认邮件之前已发到 ${hint}`}
              en={`Your confirmation went to ${hint}`}
            />
          ) : (
            <T
              zh={`确认邮件已发到 ${hint}`}
              en={`Confirmation sent to ${hint}`}
            />
          )}
        </b>
        <span className="mute">
          {already ? (
            <T
              zh="这次没有新增报名，也不会再发邮件。"
              en="Nothing new was stored and no new email was sent."
            />
          ) : (
            <T
              zh="几分钟内会到，没收到先看看垃圾邮件。"
              en="It should arrive within minutes; check spam if not."
            />
          )}{" "}
          {sent ? (
            <span
              className={sent.status === "error" ? "err" : undefined}
              role="status"
            >
              <Msg s={sent.message} />
            </span>
          ) : (
            <button
              type="button"
              className="evp-resend"
              disabled={pending}
              onClick={() =>
                start(async () => setSent(await resendConfirmation()))
              }
            >
              {pending ? (
                <T zh="发送中…" en="Sending…" />
              ) : (
                <T zh="重发一次" en="Send it again" />
              )}
            </button>
          )}
        </span>
      </p>
    </div>
  );
}
