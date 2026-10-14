"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Scrub } from "@/components/project-media";
import { Msg, T } from "@/components/t";
import {
  checkCover,
  checkVideo,
  COVER_BUCKET,
  COVER_TYPES,
  formatBytes,
  formatDuration,
  mediaPath,
  POSTER_FRAMES,
  VIDEO_BUCKET,
  VIDEO_TYPES,
} from "@/lib/media";
import { uploadFile } from "@/lib/upload";

type Upload = {
  file: File;
  /** Object URL for previews in this tab. */
  url: string;
  folder: string;
  path: string;
  progress: number;
  status: "uploading" | "done" | "error";
  cancel: () => void;
};

export type CoverUpload = Upload & { focus: [number, number] };
export type VideoUpload = Upload & {
  seconds: number;
  height: number;
  /** JPEG frames spread over the video; one becomes the poster. */
  frames: Blob[];
  frameUrls: string[];
  pick: number;
};

/**
 * Starts uploading `file` and reports progress through `update`. The returned
 * upload starts in the "uploading" state.
 */
function begin<U extends Upload>(
  file: File,
  bucket: string,
  kind: "cover" | "video",
  extra: Omit<U, keyof Upload>,
  update: (fn: (u: U | null) => U | null) => void,
): U {
  const folder = crypto.randomUUID();
  const path = mediaPath(folder, kind, file.type);
  const same = (u: U | null) => u?.path === path;
  const handle = uploadFile({
    bucket,
    path,
    file,
    onProgress: (f) => update((u) => (same(u) ? { ...u!, progress: f } : u)),
  });
  handle.done.then(
    () => update((u) => (same(u) ? { ...u!, status: "done", progress: 1 } : u)),
    (e: unknown) => {
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.error(`[upload] ${kind} failed`, e);
      update((u) => (same(u) ? { ...u!, status: "error" } : u));
    },
  );
  return {
    file,
    url: URL.createObjectURL(file),
    folder,
    path,
    progress: 0,
    status: "uploading",
    cancel: handle.cancel,
    ...extra,
  } as U;
}

function discard(u: Upload | null) {
  if (!u) return;
  u.cancel();
  URL.revokeObjectURL(u.url);
  if ("frameUrls" in u)
    (u as VideoUpload).frameUrls.forEach(URL.revokeObjectURL);
}

