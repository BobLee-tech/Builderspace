"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FieldError, TextField, errorId } from "@/components/form-fields";
import { Arr, Hud } from "@/components/fx/arr";
import { useCelebration } from "@/components/fx/celebrate";
import { SpamGuard } from "@/components/spam-guard";
import { useRevealResult } from "@/components/use-reveal-result";
import { Msg, T, type Bi } from "@/components/t";
import { channelFromSearch, type RegistrationState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import {
  SEAT_GROUP_LABEL,
  type EventSignups,
  type SeatGroup,
} from "@/lib/types";
import { registerForEvent } from "./actions";

export function SignupForm({
  slug,
  capacity,
  seatQuotas,
  signups,
  asksGithub,
}: {
  slug: string;
  capacity: number | null;
  /** Seats per group; null means every group shares `capacity`. */
  seatQuotas: Partial<Record<SeatGroup, number>> | null;
  signups: EventSignups;
  asksGithub: boolean;
}) {
  const [state, action, pending] = useActionState<RegistrationState, FormData>(
    registerForEvent,
    { status: "idle" },
  );
  const reveal = useRevealResult(state);
  const celebrate = useCelebration(
    "join",
    state.status === "ok" && state.result === "confirmed" && !state.already,
  );
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

  if (state.status === "ok") {
    const waitlist = state.result === "waitlist";
    return (
      <div
        ref={(node) => {
          reveal(node);
          celebrate(node);
        }}
        className="form hud evp-done"
        role="status"
      >
        <Hud />
        <p className="mono mute">
          {state.already ? (
            <T zh="之前报过了" en="Already signed up" />
          ) : waitlist ? (
            <T zh="已进入候补" en="On the waitlist" />
          ) : (
            <T zh="报名成功" en="You're in" />
          )}
        </p>
        <h2 className="h2" style={{ fontSize: 32 }}>
          {waitlist ? (
            <T
              zh={`${state.name}，你在候补名单上。`}
              en={`${state.name}, you're on the waitlist.`}
            />
          ) : (
            <T
              zh={`${state.name}，现场见！`}
              en={`See you there, ${state.name}!`}
            />
          )}
        </h2>
        <p className="mute">
          {state.already ? (
            <T
              zh="这个微信号之前已经报过名了，不用再报。"
              en="This WeChat ID had already signed up, so nothing changed."
            />
          ) : waitlist ? (
            <T
              zh="有人取消时，最早的候补自动递补，我们会微信通知你。"
              en="When someone cancels, the earliest person on the waitlist gets the seat and we'll message you on WeChat."
            />
          ) : (
            <T
              zh="截止后我们会用微信拉你进参与者群。来之前记得注册好 GitHub。"
              en="After sign-up closes we'll add you to the group chat on WeChat. Set up GitHub before you come."
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

  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      ref={reveal}
      onSubmit={submitWithoutReset((data) => {
        data.set("channel", channelFromSearch(window.location.search) ?? "");
        action(data);
      })}
      className="form hud"
      noValidate
    >
      <Hud />
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

      <label className="consent">
        <input type="checkbox" name="photoConsent" />
        <span>
          <T
            zh="可以把我的现场照片和网站截图发到社团账号（选填）"
            en="You may post my event photos and a screenshot of my site on the society's channels (optional)"
          />
        </span>
      </label>

      {state.status === "error" && (
        <p className="form-status err" role="alert">
          <Msg s={state.message} />
        </p>
      )}
      <button
        type="submit"
        className="btn solid primary"
        disabled={pending}
        style={{ alignSelf: "start" }}
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
