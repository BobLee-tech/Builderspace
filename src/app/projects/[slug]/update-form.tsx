"use client";

import { useActionState } from "react";
import { SpamGuard } from "@/components/spam-guard";
import { Msg, T } from "@/components/t";
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
        <p className="mono mute">
          <T zh="已提交" en="Submitted" />
        </p>
        <p>
          <T
            zh="收到。运营核对后会出现在时间线上，并计入双周活跃项目数。"
            en="Got it. Once checked it appears on the timeline and counts towards active projects."
          />
        </p>
      </div>
    );
  }

  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <details className="box update-form">
      <summary className="mono">
        <T zh="提交进展 →" en="Post an update →" />
      </summary>
      <form onSubmit={submitWithoutReset(action)} className="form" noValidate>
        <input type="hidden" name="slug" value={slug} />
        <SpamGuard />
        <p className="mute">
          <T
            zh="发起人或队员填写，每两周一次就够。代码提交、Demo、更新帖任一都算进展。"
            en="For the owner or teammates — every two weeks is enough. A commit, demo or update post all count."
          />
        </p>

        <fieldset
          className="field"
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <legend className="mono mute" style={{ marginBottom: 8 }}>
            <T zh="类型" en="Type" />
          </legend>
          <div className="filters">
            {UPDATE_KINDS.map((k) => (
              <label key={k} className="chip">
                <input type="radio" name="kind" value={k} required />
                <T {...UPDATE_KIND_LABEL[k]} />
              </label>
            ))}
          </div>
          {err.kind && (
            <span className="err">
              <Msg s={err.kind} />
            </span>
          )}
        </fieldset>

        <label className="field">
          <span className="mono">
            <T zh="这两周做了什么" en="What did you do these two weeks?" />
          </span>
          <textarea
            name="body"
            maxLength={500}
            required
            placeholder="跑通了登录和发帖流程 / Login and posting work end to end"
            aria-invalid={Boolean(err.body)}
          />
          {err.body && (
            <span className="err">
              <Msg s={err.body} />
            </span>
          )}
        </label>

        <div className="row2">
          <label className="field">
            <span className="mono">
              <T zh="链接（可选）" en="Link (optional)" />
            </span>
            <input
              type="url"
              name="url"
              placeholder="Commit / Demo / post URL"
              aria-invalid={Boolean(err.url)}
            />
            {err.url && (
              <span className="err">
                <Msg s={err.url} />
              </span>
            )}
          </label>
          <label className="field">
            <span className="mono">
              <T zh="你的昵称" en="Your nickname" />
            </span>
            <input
              type="text"
              name="submittedBy"
              maxLength={40}
              required
              aria-invalid={Boolean(err.submittedBy)}
            />
            {err.submittedBy && (
              <span className="err">
                <Msg s={err.submittedBy} />
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
            <T zh="提交进展" en="Post update" />
          )}{" "}
          <span className="arr">→</span>
        </button>
      </form>
    </details>
  );
}
