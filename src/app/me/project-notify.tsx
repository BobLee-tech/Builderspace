"use client";

import { useActionState } from "react";
import { NotifyChoices } from "@/components/notify-choices";
import { Msg, T } from "@/components/t";
import type { NotifyPrefs } from "@/lib/notify";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { saveProjectNotify, type NotifySaved } from "./actions";

/** One project's email settings on /me; each pick saves right away. */
export function ProjectNotify({
  slug,
  initial,
}: {
  slug: string;
  initial: NotifyPrefs;
}) {
  const [state, action, pending] = useActionState<NotifySaved, FormData>(
    saveProjectNotify,
    { status: "idle" },
  );
  return (
    <form onSubmit={submitWithoutReset(action)} className="notify-box">
      <input type="hidden" name="slug" value={slug} />
      <NotifyChoices
        initial={initial}
        onPick={(form) => form?.requestSubmit()}
      />
      <p className="mono mute small" aria-live="polite">
        {pending ? (
          <T zh="保存中…" en="Saving…" />
        ) : state.status === "ok" ? (
          <span className="ok-text">
            ✓ <T zh="已保存" en="Saved" />
          </span>
        ) : state.status === "error" ? (
          <span className="err">
            <Msg s={state.message} />
          </span>
        ) : (
          <T zh="选了就保存" en="Saves as you pick" />
        )}
      </p>
    </form>
  );
}
