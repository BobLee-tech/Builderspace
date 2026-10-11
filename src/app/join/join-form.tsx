"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import {
  HOURS_LABEL,
  REFERRAL_LABEL,
  REFERRAL_SOURCES,
  SKILLS,
  SKILL_LABEL,
  WEEKLY_HOURS,
} from "@/lib/types";
import { submitJoin } from "./actions";

export function JoinForm({ adminQr }: { adminQr: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitJoin,
    { status: "idle" },
  );

  if (state.status === "ok") {
    return (
      <div className="form" role="status">
        <p className="mono mute">提交成功</p>
        <h2 className="h2" style={{ fontSize: 32 }}>
          欢迎，{state.nickname}。
        </h2>
        <p className="mute">
          扫码加管理员微信，备注“BuilderSpace +
          昵称”。管理员会拉你进群，并发下一场活动的报名链接。
        </p>
        {adminQr ? (
          // eslint-disable-next-line @next/next/no-img-element -- ops-supplied QR, any host
          <img src={adminQr} alt="管理员微信二维码" className="qr" />
        ) : (
          <div className="qr">管理员二维码待上传</div>
        )}
        <Link
          href="/events"
          className="btn ghost"
          style={{ alignSelf: "start" }}
        >
          看下一场活动 <span className="arr">→</span>
        </Link>
      </div>
    );
  }

  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form onSubmit={submitWithoutReset(action)} className="form" noValidate>
      <div className="row2">
        <TextField name="nickname" label="昵称" error={err.nickname} max={40} />
        <TextField
          name="schoolDegree"
          label="学校与学位"
          placeholder="UNSW · Master of IT"
          error={err.schoolDegree}
          max={80}
        />
      </div>
      <TextField
        name="major"
        label="专业"
        placeholder="Information Technology"
        error={err.major}
        max={80}
      />

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="mono mute" style={{ marginBottom: 8 }}>
          技能（可多选）
        </legend>
        <div className="filters">
          {SKILLS.map((s) => (
            <label key={s} className="chip">
              <input type="checkbox" name="skills" value={s} />
              {SKILL_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="mono">想做什么</span>
        <textarea
          name="idea"
          maxLength={500}
          placeholder="一个帮留学生合租找室友的小工具，上学期想做但一直没开始。"
        />
      </label>

      <ChoiceGroup
        name="weeklyHours"
        legend="每周可投入"
        options={WEEKLY_HOURS.map((h) => [h, HOURS_LABEL[h]])}
        error={err.weeklyHours}
      />
      <ChoiceGroup
        name="referralSource"
        legend="从哪里知道我们"
        options={REFERRAL_SOURCES.map((r) => [r, REFERRAL_LABEL[r]])}
        error={err.referralSource}
      />

      <label className="consent">
        <input type="checkbox" name="showcaseConsent" />
        我同意在项目广场和活动回顾中展示我的作品（可随时撤回）
      </label>

      {state.status === "error" && (
        <p className="form-status err" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        className="btn solid"
        disabled={pending}
        style={{ alignSelf: "start" }}
      >
        {pending ? "提交中…" : "提交，获取管理员微信"}{" "}
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
  label: string;
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
      {error && <span className="err">{error}</span>}
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
  legend: string;
  options: [string, string][];
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
            {label}
          </label>
        ))}
      </div>
      {error && <span className="err">{error}</span>}
    </fieldset>
  );
}
