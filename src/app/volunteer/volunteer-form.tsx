"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  CheckGroup,
  ChoiceGroup,
  FieldError,
  TextField,
} from "@/components/form-fields";
import { Arr, Hud } from "@/components/fx/arr";
import { SpamGuard } from "@/components/spam-guard";
import { useRevealResult } from "@/components/use-reveal-result";
import { Msg, T } from "@/components/t";
import { channelFromSearch, type FormState } from "@/lib/forms";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import {
  DEPARTMENTS,
  HOURS_LABEL,
  POSITION_LABEL,
  WEEKLY_HOURS,
} from "@/lib/types";
import { submitVolunteer } from "./actions";

export function VolunteerForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitVolunteer,
    { status: "idle" },
  );
  const reveal = useRevealResult(state);

  if (state.status === "ok") {
    return (
      <div ref={reveal} className="form hud" role="status">
        <Hud />
        <p className="mono mute">
          <T zh="已提交" en="Submitted" />
        </p>
        <h2 className="h2" style={{ fontSize: 32 }}>
          <T
            zh={`收到了，${state.nickname}。`}
            en={`Got it, ${state.nickname}.`}
          />
        </h2>
        <p className="mute">
          <T
            zh="我们会通过你留下的联系方式约一次面试，具体分工面试时再聊。"
            en="We'll use the contact you left to set up a chat. Who does what is something we settle together there."
          />
        </p>
        <Link
          href="/people"
          className="btn ghost"
          style={{ alignSelf: "start" }}
        >
          <T zh="回成员页" en="Back to People" /> <Arr />
        </Link>
      </div>
    );
  }

  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      ref={reveal}
      onSubmit={submitWithoutReset((data) => {
        // Channel tag from the link this visitor came in on (?ref= / utm_source).
        data.set("channel", channelFromSearch(window.location.search) ?? "");
        action(data);
      })}
      className="form hud"
      noValidate
    >
      <Hud />
      <SpamGuard />
      <div className="row2">
        <TextField
          name="nickname"
          label={<T zh="昵称" en="Nickname" />}
          error={err.nickname}
          max={40}
        />
        <TextField
          name="schoolDegree"
          label={<T zh="学校与学位" en="University & degree" />}
          placeholder="UNSW · Master of IT"
          error={err.schoolDegree}
          max={80}
        />
      </div>
      <TextField
        name="contact"
        label={<T zh="微信号或邮箱" en="WeChat ID or email" />}
        placeholder="wechat: yuki"
        error={err.contact}
        max={120}
      />

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="mono mute" style={{ marginBottom: 8 }}>
          <T
            zh="想申请的职位（至少选一个，可多选）"
            en="Positions you'd like (pick at least one)"
          />
        </legend>
        {DEPARTMENTS.map((dept) => (
          <CheckGroup
            key={dept.positions[0]}
            name="positions"
            legend={<T {...dept.name} />}
            options={dept.positions.map((p) => [p, POSITION_LABEL[p]])}
          />
        ))}
        <FieldError error={err.positions} />
      </fieldset>

      <ChoiceGroup
        name="weeklyHours"
        legend={<T zh="每周可稳定投入" en="Hours per week you can commit" />}
        options={WEEKLY_HOURS.map((h) => [h, HOURS_LABEL[h]])}
        error={err.weeklyHours}
      />

      <TextField
        name="about"
        label={
          <T
            zh="为什么想加入，做过哪些相关的事"
            en="Why you want in, and what you've done that's related"
          />
        }
        placeholder="办过两场校内活动 / Ran two campus events"
        error={err.about}
        max={500}
        multiline
      />

      <TextField
        name="portfolioUrl"
        label={
          <T
            zh="作品或主页链接（选填）"
            en="Portfolio or profile link (optional)"
          />
        }
        placeholder="github.com/…"
        error={err.portfolioUrl}
        max={300}
        optional
      />

      <label className="consent">
        <input type="checkbox" name="dataConsent" />
        <span>
          <T
            zh="我同意 BuilderSpace 保存以上信息，仅用于联系和筛选核心团队志愿者（可随时要求删除）"
            en="I agree to BuilderSpace keeping this information, only to contact and select core-team volunteers (deleted on request)"
          />
        </span>
      </label>
      {err.dataConsent && (
        <span className="form-status err">
          <Msg s={err.dataConsent} />
        </span>
      )}

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
          <T zh="提交申请" en="Submit application" />
        )}{" "}
        <Arr />
      </button>
    </form>
  );
}
