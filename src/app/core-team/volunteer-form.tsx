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
import { useCelebration } from "@/components/fx/celebrate";
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
import { SPARK_INFO, type Spark } from "@/lib/members";
import { submitVolunteer } from "./actions";

// Order along the bottom edge; the middle one (Momo) hops and says thanks.
const CREW: Spark[] = ["vivi", "lumi", "momo", "geo", "kiko"];

/** Title words that rise in one after another. */
function Words({ parts }: { parts: string[] }) {
  return parts.map((w, i) => (
    <span key={i} className="w" style={{ "--i": i } as React.CSSProperties}>
      {w}
    </span>
  ));
}

export function VolunteerForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitVolunteer,
    { status: "idle" },
  );
  const reveal = useRevealResult(state);
  const celebrate = useCelebration("join", state.status === "ok");

  if (state.status === "ok") {
    return (
      <div
        ref={(node) => {
          reveal(node);
          celebrate(node);
        }}
        className="form hud thanks"
        role="status"
      >
        <Hud />
        <div className="thanks-head">
          <svg className="thanks-stamp" viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="28" r="25" />
            <path d="M18 29 l7 7 l13 -15" />
          </svg>
          <p className="mono mute">
            <T zh="已提交" en="Submitted" />
            <br />
            <b>Core team · Application received</b>
          </p>
        </div>
        <h2 className="h2 thanks-title">
          <T
            zh={<Words parts={[`收到了，${state.nickname}。`, "谢谢申请！"]} />}
            en={<Words parts={[`Got it, ${state.nickname}.`, "Thank you!"]} />}
          />
        </h2>
        <div className="thanks-body">
          <p className="thanks-lede">
            <T
              zh="谢谢你愿意一起把 BuilderSpace 做起来。"
              en="Thank you for wanting to build BuilderSpace with us."
            />
          </p>
          <p className="mute">
            <T
              zh="审核通过后，我们会用这个邮箱给你开通内部协作系统的账号。"
              en="Once we've reviewed it, we'll open an account on our internal workspace with this email."
            />
          </p>
        </div>
        <Link href="/people" className="btn ghost thanks-cta">
          <T zh="回成员页" en="Back to People" /> <Arr />
        </Link>
        <div className="thanks-crew" aria-hidden="true">
          {CREW.map((s, i) => (
            <div
              key={s}
              className={i === 2 ? "m lead" : "m"}
              style={{ "--i": i } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG art */}
              <img src={`/mascots/${s}.svg`} alt="" />
              {[-26, 0, 24].map((dx) => (
                <i
                  key={dx}
                  className="spark"
                  style={
                    {
                      "--c": SPARK_INFO[s].color,
                      "--dx": `${dx + (i - 2) * 6}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
              {i === 2 && (
                <span className="bubble">
                  <T zh="谢谢你！" en="Thanks!" />
                </span>
              )}
            </div>
          ))}
        </div>
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
          label={<T zh="微信昵称" en="WeChat name" />}
          error={err.nickname}
          max={40}
        />
        <TextField
          name="email"
          label={<T zh="邮箱" en="Email" />}
          placeholder="yuki@example.com"
          error={err.email}
          max={254}
          email
        />
      </div>

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
            invalid={Boolean(err.positions)}
          />
        ))}
        <FieldError name="positions" error={err.positions} />
      </fieldset>

      <TextField
        name="schoolDegree"
        label={
          <T zh="学校与学位（选填）" en="University & degree (optional)" />
        }
        placeholder="UNSW · Master of IT"
        error={err.schoolDegree}
        max={80}
        optional
      />

      <ChoiceGroup
        name="weeklyHours"
        legend={
          <T
            zh="每周可稳定投入（选填）"
            en="Hours per week you can commit (optional)"
          />
        }
        options={WEEKLY_HOURS.map((h) => [h, HOURS_LABEL[h]])}
        error={err.weeklyHours}
        optional
      />

      <TextField
        name="about"
        label={
          <T
            zh="个人介绍：为什么想加入，做过哪些相关的事（选填）"
            en="About you: why you want in, and what you've done that's related (optional)"
          />
        }
        placeholder="办过两场校内活动 / Ran two campus events"
        error={err.about}
        max={500}
        multiline
        optional
      />

      <TextField
        name="portfolioUrl"
        label={
          <T
            zh="简历、作品或主页链接（选填）"
            en="Résumé, portfolio or profile link (optional)"
          />
        }
        placeholder="linkedin.com/in/… / github.com/…"
        error={err.portfolioUrl}
        max={300}
        optional
        url
      />

      <label className="consent">
        <input type="checkbox" name="dataConsent" />
        <span>
          <T
            zh="我同意 BuilderSpace 保存以上信息，仅用于联系和筛选核心团队成员（可随时要求删除）"
            en="I agree to BuilderSpace keeping this information, only to contact and select core-team members (deleted on request)"
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
        className="btn solid primary"
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
