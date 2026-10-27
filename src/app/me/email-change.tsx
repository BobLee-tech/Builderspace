"use client";

import { useActionState, useState } from "react";
import { Arr } from "@/components/fx/arr";
import { TextField } from "@/components/form-fields";
import { OtpField, ResendCode } from "@/components/otp-field";
import { Msg, T } from "@/components/t";
import { isUnsw, schoolDomain } from "@/lib/members";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { confirmEmailCode, sendEmailCode, type EmailStep } from "./actions";

const idle: EmailStep = { status: "idle" };

/**
 * The sign-in email, and changing it: a code goes to the new address and
 * nothing changes until it comes back. A school address brings the seal; the
 * seal stays when moving off one.
 */
export function EmailChange({
  email,
  verified,
}: {
  email: string;
  verified: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Remounting the steps starts them over: a fresh email box, no old errors.
  const [round, setRound] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  return (
    <div className="me-set me-email">
      <div className="me-set-row">
        <div>
          <b>
            <T zh="登录邮箱" en="Sign-in email" />
          </b>
          <p className="mute small addr">{email}</p>
          {done === email && (
            <p className="ok-text small" role="status">
              ✓{" "}
              <T
                zh="已换好，下次用它登录"
                en="Changed. Sign in with it next time"
              />
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn ghost sm"
          aria-expanded={open}
          onClick={() => {
            setOpen((o) => !o);
            setRound((r) => r + 1);
          }}
        >
          {open ? <T zh="取消" en="Cancel" /> : <T zh="更换" en="Change" />}
        </button>
      </div>
      {open && (
        <Steps
          key={round}
          verified={verified}
          onDone={(next) => {
            setDone(next);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Steps({
  verified,
  onDone,
}: {
  verified: boolean;
  onDone: (email: string) => void;
}) {
  const [sent, send, sending] = useActionState(sendEmailCode, idle);
  const [checked, check, checking] = useActionState(
    async (prev: EmailStep, form: FormData) => {
      const next = await confirmEmailCode(prev, form);
      if (next.status === "ok") onDone(next.email);
      return next;
    },
    idle,
  );
  const [typed, setTyped] = useState("");
  // An error belongs to what was sent; typing again clears it.
  const [stale, setStale] = useState(false);
  const [editing, setEditing] = useState(false);
  const to = sent.status === "ok" && !editing ? sent.email : null;

  if (!to) {
    const failed = sent.status === "error" && !stale;
    const err = failed ? sent.fieldErrors?.email : undefined;
    return (
      <form
        className="me-email-step"
        noValidate
        onChange={(e) => {
          const box = e.target;
          if (box instanceof HTMLInputElement && box.name === "email") {
            setTyped(box.value);
            setStale(true);
          }
        }}
        onSubmit={submitWithoutReset((data) => {
          setEditing(false);
          setStale(false);
          send(data);
        })}
      >
        <TextField
          name="email"
          label={<T zh="新邮箱" en="New email" />}
          placeholder="z1234567@ad.unsw.edu.au"
          error={err}
          max={254}
          email
        />
        <Hint typed={typed} verified={verified} />
        {failed && !err && (
          <p className="form-status err" role="alert">
            <Msg s={sent.message} />
          </p>
        )}
        <button
          type="submit"
          className="btn solid primary sm"
          disabled={sending}
          style={{ alignSelf: "start" }}
        >
          {sending ? (
            <T zh="发送中…" en="Sending…" />
          ) : (
            <T zh="发验证码到新邮箱" en="Send a code to it" />
          )}{" "}
          <Arr />
        </button>
      </form>
    );
  }

  const err = checked.status === "error" ? checked.message : undefined;
  return (
    <form
      className="me-email-step"
      noValidate
      onSubmit={submitWithoutReset(check)}
    >
      <input type="hidden" name="email" value={to} />
      <p className="mute small">
        <T zh="验证码已发到" en="Code sent to" /> <b className="paper">{to}</b>{" "}
        ·{" "}
        <button
          type="button"
          className="linkish"
          onClick={() => setEditing(true)}
        >
          <T zh="改一下" en="Edit" />
        </button>
      </p>
      <OtpField error={err} pending={checking} />
      <button
        type="submit"
        className="btn solid primary sm"
        disabled={checking}
        style={{ alignSelf: "start" }}
      >
        {checking ? (
          <T zh="验证中…" en="Checking…" />
        ) : (
          <T zh="验证并更换" en="Verify and change" />
        )}{" "}
        <Arr />
      </button>
      <ResendCode email={to} action={sendEmailCode} />
    </form>
  );
}

/** One line on what the new address does to the seal. */
function Hint({ typed, verified }: { typed: string; verified: boolean }) {
  const looksDone = /@[^@\s]+\.[^@\s]{2,}$/.test(typed.trim());
  const domain = looksDone ? schoolDomain(typed) : null;
  if (domain) {
    return (
      <p className="mail-hint school small" aria-live="polite">
        <span className="ic">✓</span>
        <span>
          {isUnsw(domain) ? "UNSW" : <T zh="学校邮箱" en="School email" />}
          <T zh="：换好就是认证成员" en=": you'll be a verified member" />
        </span>
      </p>
    );
  }
  return (
    <p className="mail-hint small" aria-live="polite">
      <span className="ic">i</span>
      <span>
        {verified ? (
          <T zh="认证会保留" en="Your verified seal stays" />
        ) : (
          <T zh="换成学校邮箱就能认证" en="A school email makes you verified" />
        )}
      </span>
    </p>
  );
}
