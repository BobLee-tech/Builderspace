"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Arr, Hud } from "@/components/fx/arr";
import { errorId, FieldError, TextField } from "@/components/form-fields";
import { OtpField, ResendCode } from "@/components/otp-field";
import { SpamGuard } from "@/components/spam-guard";
import { Msg, T } from "@/components/t";
import { channelFromSearch, nextFromSearch } from "@/lib/forms";
import { ZID_NEEDED, zidSchema } from "@/lib/member-forms";
import {
  isUnsw,
  LOOKING_FOR,
  LOOKING_LABEL,
  MAX_LOOKING,
  MAX_SKILLS,
  MEMBER_SKILL_GROUPS,
  MEMBER_SKILL_LABEL,
  schoolDomain,
  sealLabel,
  SPARK_INFO,
  SPARKS,
  type LookingFor,
  type MemberSkill,
  type Spark,
  zidFromEmail,
} from "@/lib/members";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import { confirmCode, makeCard, requestCode, type StepState } from "./actions";
import { MemberCard, type CardView } from "./member-card";

type Step = "email" | "code" | "profile" | "spark";
const STEPS: [Step, { zh: string; en: string }][] = [
  ["email", { zh: "邮箱", en: "Email" }],
  ["code", { zh: "验证码", en: "Code" }],
  ["profile", { zh: "资料", en: "Profile" }],
  ["spark", { zh: "拼块", en: "Your piece" }],
];
const idle: StepState = { status: "idle" };

function readCard(form: HTMLFormElement): CardView {
  const d = new FormData(form);
  const s = (k: string) => String(d.get(k) ?? "").trim();
  return {
    nickname: s("nickname"),
    schoolDegree: s("schoolDegree"),
    major: s("major"),
    skills: d.getAll("skills").map(String) as MemberSkill[],
    spark: (s("spark") || "lumi") as Spark,
    memberNo: null,
    seal: null,
    building: s("building") || null,
    lookingFor: d.getAll("lookingFor").map(String) as LookingFor[],
  };
}

