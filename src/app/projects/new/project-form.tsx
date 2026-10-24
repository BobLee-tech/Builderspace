"use client";

import { Arr } from "@/components/fx/arr";
import { useCelebration } from "@/components/fx/celebrate";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { MemberCard } from "@/app/join/member-card";
import { ProjectCard } from "@/components/project-card";
import { SpamGuard } from "@/components/spam-guard";
import { useRevealResult } from "@/components/use-reveal-result";
import { Msg, T } from "@/components/t";
import type { FormState } from "@/lib/forms";
import { COVER_BUCKET, posterPath } from "@/lib/media";
import { memberCode } from "@/lib/members";
import { displayLength, PITCH_MAX } from "@/lib/text-length";
import {
  ROLES,
  ROLE_LABEL,
  type OwnerCard,
  type Project,
  type Role,
} from "@/lib/types";
import { uploadFile } from "@/lib/upload";
import { submitProject } from "./actions";
import {
  CoverField,
  VideoField,
  type CoverUpload,
  type VideoUpload,
} from "./media-drop";

const FIELDS = [
  { name: "name", zh: "项目名", en: "Project name", max: 60 },
  {
    name: "targetUser",
    zh: "目标用户",
    en: "Who is it for?",
    max: 80,
    hint: "悉尼留学生 / International students in Sydney",
  },
  { name: "ownerName", zh: "发起人昵称", en: "Your nickname", max: 40 },
  {
    name: "contact",
    zh: "公开联系方式",
    en: "Public contact",
    max: 120,
    hint: "WeChat ID / email — shown on the card",
  },
] as const;

/** A signed-in member submitting: their card, and whether projects show it. */
export type Submitter = { owner: OwnerCard; showsCard: boolean };

type Draft = Pick<Project, "name" | "targetUser" | "ownerName"> & {
  pitch: string;
  problem: string;
  neededRoles: Role[];
};

function readDraft(form: HTMLFormElement): Draft {
  const d = new FormData(form);
  const s = (k: string) => String(d.get(k) ?? "").trim();
  return {
    name: s("name"),
    pitch: s("pitch"),
    problem: s("problem"),
    targetUser: s("targetUser"),
    ownerName: s("ownerName"),
    neededRoles: d.getAll("neededRoles").map(String) as Role[],
  };
}

/** The plaza card as it will look, built from the form and local uploads. */
function previewProject(
  draft: Draft | null,
  cover: CoverUpload | null,
  video: VideoUpload | null,
  submitter: Submitter | null,
): Project {
  return {
    slug: "draft",
    name: draft?.name || "你的项目名 · Your project",
    pitch:
      draft?.pitch ||
      "一句话说清楚：做的是什么，帮谁解决什么。· What it is, and who it helps.",
    problem: draft?.problem || null,
    owner: submitter?.showsCard ? submitter.owner : null,
    targetUser: draft?.targetUser || "—",
    status: "recruiting",
    neededRoles: draft?.neededRoles ?? [],
    nextStep: null,
    contact: "",
    ownerName: submitter?.owner.card.nickname || draft?.ownerName || "你 · You",
    repoUrl: null,
    demoUrl: null,
    // The preview card says "just now" instead of a date.
    updatedAt: "",
    media: {
      coverUrl: cover?.url ?? null,
      coverFocus: cover?.focus ?? [50, 50],
      videoUrl: video?.url ?? null,
      videoPosterUrl: video?.frameUrls[video.pick] ?? null,
      videoSeconds: video?.seconds ?? null,
    },
    commentCount: 0,
  };
}

