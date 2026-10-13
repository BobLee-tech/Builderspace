"use client";

import { Arr } from "@/components/fx/arr";
import Link from "next/link";
import { useActionState } from "react";
import { SpamGuard } from "@/components/spam-guard";
import { Msg, T } from "@/components/t";
import type { FormState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { ROLES, ROLE_LABEL } from "@/lib/types";
import { submitProject } from "./actions";

const FIELDS = [
  { name: "name", zh: "项目名", en: "Project name", max: 60 },
  {
    name: "targetUser",
    zh: "目标用户",
    en: "Who is it for?",
    max: 80,
    hint: "悉尼留学生 / International students in Sydney",
  },
  { name: "ownerName", zh: "发起人昵称", en: "Your nickname", max: 40 },
  {
    name: "contact",
    zh: "公开联系方式",
    en: "Public contact",
    max: 120,
    hint: "WeChat ID / email — shown on the card",
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
        <p className="mono mute">
          <T zh="已提交" en="Submitted" />
        </p>
        <h2 className="h2" style={{ fontSize: 32 }}>
          <T zh="收到，审核后公开。" en="Got it — it goes live after review." />
        </h2>
        <p className="mute">
          <T
            zh="运营会在 48 小时内看完。之后每两周更新一次进展，项目就会一直在广场上。"
            en="We review within 48 hours. Post an update every two weeks and your project stays in the plaza."
          />
        </p>
        <Link
          href="/projects"
          className="btn ghost"
          style={{ alignSelf: "start" }}
        >
          <T zh="回项目广场" en="Back to projects" /> <Arr />
        </Link>
      </div>
    );
  }

  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form onSubmit={submitWithoutReset(action)} className="form" noValidate>
      <SpamGuard />
      <div className="row2">
        {FIELDS.map((f) => (
          <label key={f.name} className="field">
            <span className="mono">
              <T zh={f.zh} en={f.en} />
            </span>
            <input
              type="text"
              name={f.name}
              maxLength={f.max}
              placeholder={"hint" in f ? f.hint : undefined}
              aria-invalid={Boolean(err[f.name])}
              required
            />
            {err[f.name] && (
              <span className="err">
                <Msg s={err[f.name]} />
              </span>
            )}
          </label>
        ))}
      </div>

      <label className="field">
        <span className="mono">
          <T zh="要解决的问题" en="The problem" />
        </span>
        <textarea
          name="problem"
          maxLength={280}
          required
          placeholder="找室友靠小红书刷帖，信息过期 / Flatmate posts go stale and can't be filtered by commute"
          aria-invalid={Boolean(err.problem)}
        />
        {err.problem && (
          <span className="err">
            <Msg s={err.problem} />
          </span>
        )}
      </label>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="mono mute" style={{ marginBottom: 8 }}>
          <T zh="缺的角色" en="Roles you need" />
        </legend>
        <div className="filters">
          {ROLES.map((r) => (
            <label key={r} className="chip">
              <input type="checkbox" name="neededRoles" value={r} />
              <T {...ROLE_LABEL[r]} />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="mono">
          <T zh="下一步" en="Next step" />
        </span>
        <input type="text" name="nextStep" maxLength={280} />
      </label>

      <div className="row2">
        <label className="field">
          <span className="mono">
            <T zh="仓库链接（可选）" en="Repo link (optional)" />
          </span>
          <input type="url" name="repoUrl" placeholder="https://github.com/…" />
          {err.repoUrl && (
            <span className="err">
              <Msg s={err.repoUrl} />
            </span>
          )}
        </label>
        <label className="field">
          <span className="mono">
            <T zh="Demo 链接（可选）" en="Demo link (optional)" />
          </span>
          <input type="url" name="demoUrl" placeholder="https://" />
          {err.demoUrl && (
            <span className="err">
              <Msg s={err.demoUrl} />
            </span>
          )}
        </label>
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
          <T zh="提交项目卡" en="Submit project" />
        )}{" "}
        <Arr />
      </button>
    </form>
  );
}
