"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { ROLES, ROLE_LABEL } from "@/lib/types";
import { submitProject } from "./actions";

const FIELDS = [
  { name: "name", label: "项目名", max: 60 },
  { name: "targetUser", label: "目标用户", max: 80, hint: "悉尼留学生" },
  { name: "ownerName", label: "发起人昵称", max: 40 },
  {
    name: "contact",
    label: "公开联系方式",
    max: 120,
    hint: "微信号 / 邮箱，会显示在项目卡上",
  },
] as const;

export function ProjectForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitProject,
    { status: "idle" },
  );

  if (state.status === "ok") {
    return (
      <div className="form" role="status">
        <p className="mono mute">已提交</p>
        <h2 className="h2" style={{ fontSize: 32 }}>
          收到，审核后公开。
        </h2>
        <p className="mute">
          运营会在 48 小时内看完。之后每两周更新一次进展，项目就会一直在广场上。
        </p>
        <Link
          href="/projects"
          className="btn ghost"
          style={{ alignSelf: "start" }}
        >
          回项目广场 <span className="arr">→</span>
        </Link>
      </div>
    );
  }

  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form onSubmit={submitWithoutReset(action)} className="form" noValidate>
      <div className="row2">
        {FIELDS.map((f) => (
          <label key={f.name} className="field">
            <span className="mono">{f.label}</span>
            <input
              type="text"
              name={f.name}
              maxLength={f.max}
              placeholder={"hint" in f ? f.hint : undefined}
              aria-invalid={Boolean(err[f.name])}
              required
            />
            {err[f.name] && <span className="err">{err[f.name]}</span>}
          </label>
        ))}
      </div>

      <label className="field">
        <span className="mono">要解决的问题</span>
        <textarea
          name="problem"
          maxLength={280}
          required
          placeholder="找室友靠小红书刷帖，信息过期、没法按通勤筛。"
          aria-invalid={Boolean(err.problem)}
        />
        {err.problem && <span className="err">{err.problem}</span>}
      </label>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="mono mute" style={{ marginBottom: 8 }}>
          缺的角色
        </legend>
        <div className="filters">
          {ROLES.map((r) => (
            <label key={r} className="chip">
              <input type="checkbox" name="neededRoles" value={r} />
              {ROLE_LABEL[r]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="mono">下一步</span>
        <input type="text" name="nextStep" maxLength={280} />
      </label>

      <div className="row2">
        <label className="field">
          <span className="mono">仓库链接（可选）</span>
          <input type="url" name="repoUrl" placeholder="https://github.com/…" />
          {err.repoUrl && <span className="err">{err.repoUrl}</span>}
        </label>
        <label className="field">
          <span className="mono">Demo 链接（可选）</span>
          <input type="url" name="demoUrl" placeholder="https://" />
          {err.demoUrl && <span className="err">{err.demoUrl}</span>}
        </label>
      </div>

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
        {pending ? "提交中…" : "提交项目卡"} <span className="arr">→</span>
      </button>
    </form>
  );
}
