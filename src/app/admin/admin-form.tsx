"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Arr, Hud } from "@/components/fx/arr";
import { Msg, T } from "@/components/t";
import { hasAdminFlag } from "@/lib/admin";
import type { FormState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { adminSignIn, adminSignOut } from "./actions";

export function AdminForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    adminSignIn,
    { status: "idle" },
  );
  const [signedIn, setSignedIn] = useState(false);
  const [leaving, startLeaving] = useTransition();

  // The flag cookie is only readable here, after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads a cookie once mounted
    setSignedIn(hasAdminFlag());
  }, [state]);

  if (signedIn) {
    return (
      <div className="form hud admin-box" role="status">
        <Hud />
        <p className="mono mute">
          <T zh="已登录" en="Signed in" />
        </p>
        <p>
          <T
            zh="管理员模式已开启。去项目广场打开任意项目，在讨论区里删除评论；删掉的评论在 Supabase 的 project_comments 里清空 deleted_at 就能恢复。"
            en="Admin mode is on. Open any project from the plaza to delete comments. To restore one, clear its deleted_at in project_comments in Supabase."
          />
        </p>
        <div className="admin-actions">
          <Link href="/projects" className="btn solid">
            <T zh="去项目广场" en="Go to projects" /> <Arr />
          </Link>
          <Link href="/live?host" prefetch={false} className="btn ghost">
            <T zh="活动现场主持" en="Run an event live" />
          </Link>
          <button
            type="button"
            className="btn ghost"
            disabled={leaving}
            onClick={() =>
              startLeaving(async () => {
                await adminSignOut();
                setSignedIn(false);
              })
            }
          >
            <T zh="退出" en="Sign out" />
          </button>
        </div>
      </div>
    );
  }

  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return (
    <form
      onSubmit={submitWithoutReset(action)}
      className="form hud admin-box"
      noValidate
    >
      <Hud />
      <label className="field">
        <span className="mono">
          <T zh="管理员口令" en="Admin key" />
        </span>
        <input
          type="password"
          name="key"
          autoComplete="current-password"
          aria-invalid={Boolean(err.key)}
        />
        {err.key && (
          <span className="err">
            <Msg s={err.key} />
          </span>
        )}
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
          <T zh="验证中…" en="Checking…" />
        ) : (
          <T zh="登录" en="Sign in" />
        )}{" "}
        <Arr />
      </button>
    </form>
  );
}
