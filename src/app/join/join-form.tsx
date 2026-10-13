"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { Arr, Hud } from "@/components/fx/arr";
import { SpamGuard } from "@/components/spam-guard";
import { Msg, T } from "@/components/t";
import { channelFromSearch, type FormState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import {
  AVAILABILITY,
  AVAILABILITY_LABEL,
  BLOCKERS,
  BLOCKER_LABEL,
  EVENT_INTEREST,
  EVENT_INTEREST_LABEL,
  HOURS_LABEL,
  REFERRAL_LABEL,
  REFERRAL_SOURCES,
  SKILLS,
  SKILL_LABEL,
  WEEKLY_HOURS,
} from "@/lib/types";
import { submitJoin } from "./actions";
import { MemberCard, readCard, type CardData } from "./member-card";

type Bi = { zh: string; en: string };

export function JoinForm({ adminQr }: { adminQr: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitJoin,
    { status: "idle" },
  );

  const [card, setCard] = useState<CardData | null>(null);
  const done = state.status === "ok";

  return (
    <div className="join2">
      <MemberCard data={card} flipped={done} adminQr={adminQr} />
      {done ? (
        <div className="form hud" role="status">
          <Hud />
          <p className="mono mute">
            <T zh="提交成功" en="You're in" />
          </p>
          <h2 className="h2" style={{ fontSize: 32 }}>
            <T
              zh={`欢迎，${state.nickname}。`}
              en={`Welcome, ${state.nickname}.`}
            />
          </h2>
          <p className="mute">
            <T
              zh="成员卡已翻面：扫背面的二维码加管理员微信，备注“BuilderSpace + 昵称”。管理员会拉你进群，并发下一场活动的报名链接。"
              en='Your card has flipped: scan the QR on the back to add the admin on WeChat, with the note "BuilderSpace + your nickname". They will add you to the group and send the next sign-up link.'
            />
          </p>
          <Link
            href="/events"
            className="btn ghost"
            style={{ alignSelf: "start" }}
          >
            <T zh="看下一场活动" en="See the next event" /> <Arr />
          </Link>
        </div>
      ) : (
        <Form
          state={state}
          action={action}
          pending={pending}
          onCard={setCard}
        />
      )}
    </div>
  );
}

function Form({
  state,
  action,
  pending,
  onCard,
}: {
  state: FormState;
  action: (data: FormData) => void;
  pending: boolean;
  onCard: (c: CardData) => void;
}) {
  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  // Name and zID fields exist only while this box is ticked.
  const [supporting, setSupporting] = useState(false);

  return (
    <form
      onSubmit={submitWithoutReset((data) => {
        // Channel tag from the link this visitor came in on (?ref= / utm_source).
        data.set("channel", channelFromSearch(window.location.search) ?? "");
        action(data);
      })}
      className="form hud"
      noValidate
      onChange={(e) => onCard(readCard(e.currentTarget))}
    >
      <Hud />
      <SpamGuard />
      <div className="row2">
        <TextField
          name="nickname"
          label={<T zh="昵称" en="Nickname" />}
          error={err.nickname}
          max={40}
        />
        <TextField
          name="schoolDegree"
          label={<T zh="学校与学位" en="University & degree" />}
          placeholder="UNSW · Master of IT"
          error={err.schoolDegree}
          max={80}
        />
      </div>
      <TextField
        name="major"
        label={<T zh="专业" en="Major" />}
        placeholder="Information Technology"
        error={err.major}
        max={80}
      />

      <CheckGroup
        name="skills"
        legend={<T zh="技能（可多选）" en="Skills (pick any)" />}
        options={SKILLS.map((s) => [s, SKILL_LABEL[s]])}
      />

      <label className="field">
        <span className="mono">
          <T zh="想做什么" en="What do you want to build?" />
        </span>
        <textarea
          name="idea"
          maxLength={500}
          placeholder="一个帮留学生合租找室友的小工具 / A tool to find flatmates near campus"
        />
      </label>

      <ChoiceGroup
        name="stalledProject"
        legend={
          <T
            zh="上学期有没有想做、但没做成的项目"
            en="Last term, was there a project you wanted to build but didn't?"
          />
        }
        options={[
          ["yes", { zh: "有", en: "Yes" }],
          ["no", { zh: "没有", en: "No" }],
        ]}
        error={err.stalledProject}
      />

      <CheckGroup
        name="blockers"
        legend={
          <T
            zh="做项目时卡在哪（可多选）"
            en="What got in the way? (pick any)"
          />
        }
        options={BLOCKERS.map((b) => [b, BLOCKER_LABEL[b]])}
      />

      <ChoiceGroup
        name="weeklyHours"
        legend={<T zh="每周可投入" en="Hours per week" />}
        options={WEEKLY_HOURS.map((h) => [h, HOURS_LABEL[h]])}
        error={err.weeklyHours}
      />
      <ChoiceGroup
        name="referralSource"
        legend={<T zh="从哪里知道我们" en="How did you hear about us?" />}
        options={REFERRAL_SOURCES.map((r) => [r, REFERRAL_LABEL[r]])}
        error={err.referralSource}
      />

      <ChoiceGroup
        name="eventInterest"
        legend={
          <T
            zh="下一场线下活动想来吗（选填）"
            en="Would you come to the next in-person event? (optional)"
          />
        }
        options={EVENT_INTEREST.map((e) => [e, EVENT_INTEREST_LABEL[e]])}
        error={err.eventInterest}
        optional
      />
      <CheckGroup
        name="availability"
        legend={
          <T
            zh="哪些时间方便（选填，可多选）"
            en="When could you make it? (optional, pick any)"
          />
        }
        options={AVAILABILITY.map((a) => [a, AVAILABILITY_LABEL[a]])}
      />

      <label className="consent">
        <input type="checkbox" name="showcaseConsent" />
        <span>
          <T
            zh="我同意在项目广场和活动回顾中展示我的作品（可随时撤回）"
            en="Show my work in the project plaza and event recaps (you can withdraw any time)"
          />
        </span>
      </label>

      <div className="support">
        <label className="consent">
          <input
            type="checkbox"
            name="affiliationSupport"
            checked={supporting}
            onChange={(e) => setSupporting(e.target.checked)}
          />
          <span>
            <T
              zh="我是 UNSW 在读学生，愿意登记支持 BuilderSpace 申请成为正式社团（选填）"
              en="I'm a current UNSW student and I'd like to back BuilderSpace's application to become an official club (optional)"
            />
          </span>
        </label>
        {supporting && (
          <>
            <p className="mute support-note">
              <T
                zh="申请需要一份支持者名单。下面两项只会提交给 Arc 用于这次申请，不公开，也不用于其他用途；想撤回随时告诉管理员。"
                en="The application needs a list of supporters. These two fields go only to Arc for this application. They are never public or used for anything else, and you can ask an admin to remove them at any time."
              />
            </p>
            <div className="row2">
              <TextField
                name="fullName"
                label={
                  <T
                    zh="全名（与学生证一致）"
                    en="Full name (as on your student card)"
                  />
                }
                error={err.fullName}
                max={80}
              />
              <TextField
                name="zid"
                label={<span style={{ textTransform: "none" }}>zID</span>}
                placeholder="z1234567"
                error={err.zid}
                max={8}
              />
            </div>
            <label className="consent">
              <input type="checkbox" name="affiliationConsent" />
              <span>
                <T
                  zh="我同意把以上姓名和 zID 提交给 Arc，仅用于 BuilderSpace 的社团申请"
                  en="I agree to my name and zID being passed to Arc, only for BuilderSpace's club application"
                />
              </span>
            </label>
            {err.affiliationConsent && (
              <span className="form-status err">
                <Msg s={err.affiliationConsent} />
              </span>
            )}
          </>
        )}
      </div>

      {state.status === "error" && (
        <p className="form-status err" role="alert">
          <Msg s={state.message} />
        </p>
      )}
      <button
        type="submit"
        className="btn solid"
        disabled={pending}
        style={{ alignSelf: "start" }}
      >
        {pending ? (
          <T zh="提交中…" en="Sending…" />
        ) : (
          <T zh="提交，获取管理员微信" en="Submit & get the admin's WeChat" />
        )}{" "}
        <Arr />
      </button>
    </form>
  );
}

function TextField({
  name,
  label,
  placeholder,
  error,
  max,
}: {
  name: string;
  label: ReactNode;
  placeholder?: string;
  error?: string;
  max: number;
}) {
  return (
    <label className="field">
      <span className="mono">{label}</span>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        maxLength={max}
        aria-invalid={Boolean(error)}
        required
      />
      {error && (
        <span className="err">
          <Msg s={error} />
        </span>
      )}
    </label>
  );
}

function ChoiceGroup({
  name,
  legend,
  options,
  error,
  optional,
}: {
  name: string;
  legend: ReactNode;
  options: [string, Bi][];
  error?: string;
  optional?: boolean;
}) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="mono mute" style={{ marginBottom: 8 }}>
        {legend}
      </legend>
      <div className="filters">
        {options.map(([value, label]) => (
          <label key={value} className="chip">
            <input
              type="radio"
              name={name}
              value={value}
              required={!optional}
            />
            <T {...label} />
          </label>
        ))}
      </div>
      {error && (
        <span className="err">
          <Msg s={error} />
        </span>
      )}
    </fieldset>
  );
}

function CheckGroup({
  name,
  legend,
  options,
}: {
  name: string;
  legend: ReactNode;
  options: [string, Bi][];
}) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="mono mute" style={{ marginBottom: 8 }}>
        {legend}
      </legend>
      <div className="filters">
        {options.map(([value, label]) => (
          <label key={value} className="chip">
            <input type="checkbox" name={name} value={value} />
            <T {...label} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