/** Caps a group of checkboxes: once `max` are ticked the rest are disabled. */
function capChecks(form: HTMLFormElement, name: string, max: number) {
  const boxes = [
    ...form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`),
  ];
  const n = boxes.filter((b) => b.checked).length;
  for (const b of boxes) b.disabled = !b.checked && n >= max;
  return n;
}

/**
 * Joining is signing up: email → 6-digit code → profile → pick your piece.
 * The card on the side fills in as you type and turns over to the builder
 * profile on the last step. Members who already have a card are sent to /me.
 */
export function JoinFlow({ signedInEmail }: { signedInEmail: string | null }) {
  const [step, setStep] = useState<Step>(signedInEmail ? "profile" : "email");
  const [email, setEmail] = useState(signedInEmail ?? "");
  const [typed, setTyped] = useState("");
  const domain = schoolDomain(email);
  const seal = domain ? sealLabel(domain) : null;
  const [card, setCard] = useState<CardView>({
    nickname: "",
    schoolDegree: "",
    major: "",
    skills: [],
    spark: "lumi",
    memberNo: null,
    seal: null,
    building: null,
    lookingFor: [],
  });

  const [sent, send, sending] = useActionState(requestCode, idle);
  const [checked, check, checking] = useActionState(confirmCode, idle);
  const [made, make, making] = useActionState(makeCard, idle);

  // Move on when a step's action comes back ok (adjusting state while
  // rendering, rather than in an effect).
  const [seen, setSeen] = useState({ sent, checked });
  if (seen.sent !== sent || seen.checked !== checked) {
    setSeen({ sent, checked });
    if (seen.sent !== sent && sent.status === "ok" && sent.email) {
      setEmail(sent.email);
      setStep("code");
    }
    if (
      seen.checked !== checked &&
      checked.status === "ok" &&
      !checked.hasCard
    ) {
      setStep("profile");
    }
  }

  // A returning member: a full page load to their card (or where they came
  // from). A client-side hop to /me would open the 我的 sheet over this form.
  useEffect(() => {
    if (checked.status === "ok" && checked.hasCard) {
      location.assign(checked.next ?? "/me");
    }
  }, [checked]);

  const at = STEPS.findIndex(([s]) => s === step);
  const toProfile = useCallback(() => setStep("profile"), []);
  const toSpark = useCallback(() => setStep("spark"), []);
  const toEmail = useCallback(() => setStep("email"), []);

  return (
    <div className="join2">
      <MemberCard
        card={{ ...card, seal }}
        flipped={step === "spark"}
        caption={
          step === "spark" ? (
            <T
              zh="卡片背面 · 你的 builder 档案"
              en="The back · your builder profile"
            />
          ) : (
            <T
              zh="你的成员卡 · 跟着表单实时更新"
              en="Your member card · updates as you type"
            />
          )
        }
      />
      <div className="join-steps">
        <ol className="steps" aria-label="Steps">
          {STEPS.map(([s, label], i) => (
            <li key={s} className={i === at ? "on" : i < at ? "done" : ""}>
              <i />
              <T {...label} />
            </li>
          ))}
        </ol>

        {step === "email" && (
          <form
            className="form hud"
            noValidate
            onSubmit={submitWithoutReset(send)}
          >
            <Hud />
            <SpamGuard />
            <label className="field">
              <span className="mono field-row">
                <T zh="邮箱" en="Email" />
                <em className="pill-ok">
                  <T zh="推荐学校邮箱" en="School email recommended" />
                </em>
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="z1234567@ad.unsw.edu.au"
                maxLength={254}
                required
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-invalid={sent.status === "error"}
                aria-describedby={
                  sent.status === "error" ? errorId("email") : undefined
                }
              />
              <FieldError
                name="email"
                error={sent.status === "error" ? sent.message : undefined}
              />
            </label>
            <MailHint email={typed} />
            <button
              type="submit"
              className="btn solid primary"
              disabled={sending}
              style={{ alignSelf: "start" }}
            >
              {sending ? (
                <T zh="发送中…" en="Sending…" />
              ) : (
                <T zh="发送 6 位验证码" en="Send me a 6-digit code" />
              )}{" "}
              <Arr />
            </button>
            <p className="mute small">
              <T
                zh="不用设密码。每次登录，我们往这个邮箱发一个 6 位验证码。"
                en="No password. Each time you sign in we email you a 6-digit code."
              />
            </p>
          </form>
        )}

        {step === "code" && (
          <form
            className="form hud"
            noValidate
            onSubmit={submitWithoutReset((data) => {
              // Where to go once signed in (e.g. back to submitting a project).
              data.set("next", nextFromSearch(window.location.search) ?? "");
              check(data);
            })}
          >
            <Hud />
            <input type="hidden" name="email" value={email} />
            <p className="mute">
              <T zh="验证码已发到" en="We sent a code to" />{" "}
              <b className="paper">{email}</b> ·{" "}
              <button
                type="button"
                className="linkish"
                onClick={() => setStep("email")}
              >
                <T zh="换个邮箱" en="Use another email" />
              </button>
            </p>
            <OtpField
              error={checked.status === "error" ? checked.message : undefined}
              pending={checking}
            />
            <button
              type="submit"
              className="btn solid primary"
              disabled={checking}
              style={{ alignSelf: "start" }}
            >
              {checking ? (
                <T zh="验证中…" en="Checking…" />
              ) : (
                <T zh="验证" en="Verify" />
              )}{" "}
              <Arr />
            </button>
            <ResendCode email={email} action={requestCode} />
          </form>
        )}

        {(step === "profile" || step === "spark") && (
          <ProfileForm
            step={step}
            email={email}
            onNext={toSpark}
            onBack={toProfile}
            onChangeEmail={toEmail}
            state={made}
            pending={making}
            onSubmit={make}
            onCard={(form) => setCard(readCard(form))}
          />
        )}

        <p className="mute small why">
          <b>
            <T
              zh="为什么是验证码，不是登录链接？"
              en="Why a code and not a sign-in link?"
            />
          </b>{" "}
          <T
            zh="很多同学在微信里打开网站，邮件里的链接会跳到另一个浏览器，登录状态对不上；6 位码在哪个浏览器都能输。"
            en="Many of us open the site inside WeChat, where an email link opens another browser and the sign-in gets lost. A code works in any browser."
          />
        </p>
      </div>
    </div>
  );
}

function MailHint({ email }: { email: string }) {
  const looksDone = /@[^@\s]+\.[^@\s]{2,}$/.test(email.trim());
  const domain = looksDone ? schoolDomain(email) : null;
  if (domain) {
    return (
      <div className="mail-hint school" aria-live="polite">
        <span className="ic">✓</span>
        <span>
          <b>
            {isUnsw(domain) ? "UNSW" : <T zh="学校邮箱" en="School email" />}
          </b>{" "}
          <T
            zh="：验证后就是认证成员，卡面有五色全息认证签。"
            en=": once verified you're a verified member, with a holographic seal on your card."
          />
        </span>
      </div>
    );
  }
  return (
    <div className="mail-hint" aria-live="polite">
      <span className="ic">i</span>
      <span>
        {looksDone ? (
          <T
            zh="其他邮箱也能加入。用学校邮箱加入的同学是认证成员。"
            en="Any email works. Members who join with a school email are verified."
          />
        ) : (
          <T
            zh="推荐用学校邮箱（如 z1234567@ad.unsw.edu.au），验证后是认证成员。没有也没关系，任何邮箱都能加入。"
            en="A school email (like z1234567@ad.unsw.edu.au) makes you a verified member. Any email works too."
          />
        )}
      </span>
    </div>
  );
}

/**
 * UNSW students leave a zID. A z1234567@…unsw.edu.au sign-in brings its own,
 * another UNSW address types one, and anyone else ticks "I'm a UNSW student"
 * first. Everyone else never sees it.
 */
function ZidField({
  email,
  error,
  onChangeEmail,
}: {
  email: string;
  error?: string;
  onChangeEmail: () => void;
}) {
  const [student, setStudent] = useState(false);
  const fromEmail = zidFromEmail(email);
  const unswEmail = isUnsw(schoolDomain(email));
  if (fromEmail) {
    return (
      <div className="mail-hint school">
        <span className="ic">✓</span>
        <span>
          <b>zID {fromEmail}</b>
          <T
            zh="：从 UNSW 邮箱自动带出，不用再填。"
            en=": taken from your UNSW email, nothing to fill in."
          />
        </span>
      </div>
    );
  }
  return (
    <div className="zid-part">
      {!unswEmail && (
        <label className="consent">
          <input
            type="checkbox"
            name="unswStudent"
            checked={student}
            onChange={(e) => setStudent(e.target.checked)}
          />
          <span>
            <T zh="我是 UNSW 在读学生" en="I'm a current UNSW student" />
          </span>
        </label>
      )}
      {(unswEmail || student) && (
        <>
          <TextField
            name="zid"
            label={<span style={{ textTransform: "none" }}>zID</span>}
            placeholder="z1234567"
            error={error}
            max={8}
          />
          <p className="mute small">
            {unswEmail && (
              <T
                zh="这个 UNSW 邮箱里看不出 zID，填一下就好。"
                en="We can't tell your zID from this UNSW email, so add it here."
              />
            )}{" "}
            <T
              zh="zID 只用来确认你是 UNSW 学生，只给社团后台看，不公开。"
              en="We only use your zID to confirm you're at UNSW. Only club admins see it; it's never public."
            />
            {!unswEmail && (
              <>
                {" "}
                <button
                  type="button"
                  className="linkish"
                  onClick={onChangeEmail}
                >
                  <T
                    zh="也可以退回去换成 UNSW 邮箱，zID 会自动带出。"
                    en="Or go back and use your UNSW email; your zID fills itself in."
                  />
                </button>
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

function ProfileForm({
  step,
  email,
  onNext,
  onBack,
  onChangeEmail,
  state,
  pending,
  onSubmit,
  onCard,
}: {
  step: "profile" | "spark";
  email: string;
  onNext: () => void;
  onBack: () => void;
  onChangeEmail: () => void;
  state: StepState;
  pending: boolean;
  onSubmit: (data: FormData) => void;
  onCard: (form: HTMLFormElement) => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const [skillCount, setSkillCount] = useState(0);
  const [spark, setSpark] = useState<Spark>("lumi");
  const [nickErr, setNickErr] = useState<string | undefined>();
  const [zidErr, setZidErr] = useState<string | undefined>();

  // A server-side error on a step-3 field sends the member back to it.
  const backToProfile =
    state.status === "error" &&
    Boolean(
      err.nickname || err.schoolDegree || err.major || err.skills || err.zid,
    );
  useEffect(() => {
    if (backToProfile) onBack();
  }, [state, backToProfile, onBack]);

  const changed = (form: HTMLFormElement) => {
    setSkillCount(capChecks(form, "skills", MAX_SKILLS));
    capChecks(form, "lookingFor", MAX_LOOKING);
    setSpark((new FormData(form).get("spark") as Spark) || "lumi");
    onCard(form);
  };

  return (
    <form
      ref={ref}
      className="form hud"
      noValidate
      onChange={(e) => changed(e.currentTarget)}
      onSubmit={submitWithoutReset((data) => {
        data.set("channel", channelFromSearch(window.location.search) ?? "");
        data.set("next", nextFromSearch(window.location.search) ?? "");
        onSubmit(data);
      })}
    >
      <Hud />
      <div hidden={step !== "profile"} className="form-part">
        <div className="row2">
          <TextField
            name="nickname"
            label={<T zh="昵称" en="Nickname" />}
            error={nickErr ?? err.nickname}
            max={20}
          />
          <TextField
            name="schoolDegree"
            label={<T zh="学校与学位" en="University & degree" />}
            placeholder="UNSW · Master of IT"
            error={err.schoolDegree}
            max={80}
            optional
          />
        </div>
        <TextField
          name="major"
          label={<T zh="专业" en="Major" />}
          placeholder="Information Technology"
          error={err.major}
          max={80}
          optional
        />
        <ZidField
          email={email}
          error={zidErr ?? err.zid}
          onChangeEmail={onChangeEmail}
        />
        <fieldset
          className="field"
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <legend className="mono mute field-row" style={{ marginBottom: 8 }}>
            <T
              zh={`技能（最多 ${MAX_SKILLS} 个）`}
              en={`Skills (up to ${MAX_SKILLS})`}
            />
            <span className="count">
              {skillCount} / {MAX_SKILLS}
            </span>
          </legend>
          <div className="skill-groups">
            {MEMBER_SKILL_GROUPS.map((g) => (
              <div key={g.label.en} className="skill-group">
                <span className="mute">
                  <T {...g.label} />
                </span>
                <div className="filters">
                  {g.skills.map((s) => (
                    <label key={s} className="chip">
                      <input type="checkbox" name="skills" value={s} />
                      <T {...MEMBER_SKILL_LABEL[s]} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <FieldError name="skills" error={err.skills} />
        </fieldset>
        <button
          type="button"
          className="btn solid primary"
          style={{ alignSelf: "start" }}
          onClick={() => {
            const data = new FormData(ref.current!);
            const nick = String(data.get("nickname") ?? "").trim();
            setNickErr(
              nick
                ? undefined
                : "填个昵称，卡片上会印它|Add a nickname, it goes on your card",
            );
            // The zID box is only there when this member needs one.
            const zid = data.get("zid");
            const zidCheck =
              zid === null ? null : zidSchema.safeParse(String(zid));
            setZidErr(
              !zidCheck || zidCheck.success
                ? undefined
                : String(zid).trim()
                  ? zidCheck.error.issues[0].message
                  : ZID_NEEDED,
            );
            if (nick && (!zidCheck || zidCheck.success)) onNext();
          }}
        >
          <T zh="下一步：选你的拼块" en="Next: pick your piece" /> <Arr />
        </button>
      </div>

      <div hidden={step !== "spark"} className="form-part">
        <fieldset
          className="field"
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <legend className="mono mute" style={{ marginBottom: 10 }}>
            <T zh="你是哪一块拼图？" en="Which piece are you?" />
          </legend>
          <div className="sparks">
            {SPARKS.map((s) => (
              <label
                key={s}
                className="spark"
                style={{ "--c": SPARK_INFO[s].color } as React.CSSProperties}
              >
                <input
                  type="radio"
                  name="spark"
                  value={s}
                  defaultChecked={s === "lumi"}
                />
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG art */}
                <img src={`/mascots/${s}.svg`} alt="" />
                <b>{SPARK_INFO[s].name}</b>
                <small>
                  <T {...SPARK_INFO[s].role} />
                </small>
              </label>
            ))}
          </div>
          <FieldError name="spark" error={err.spark} />
        </fieldset>
        <p
          className="spark-say"
          style={{ "--c": SPARK_INFO[spark].color } as React.CSSProperties}
        >
          <b>
            {SPARK_INFO[spark].name} · {SPARK_INFO[spark].zh} ·{" "}
            <T {...SPARK_INFO[spark].role} />
          </b>{" "}
          “{SPARK_INFO[spark].say}” <T {...SPARK_INFO[spark].blurb} />
        </p>
        <TextField
          name="building"
          label={
            <T
              zh="正在做 / 想做（选填）"
              en="Building, or want to build (optional)"
            />
          }
          placeholder="帮留学生找合租室友的小工具 / A flatmate finder"
          error={err.building}
          max={40}
          optional
        />
        <fieldset
          className="field"
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <legend className="mono mute" style={{ marginBottom: 8 }}>
            <T
              zh={`在找（选填，最多 ${MAX_LOOKING} 个）`}
              en={`Looking for (optional, up to ${MAX_LOOKING})`}
            />
          </legend>
          <div className="filters">
            {LOOKING_FOR.map((k) => (
              <label key={k} className="chip">
                <input type="checkbox" name="lookingFor" value={k} />
                <T {...LOOKING_LABEL[k]} />
              </label>
            ))}
          </div>
          <FieldError name="lookingFor" error={err.lookingFor} />
        </fieldset>
        {state.status === "error" && (
          <p className="form-status err" role="alert">
            <Msg s={state.message} />
          </p>
        )}
        <div className="row-actions">
          <button
            type="submit"
            className="btn solid primary"
            disabled={pending}
          >
            {pending ? (
              <T zh="生成中…" en="Making your card…" />
            ) : (
              <T zh="生成我的卡片" en="Make my card" />
            )}{" "}
            <Arr />
          </button>
          <button type="button" className="btn ghost" onClick={onBack}>
            <T zh="上一步" en="Back" />
          </button>
        </div>
      </div>
    </form>
  );
}
