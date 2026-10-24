"use client";

import { useActionState } from "react";
import { Arr, Hud } from "@/components/fx/arr";
import { TextField } from "@/components/form-fields";
import { Msg, T } from "@/components/t";
import type { FormState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { addZid } from "./actions";

/**
 * For UNSW members who joined before the join flow asked for a zID: those who
 * signed in with a UNSW email, and those whose school says UNSW.
 */
export function ZidForm({ unswEmail }: { unswEmail: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addZid, {
    status: "idle",
  });
  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form className="form hud" noValidate onSubmit={submitWithoutReset(action)}>
      <Hud />
      <div>
        <p className="mono mute">
          <T zh="UNSW 同学 · 补填" en="UNSW students" />
        </p>
        <h2 className="h3" style={{ marginTop: 6 }}>
          <T zh="补上你的 zID" en="Add your zID" />
        </h2>
      </div>
      <p className="mute small">
        {unswEmail ? (
          <T
            zh="UNSW 同学加入时都要留 zID，你的登录邮箱里看不出来，补一下就好。"
            en="UNSW students leave their zID when they join. We can't tell yours from your email, so add it here."
          />
        ) : (
          <T
            zh="你的学校写的是 UNSW。UNSW 在读学生加入时都要留 zID，补一下就好；不是的话忽略这条。"
            en="Your university says UNSW. UNSW students leave their zID when they join, so add yours here. If you're not at UNSW, skip this."
          />
        )}{" "}
        <T
          zh="zID 只用来确认你是 UNSW 学生，只给社团后台看，不公开；填过之后要改请找管理员。"
          en="We only use it to confirm you're at UNSW. Only club admins see it; it's never public. To change it later, ask an admin."
        />
      </p>
      <TextField
        name="zid"
        label={<span style={{ textTransform: "none" }}>zID</span>}
        placeholder="z1234567"
        error={err.zid}
        max={8}
      />
      {state.status === "error" && !err.zid && (
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
        {pending ? <T zh="保存中…" en="Saving…" /> : <T zh="保存" en="Save" />}{" "}
        <Arr />
      </button>
    </form>
  );
}
