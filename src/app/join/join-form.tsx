"use client";

import Link from "next/link";
import { NAV_TRANSITION } from "@/components/nav-links";
import { useActionState, type ReactNode } from "react";
import { SpamGuard } from "@/components/spam-guard";
import { Msg, T } from "@/components/t";
import { channelFromSearch, type FormState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import {
  BLOCKERS,
  BLOCKER_LABEL,
  HOURS_LABEL,
  REFERRAL_LABEL,
  REFERRAL_SOURCES,
  SKILLS,
  SKILL_LABEL,
  WEEKLY_HOURS,
} from "@/lib/types";
import { submitJoin } from "./actions";

type Bi = { zh: string; en: string };

export function JoinForm({ adminQr }: { adminQr: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitJoin,
    { status: "idle" },
  );

  if (state.status === "ok") {
    return (
      <div className="form" role="status">
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
            zh="扫码加管理员微信，备注“BuilderSpace + 昵称”。管理员会拉你进群，并发下一场活动的报名链接。"
            en='Scan to add the admin on WeChat with the note "BuilderSpace + your nickname". They will add you to the group and send the next sign-up link.'
          />
        </p>
        {adminQr ? (
          // eslint-disable-next-line @next/next/no-img-element -- ops-supplied QR, any host
          <img
            src={adminQr}
            alt="Admin WeChat QR / 管理员微信二维码"
            className="qr"
          />
        ) : (
          <div className="qr">
            <T zh="管理员二维码待上传" en="Admin QR coming soon" />
          </div>
        )}
        <Link
          transitionTypes={NAV_TRANSITION}
          href="/events"
          className="btn ghost"
          style={{ alignSelf: "start" }}
        >
          <T zh="看下一场活动" en="See the next event" />{" "}
          <span className="arr">→</span>
        </Link>
      </div>
    );
  }

  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      onSubmit={submitWithoutReset((data) => {
        // Channel tag from the link this visitor came in on (?ref= / utm_source).
        data.set("channel", channelFromSearch(window.location.search) ?? "");
        action(data);
      })}
      className="form"
      noValidate
    >
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

      <label className="consent">
        <input type="checkbox" name="showcaseConsent" />
        <span>
          <T
            zh="我同意在项目广场和活动回顾中展示我的作品（可随时撤回）"
            en="Show my work in the project plaza and event recaps (you can withdraw any time)"
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
        className="btn solid"
        disabled={pending}
        style={{ alignSelf: "start" }}
      >
        {pending ? (
          <T zh="提交中…" en="Sending…" />
        ) : (
          <T zh="提交，获取管理员微信" en="Submit & get the admin's WeChat" />
        )}{" "}
        <span className="arr">→</span>
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
}: {
  name: string;
  legend: ReactNode;
  options: [string, Bi][];
  error?: string;
}) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="mono mute" style={{ marginBottom: 8 }}>
        {legend}
      </legend>
      <div className="filters">
        {options.map(([value, label]) => (
          <label key={value} className="chip">
            <input type="radio" name={name} value={value} required />
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
