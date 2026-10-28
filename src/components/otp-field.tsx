"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { errorId, FieldError } from "@/components/form-fields";
import { Msg, T } from "@/components/t";

/**
 * The 6-digit code box: one input, so paste and autofill just work, and the
 * form submits by itself on the sixth digit.
 */
export function OtpField({
  error,
  pending,
}: {
  error?: string;
  pending: boolean;
}) {
  return (
    <label className="field">
      <span className="mono">
        <T zh="6 位验证码" en="6-digit code" />
      </span>
      <input
        className="otp"
        type="text"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId("code") : undefined}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 6);
          e.target.value = v;
          if (v.length === 6 && !pending) e.target.form?.requestSubmit();
        }}
      />
      <FieldError name="code" error={error} />
    </label>
  );
}

type SendState = { status: string; message?: string };

/** Lets the member ask for a fresh code after 60 seconds. */
export function ResendCode({
  email,
  action,
}: {
  email: string;
  /** The form's own send action; only its status and message are read here. */
  action: (prev: never, form: FormData) => Promise<SendState>;
}) {
  const [left, setLeft] = useState(60);
  const [state, send, sending] = useActionState(
    (prev: SendState, form: FormData) => action(prev as never, form),
    { status: "idle" },
  );
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
    const t = setInterval(() => {
      setLeft(
        Math.max(0, 60 - Math.round((Date.now() - started.current) / 1000)),
      );
    }, 1000);
    return () => clearInterval(t);
  }, [state]);
  return (
    <p className="mute small">
      {left > 0 ? (
        <T zh={`${left} 秒后可以重发`} en={`Resend in ${left}s`} />
      ) : (
        <button
          type="button"
          className="linkish"
          disabled={sending}
          onClick={() => {
            const data = new FormData();
            data.set("email", email);
            send(data);
          }}
        >
          <T zh="重新发送验证码" en="Send a new code" />
        </button>
      )}
      {state.status === "error" && state.message && (
        <span className="form-status err">
          {" "}
          <Msg s={state.message} />
        </span>
      )}
    </p>
  );
}