export function ProjectForm({ submitter }: { submitter: Submitter | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitProject,
    { status: "idle" },
  );
  const reveal = useRevealResult(state);
  const done = state.status === "ok";
  // The confetti comes from the live card as its stamp lands.
  const celebrate = useCelebration("project", done, () =>
    document.querySelector(".pv-col .pcard"),
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [cover, setCover] = useState<CoverUpload | null>(null);
  const [video, setVideo] = useState<VideoUpload | null>(null);

  return (
    <div ref={reveal} className="ship2">
      <div className={done ? "pv-col shipped" : "pv-col"}>
        <div className="pv-cap">
          <span className="mono mute">
            <T
              zh="实时预览 · 广场里就长这样"
              en="Live preview · as it shows in the plaza"
            />
          </span>
          <span className="mono mute">
            {done ? (
              <T zh="已提交" en="Submitted" />
            ) : (
              <T zh="草稿" en="Draft" />
            )}
          </span>
        </div>
        <div className="pv-card">
          <ProjectCard
            project={previewProject(draft, cover, video, submitter)}
            preview
          />
          <span className="pv-stamp" aria-hidden>
            SHIPPED · 待审核
          </span>
          <i className="pv-scan" aria-hidden />
        </div>
      </div>
      {done ? (
        <div ref={celebrate} className="form" role="status">
          <div className="ship-head" aria-hidden>
            <svg
              data-celebrate="check"
              className="ship-check"
              viewBox="0 0 64 64"
              fill="none"
            >
              <circle cx="32" cy="32" r="30" />
              <path d="M20 33 l8 8 l16 -18" />
            </svg>
          </div>
          <p className="mono mute">
            <T zh="已提交" en="Submitted" />
          </p>
          <h2 className="h2" style={{ fontSize: 32 }}>
            <T
              zh="收到，审核后公开。"
              en="Got it — it goes live after review."
            />
          </h2>
          <p className="mute">
            <T
              zh="运营会在 48 小时内看完，封面和视频跟项目一起审核。之后每两周更新一次进展，项目就会一直在广场上。"
              en="We review within 48 hours, cover and video included. Post an update every two weeks and your project stays in the plaza."
            />
          </p>
          <Link
            href="/projects"
            className="btn ghost"
            style={{ alignSelf: "start" }}
          >
            <T zh="回项目广场" en="Back to projects" /> <Arr />
          </Link>
        </div>
      ) : (
        <Form
          state={state}
          action={action}
          pending={pending}
          draft={draft}
          onDraft={setDraft}
          submitter={submitter}
          cover={cover}
          setCover={setCover}
          video={video}
          setVideo={setVideo}
        />
      )}
    </div>
  );
}

function Form({
  state,
  action,
  pending,
  draft,
  onDraft,
  submitter,
  cover,
  setCover,
  video,
  setVideo,
}: {
  state: FormState;
  action: (data: FormData) => void;
  pending: boolean;
  draft: Draft | null;
  onDraft: (d: Draft) => void;
  submitter: Submitter | null;
  cover: CoverUpload | null;
  setCover: (fn: (u: CoverUpload | null) => CoverUpload | null) => void;
  video: VideoUpload | null;
  setVideo: (fn: (u: VideoUpload | null) => VideoUpload | null) => void;
}) {
  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const uploading = [cover, video].some((u) => u?.status === "uploading");
  const [posting, setPosting] = useState(false);
  const postersSent = useRef(new Set<string>());
  const pitchRef = useRef<HTMLInputElement>(null);
  const aboutRef = useRef<HTMLTextAreaElement>(null);
  const pitchLength = displayLength(draft?.pitch ?? "");
  const pitchOver = pitchLength > PITCH_MAX;

  // A paragraph pasted into the one-liner: keep it as the details instead.
  const moveToAbout = () => {
    const pitch = pitchRef.current;
    const about = aboutRef.current;
    if (!pitch || !about) return;
    about.value = about.value ? `${pitch.value}\n${about.value}` : pitch.value;
    pitch.value = "";
    if (pitch.form) onDraft(readDraft(pitch.form));
    pitch.focus();
  };

  // Fields keep their values on a validation error (no form reset); the
  // picked poster frame is uploaded only now, since it can still change.
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (video?.status === "done" && video.frames[video.pick]) {
      const path = posterPath(video.folder, video.pick);
      if (!postersSent.current.has(path)) {
        setPosting(true);
        await uploadFile({
          bucket: COVER_BUCKET,
          path,
          file: video.frames[video.pick],
          onProgress: () => {},
        })
          .done.then(() => postersSent.current.add(path))
          // The video still plays without a poster frame.
          .catch((e: unknown) => console.error("[upload] poster failed", e))
          .finally(() => setPosting(false));
      }
      if (postersSent.current.has(path)) data.set("videoPosterPath", path);
    }
    startTransition(() => action(data));
  };

  return (
    <form
      onSubmit={(e) => void submit(e)}
      onInput={(e) => onDraft(readDraft(e.currentTarget))}
      className="form"
      noValidate
    >
      <SpamGuard />
      {submitter && (
        <input
          type="hidden"
          name="ownerName"
          value={submitter.owner.card.nickname}
        />
      )}
      <div className="row2">
        {FIELDS.filter((f) => !(submitter && f.name === "ownerName")).map(
          (f) => (
            <label key={f.name} className="field">
              <span className="mono">
                <T zh={f.zh} en={f.en} />
              </span>
              <input
                type="text"
                name={f.name}
                maxLength={f.max}
                placeholder={"hint" in f ? f.hint : undefined}
                aria-invalid={Boolean(err[f.name])}
                required
              />
              {err[f.name] && (
                <span className="err">
                  <Msg s={err[f.name]} />
                </span>
              )}
            </label>
          ),
        )}
      </div>

      <div className="field">
        <label className="mono field-k" htmlFor="pitch">
          <T zh="一句话介绍" en="One-line pitch" />
          <span className={pitchOver ? "count over" : "count"}>
            {pitchLength} / {PITCH_MAX}
          </span>
        </label>
        <input
          id="pitch"
          ref={pitchRef}
          type="text"
          name="pitch"
          required
          placeholder="按通勤和预算筛合租帖，过期的自动下架 / Flatmate posts you can filter by commute"
          aria-invalid={pitchOver || Boolean(err.pitch)}
          aria-describedby="pitch-hint"
        />
        {pitchOver ? (
          <span className="err" id="pitch-hint">
            <T
              zh={`超出 ${pitchLength - PITCH_MAX} 个字。项目卡上只放一句话，细节写进下面的详细介绍。`}
              en={`${pitchLength - PITCH_MAX} over. The card holds one line; the rest goes in the details below.`}
            />{" "}
            <button type="button" className="linkish" onClick={moveToAbout}>
              <T zh="整段移到详细介绍" en="Move it all to the details" />
            </button>
          </span>
        ) : err.pitch ? (
          <span className="err" id="pitch-hint">
            <Msg s={err.pitch} />
          </span>
        ) : (
          <span className="mute small" id="pitch-hint">
            <T
              zh="做的是什么、帮谁解决什么。项目卡上只显示这一句；中文一个字算 1，英文字母算半个。"
              en="What it is and who it helps. It's the only line on the card; letters count half a Chinese character."
            />
          </span>
        )}
      </div>

      <label className="field">
        <span className="mono field-k">
          <T zh="详细介绍（可选）" en="Details (optional)" />
          <span className="count">{(draft?.problem ?? "").length} / 600</span>
        </span>
        <textarea
          ref={aboutRef}
          name="problem"
          maxLength={600}
          rows={5}
          placeholder="背景、现在做到哪一步、用了什么技术 / Background, where it stands, what it's built with"
          aria-invalid={Boolean(err.problem)}
        />
        {err.problem ? (
          <span className="err">
            <Msg s={err.problem} />
          </span>
        ) : (
          <span className="mute small">
            <T
              zh="只在项目详情页的「项目介绍」里显示。"
              en="Shown only in About on the project page."
            />
          </span>
        )}
      </label>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="mono mute" style={{ marginBottom: 8 }}>
          <T zh="缺的角色" en="Roles you need" />
        </legend>
        <div className="filters">
          {ROLES.map((r) => (
            <label key={r} className="chip">
              <input type="checkbox" name="neededRoles" value={r} />
              <T {...ROLE_LABEL[r]} />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="mono">
          <T zh="下一步" en="Next step" />
        </span>
        <input
          type="text"
          name="nextStep"
          maxLength={280}
          placeholder="找 5 位同学试用、找一位设计伙伴 / Find 5 testers, find a designer"
        />
      </label>

      <CoverField value={cover} onChange={setCover} />
      <VideoField value={video} onChange={setVideo} />
      {err.media && (
        <p className="form-status err">
          <Msg s={err.media} />
        </p>
      )}
      <input
        type="hidden"
        name="coverPath"
        value={cover?.status === "done" ? cover.path : ""}
      />
      <input type="hidden" name="coverFocusX" value={cover?.focus[0] ?? 50} />
      <input type="hidden" name="coverFocusY" value={cover?.focus[1] ?? 50} />
      <input
        type="hidden"
        name="videoPath"
        value={video?.status === "done" ? video.path : ""}
      />
      <input
        type="hidden"
        name="videoSeconds"
        value={video?.status === "done" ? video.seconds : ""}
      />

      <div className="row2">
        <label className="field">
          <span className="mono">
            <T zh="仓库链接（可选）" en="Repo link (optional)" />
          </span>
          <input
            type="text"
            inputMode="url"
            name="repoUrl"
            placeholder="github.com/…"
          />
          {err.repoUrl && (
            <span className="err">
              <Msg s={err.repoUrl} />
            </span>
          )}
        </label>
        <label className="field">
          <span className="mono">
            <T zh="Demo 链接（可选）" en="Demo link (optional)" />
          </span>
          <input
            type="text"
            inputMode="url"
            name="demoUrl"
            placeholder="yourapp.vercel.app"
          />
          {err.demoUrl && (
            <span className="err">
              <Msg s={err.demoUrl} />
            </span>
          )}
        </label>
      </div>

      {submitter ? (
        <div className="owner-line">
          <span className="owner-mini" aria-hidden>
            <MemberCard
              card={submitter.owner.card}
              design={submitter.owner.design}
              flipped={false}
              still
              className="mini"
            />
          </span>
          <p className="mute small">
            <b>{submitter.owner.card.nickname}</b>
            {submitter.owner.card.memberNo &&
              ` · ${memberCode(submitter.owner.card.memberNo)}`}{" "}
            {submitter.showsCard ? (
              <T
                zh="发起人是你，项目会挂上你的成员卡。在「我的卡片」里可以关掉。"
                en="You're the owner; the project shows your member card. You can turn that off on My card."
              />
            ) : (
              <T
                zh="发起人是你。你关掉了作者卡，项目上只显示昵称。"
                en="You're the owner. Your card is turned off, so the project shows your nickname only."
              />
            )}
          </p>
        </div>
      ) : (
        <p className="mute small">
          <T
            zh="加入后再提交，项目会挂上你的成员卡。"
            en="Join first and the project carries your member card."
          />{" "}
          <Link href="/join" className="linkish">
            <T zh="加入（约 1 分钟）" en="Join (about a minute)" />
          </Link>
        </p>
      )}

      {state.status === "error" && (
        <p className="form-status err" role="alert">
          <Msg s={state.message} />
        </p>
      )}
      <button
        type="submit"
        className="btn solid primary"
        disabled={pending || posting || uploading || pitchOver}
        style={{ alignSelf: "start" }}
      >
        {uploading ? (
          <T zh="等上传完成…" en="Waiting for uploads…" />
        ) : pending || posting ? (
          <T zh="提交中…" en="Sending…" />
        ) : (
          <T zh="提交项目卡" en="Submit project" />
        )}{" "}
        <Arr />
      </button>
    </form>
  );
}