export function CoverField({
  value,
  onChange,
}: {
  value: CoverUpload | null;
  onChange: (fn: (u: CoverUpload | null) => CoverUpload | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  const pick = (file: File) => {
    const problem = checkCover(file);
    setError(problem);
    if (problem) return;
    discard(value);
    onChange(() =>
      begin<CoverUpload>(
        file,
        COVER_BUCKET,
        "cover",
        { focus: [50, 50] },
        onChange,
      ),
    );
  };

  // Drag the picture to choose what survives the 16:9 crop.
  const drag = useRef<{ x: number; y: number; f: [number, number] } | null>(
    null,
  );

  return (
    <Drop
      label={<T zh="封面（可选）" en="Cover (optional)" />}
      aside="16 : 9"
      accept={Object.keys(COVER_TYPES).join(",")}
      icon={
        <svg viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="1.8" />
          <path d="M21 16l-5-5-9 9" />
        </svg>
      }
      title={
        <T
          zh="拖入封面图，或点击选择"
          en="Drop a cover image, or click to pick"
        />
      }
      rules={["JPG / PNG / WebP", "≤ 5 MB", "1600×900"]}
      error={error}
      upload={value}
      onFile={pick}
      onRemove={() => {
        discard(value);
        onChange(() => null);
      }}
    >
      {value && (
        <div
          ref={frame}
          className="upz-frame pan"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, f: value.focus };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const r = e.currentTarget.getBoundingClientRect();
            const clamp = (v: number) =>
              Math.round(Math.min(100, Math.max(0, v)));
            const focus: [number, number] = [
              clamp(d.f[0] - ((e.clientX - d.x) / r.width) * 160),
              clamp(d.f[1] - ((e.clientY - d.y) / r.height) * 160),
            ];
            onChange((u) => (u ? { ...u, focus } : u));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img
            src={value.url}
            alt=""
            draggable={false}
            style={{ objectPosition: `${value.focus[0]}% ${value.focus[1]}%` }}
          />
          <i className="upz-thirds" aria-hidden />
          <span className="tag upz-hint">
            <T zh="拖动调整取景" en="Drag to reframe" />
          </span>
          <Progress upload={value} />
        </div>
      )}
    </Drop>
  );
}

export function VideoField({
  value,
  onChange,
}: {
  value: VideoUpload | null;
  onChange: (fn: (u: VideoUpload | null) => VideoUpload | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(true);

  const pick = async (file: File) => {
    let problem = checkVideo(file);
    if (problem) return setError(problem);
    setReading(true);
    const meta = await readVideo(file).catch(() => null);
    setReading(false);
    if (!meta)
      return setError(
        "读不出这个视频，换成 MP4（H.264）再试|Couldn't read this video — try exporting it as MP4 (H.264)",
      );
    problem = checkVideo(file, meta.seconds);
    setError(problem);
    if (problem) return;
    discard(value);
    onChange(() =>
      begin<VideoUpload>(
        file,
        VIDEO_BUCKET,
        "video",
        {
          seconds: meta.seconds,
          height: meta.height,
          frames: meta.frames,
          frameUrls: meta.frames.map((b) => URL.createObjectURL(b)),
          pick: Math.min(1, meta.frames.length - 1),
        },
        onChange,
      ),
    );
  };

  return (
    <Drop
      label={<T zh="演示视频（可选）" en="Demo video (optional)" />}
      aside={
        <T zh="悬停预览 · 点开全屏" en="Hover to preview · click to play" />
      }
      accept={Object.keys(VIDEO_TYPES).join(",")}
      icon={
        <svg viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M10.5 9.5v5l4-2.5z" />
        </svg>
      }
      title={
        reading ? (
          <T zh="正在读取视频…" en="Reading the video…" />
        ) : (
          <T
            zh="拖入录屏或演示视频，或点击选择"
            en="Drop a screen recording or demo, or click to pick"
          />
        )
      }
      rules={[
        "MP4 / WebM / MOV",
        "≤ 50 MB",
        <T key="len" zh="≤ 3 分钟" en="≤ 3 min" />,
      ]}
      error={error}
      upload={value}
      onFile={(f) => void pick(f)}
      onRemove={() => {
        discard(value);
        onChange(() => null);
      }}
    >
      {value && (
        <>
          <div className="upz-frame">
            <video
              ref={player}
              src={`${value.url}#t=0.1`}
              playsInline
              muted
              loop
              preload="metadata"
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
            />
            <div className="upz-vctl">
              <button
                type="button"
                onClick={() => {
                  const v = player.current!;
                  if (v.paused) void v.play();
                  else v.pause();
                }}
                aria-label={paused ? "播放 / Play" : "暂停 / Pause"}
              >
                <svg viewBox="0 0 10 10" aria-hidden>
                  <path
                    d={paused ? "M2 1l7 4-7 4z" : "M2 1h2v8H2zM6 1h2v8H6z"}
                  />
                </svg>
              </button>
              <Scrub video={player} />
              <span className="tag">
                {formatDuration(value.seconds)}
                {value.height ? ` · ${value.height}p` : ""}
              </span>
            </div>
            <Progress upload={value} />
          </div>
          {value.frameUrls.length > 0 && (
            <div className="upz-strip">
              <div className="upz-strip-h">
                <span className="mono mute">
                  <T zh="选一帧做视频封面" en="Pick a poster frame" />
                </span>
                <span className="mono mute">
                  {formatDuration(frameTime(value.seconds, value.pick))}
                </span>
              </div>
              <div className="upz-thumbs">
                {value.frameUrls.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    aria-pressed={value.pick === i}
                    aria-label={`用 ${formatDuration(frameTime(value.seconds, i))} 这一帧 / Use this frame`}
                    onClick={() => onChange((u) => (u ? { ...u, pick: i } : u))}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Drop>
  );
}

/** Dropzone shell: empty state with drag & drop, or the filled state passed as children. */
function Drop({
  label,
  aside,
  accept,
  icon,
  title,
  rules,
  error,
  upload,
  onFile,
  onRemove,
  children,
}: {
  label: ReactNode;
  aside: ReactNode;
  accept: string;
  icon: ReactNode;
  title: ReactNode;
  rules: ReactNode[];
  error: string | null;
  upload: Upload | null;
  onFile: (f: File) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const shake = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error)
      shake.current?.animate(
        [
          { translate: "-6px 0" },
          { translate: "4px 0" },
          { translate: "-2px 0" },
          { translate: "0 0" },
        ],
        { duration: 360, easing: "ease-out" },
      );
  }, [error]);

  const cls = ["upz", over && "over", upload && "filled", error && "error"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <span className="upz-label">
        <span className="mono">{label}</span>
        <span className="mono mute">{aside}</span>
      </span>
      <div
        ref={shake}
        className={cls}
        onDragEnter={(e) => {
          e.preventDefault();
          if (depth.current++ === 0) setOver(true);
        }}
        onDragLeave={() => {
          if (--depth.current <= 0) {
            depth.current = 0;
            setOver(false);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
      >
        <input
          ref={input}
          type="file"
          accept={accept}
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onFile(f);
          }}
        />
        <i className="c tl" aria-hidden />
        <i className="c tr" aria-hidden />
        <i className="c bl" aria-hidden />
        <i className="c br" aria-hidden />
        {upload ? (
          <div className="upz-file">
            {children}
            <div className="upz-bar">
              <svg
                className={upload.status === "done" ? "upz-ok on" : "upz-ok"}
                viewBox="0 0 22 22"
                aria-hidden
              >
                <circle cx="11" cy="11" r="11" />
                <path d="M6.5 11.5l3 3 6-6.5" />
              </svg>
              <span className="upz-meta">
                <b>{upload.file.name}</b>
                <span>
                  {formatBytes(upload.file.size)} ·{" "}
                  {upload.status === "done" ? (
                    <T zh="已上传" en="Uploaded" />
                  ) : upload.status === "error" ? (
                    <span className="err">
                      <T
                        zh="上传失败，点替换重试"
                        en="Upload failed — replace to retry"
                      />
                    </span>
                  ) : (
                    <T
                      zh={`上传中 ${Math.round(upload.progress * 100)}%`}
                      en={`Uploading ${Math.round(upload.progress * 100)}%`}
                    />
                  )}
                </span>
              </span>
              <button
                type="button"
                className="upz-lnk"
                onClick={() => input.current?.click()}
              >
                <T zh="替换" en="Replace" />
              </button>
              <button type="button" className="upz-lnk" onClick={onRemove}>
                <T zh="移除" en="Remove" />
              </button>
              <i
                className="upz-line"
                style={{
                  transform: `scaleX(${upload.status === "uploading" ? upload.progress : 0})`,
                }}
                aria-hidden
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="upz-empty"
            onClick={() => input.current?.click()}
          >
            <span className="upz-ico" aria-hidden>
              {icon}
            </span>
            <span className="upz-t">{title}</span>
            <span className="upz-rules mono mute">
              {rules.map((r, i) => (
                <span key={i}>{r}</span>
              ))}
            </span>
            {error && (
              <span className="err" role="alert">
                <Msg s={error} />
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/** Ring + bytes over the preview until the upload lands. */
function Progress({ upload }: { upload: Upload }) {
  const done = upload.status === "done";
  return (
    <div className={done ? "upz-up gone" : "upz-up"} aria-hidden={done}>
      <div className="upz-ring">
        <svg viewBox="0 0 76 76">
          <circle className="bg" cx="38" cy="38" r="34" />
          <circle
            className="fg"
            cx="38"
            cy="38"
            r="34"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - upload.progress}
          />
        </svg>
        <b>{Math.round(upload.progress * 100)}%</b>
      </div>
      <span className="mono mute">
        {upload.status === "error" ? (
          <T zh="上传失败" en="Upload failed" />
        ) : (
          `${formatBytes(upload.file.size * upload.progress)} / ${formatBytes(upload.file.size)}`
        )}
      </span>
    </div>
  );
}

const frameTime = (seconds: number, i: number) =>
  (seconds * (i + 0.5)) / POSTER_FRAMES;

/** Length, height and evenly spaced JPEG frames of a local video file. */
async function readVideo(file: File) {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "auto";
  v.src = url;
  try {
    await new Promise<void>((ok, fail) => {
      v.onloadeddata = () => ok();
      v.onerror = () => fail(new Error("unreadable"));
    });
    const seconds = v.duration;
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("no length");
    const frames: Blob[] = [];
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const g = canvas.getContext("2d");
    for (let i = 0; g && v.videoWidth && i < POSTER_FRAMES; i++) {
      await new Promise<void>((ok) => {
        v.onseeked = () => ok();
        v.currentTime = frameTime(seconds, i);
      });
      const s = Math.max(
        canvas.width / v.videoWidth,
        canvas.height / v.videoHeight,
      );
      g.fillStyle = "#000";
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(
        v,
        (canvas.width - v.videoWidth * s) / 2,
        (canvas.height - v.videoHeight * s) / 2,
        v.videoWidth * s,
        v.videoHeight * s,
      );
      const blob = await new Promise<Blob | null>((ok) =>
        canvas.toBlob(ok, "image/jpeg", 0.82),
      );
      if (blob) frames.push(blob);
    }
    return { seconds, height: v.videoHeight, frames };
  } finally {
    v.removeAttribute("src");
    v.load();
    URL.revokeObjectURL(url);
  }
}
