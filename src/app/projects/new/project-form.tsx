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
import { ProjectCard } from "@/components/project-card";
import { SpamGuard } from "@/components/spam-guard";
import { useRevealResult } from "@/components/use-reveal-result";
import { Msg, T } from "@/components/t";
import type { FormState } from "@/lib/forms";
import { COVER_BUCKET, posterPath } from "@/lib/media";
import { ROLES, ROLE_LABEL, type Project, type Role } from "@/lib/types";
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

type Draft = Pick<Project, "name" | "problem" | "targetUser" | "ownerName"> & {
  neededRoles: Role[];
};

function readDraft(form: HTMLFormElement): Draft {
  const d = new FormData(form);
  const s = (k: string) => String(d.get(k) ?? "").trim();
  return {
    name: s("name"),
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
): Project {
  return {
    slug: "draft",
    name: draft?.name || "你的项目名 · Your project",
    problem:
      draft?.problem ||
      "一句话说清楚：谁，遇到了什么麻烦。· Who has the problem, and what is it?",
    targetUser: draft?.targetUser || "—",
    status: "recruiting",
    neededRoles: draft?.neededRoles ?? [],
    nextStep: null,
    contact: "",
    ownerName: draft?.ownerName || "你 · You",
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

export function ProjectForm() {
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
          <ProjectCard project={previewProject(draft, cover, video)} preview />
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
          onDraft={setDraft}
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
  onDraft,
  cover,
  setCover,
  video,
  setVideo,
}: {
  state: FormState;
  action: (data: FormData) => void;
  pending: boolean;
  onDraft: (d: Draft) => void;
  cover: CoverUpload | null;
  setCover: (fn: (u: CoverUpload | null) => CoverUpload | null) => void;
  video: VideoUpload | null;
  setVideo: (fn: (u: VideoUpload | null) => VideoUpload | null) => void;
}) {
  const err = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const uploading = [cover, video].some((u) => u?.status === "uploading");
  const [posting, setPosting] = useState(false);
  const postersSent = useRef(new Set<string>());

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
      <div className="row2">
        {FIELDS.map((f) => (
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
        ))}
      </div>

      <label className="field">
        <span className="mono">
          <T zh="要解决的问题" en="The problem" />
        </span>
        <textarea
          name="problem"
          maxLength={280}
          required
          placeholder="找室友靠小红书刷帖，信息过期 / Flatmate posts go stale and can't be filtered by commute"
          aria-invalid={Boolean(err.problem)}
        />
        {err.problem && (
          <span className="err">
            <Msg s={err.problem} />
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
        <input type="text" name="nextStep" maxLength={280} />
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

      {state.status === "error" && (
        <p className="form-status err" role="alert">
          <Msg s={state.message} />
        </p>
      )}
      <button
        type="submit"
        className="btn solid"
        disabled={pending || posting || uploading}
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
