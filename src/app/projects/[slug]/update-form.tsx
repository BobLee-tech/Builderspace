"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { UPDATE_KINDS, UPDATE_KIND_LABEL } from "@/lib/types";
import { submitProjectUpdate } from "./actions";

export function UpdateForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitProjectUpdate,
    { status: "idle" },
  );

  if (state.status === "ok") {
    return (
      <div className="form box update-form" role="status">
        <p className="mono mute">已提交</p>
        <p>收到。运营核对后会出现在时间线上，并计入双周活跃项目数。</p>
      </div>
    );
  }

  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <details className="box update-form">
      <summary className="mono">提交进展 →</summary>
      <form onSubmit={submitWithoutReset(action)} className="form" noValidate>
        <input type="hidden" name="slug" value={slug} />
        <p className="mute">
          发起人或队员填写，每两周一次就够。代码提交、Demo、更新帖任一都算进展。
        </p>

        <fieldset
          className="field"
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <legend className="mono mute" style={{ marginBottom: 8 }}>
            类型
          </legend>
          <div className="filters">
            {UPDATE_KINDS.map((k) => (
              <label key={k} className="chip">
                <input type="radio" name="kind" value={k} required />
                {UPDATE_KIND_LABEL[k]}
              </label>
            ))}
          </div>
          {err.kind && <span className="err">{err.kind}</span>}
        </fieldset>

        <label className="field">
          <span className="mono">这两周做了什么</span>
          <textarea
            name="body"
            maxLength={500}
            required
            placeholder="跑通了登录和发帖流程，约了 5 位同学下周试用。"
            aria-invalid={Boolean(err.body)}
          />
          {err.body && <span className="err">{err.body}</span>}
        </label>

        <div className="row2">
          <label className="field">
            <span className="mono">链接（可选）</span>
            <input
              type="url"
              name="url"
              placeholder="Commit / Demo / 帖子链接"
              aria-invalid={Boolean(err.url)}
            />
            {err.url && <span className="err">{err.url}</span>}
          </label>
          <label className="field">
            <span className="mono">你的昵称</span>
            <input
              type="text"
              name="submittedBy"
              maxLength={40}
              required
              aria-invalid={Boolean(err.submittedBy)}
            />
            {err.submittedBy && <span className="err">{err.submittedBy}</span>}
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
          {pending ? "提交中…" : "提交进展"} <span className="arr">→</span>
        </button>
      </form>
    </details>
  );
}
