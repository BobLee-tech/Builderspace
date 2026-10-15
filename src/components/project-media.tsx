"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hasFinePointer, prefersReducedMotion } from "@/components/fx/motion";
import { T } from "@/components/t";
import { formatDuration } from "@/lib/media";
import type { ProjectMedia } from "@/lib/types";

const PLAY = "M2 1l7 4-7 4z";
const PAUSE = "M2 1h2v8H2zM6 1h2v8H6z";

/**
 * Uploaded cover (mono until hovered) and, when there is a demo video, a muted
 * preview that plays while the card is hovered plus a button that opens the
 * full player. Sits inside `.cover`; the card's own link stays underneath.
 */
export function CoverMedia({
  media,
  title,
}: {
  media: ProjectMedia;
  title: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLElement>(null);
  // Where the player grows from, and where the hover preview had got to.
  const [open, setOpen] = useState<{
    from: HTMLElement | null;
    at: number;
  } | null>(null);
  const still = media.coverUrl ?? media.videoPosterUrl;
  const [fx, fy] = media.coverUrl ? media.coverFocus : [50, 50];

  useEffect(() => {
    const el = box.current;
    const v = video.current;
    const card = el?.closest<HTMLElement>(".pcard, .d-cover");
    if (!el || !v || !card || !media.videoUrl) return;
    let raf = 0;
    const enter = () => {
      if (!hasFinePointer() || prefersReducedMotion()) return;
      if (!v.src) v.src = media.videoUrl!;
      el.classList.add("loading");
      v.play()
        .then(() => el.classList.add("playing"))
        .catch(() => {})
        .finally(() => el.classList.remove("loading"));
      const loop = () => {
        if (bar.current && v.duration)
          bar.current.style.transform = `scaleX(${v.currentTime / v.duration})`;
        raf = requestAnimationFrame(loop);
      };
      cancelAnimationFrame(raf);
      loop();
    };
    const leave = () => {
      v.pause();
      el.classList.remove("playing", "loading");
      cancelAnimationFrame(raf);
    };
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [media.videoUrl]);

  if (!still && !media.videoUrl) return null;
  return (
    <div ref={box} className="cv-media">
      {still && (
        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL that changes per render
        <img
          src={still}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ objectPosition: `${fx}% ${fy}%` }}
        />
      )}
      {media.videoUrl && (
        <video
          ref={video}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          tabIndex={-1}
        />
      )}
      <i className="cv-dither" aria-hidden />
      {media.videoUrl && (
        <>
          <span className="cv-badge" aria-hidden>
            <svg viewBox="0 0 10 10">
              <path d={PLAY} />
            </svg>
            {media.videoSeconds ? formatDuration(media.videoSeconds) : "Demo"}
          </span>
          <button
            type="button"
            className="cv-play"
            aria-label={`播放 ${title} 的演示视频 / Play demo video`}
            onClick={() => {
              video.current?.pause();
              setOpen({
                from: box.current,
                at: video.current?.currentTime ?? 0,
              });
            }}
          >
            <svg viewBox="0 0 10 10" aria-hidden>
              <path d={PLAY} />
            </svg>
          </button>
          <i className="cv-bar" aria-hidden>
            <b ref={bar} />
          </i>
          {open &&
            createPortal(
              <VideoDialog
                src={media.videoUrl}
                poster={media.videoPosterUrl ?? media.coverUrl}
                title={title}
                from={open.from}
                startAt={open.at}
                onClosed={() => setOpen(null)}
              />,
              // Outside the card, so hovering the player doesn't tilt it.
              document.body,
            )}
        </>
      )}
    </div>
  );
}

/**
 * Full player in a modal <dialog>: grows out of the element it was opened
 * from and shrinks back into it. Space / ← → / Esc work while it is open.
 */
export function VideoDialog({
  src,
  poster,
  title,
  from,
  startAt = 0,
  onClosed,
}: {
  src: string;
  poster?: string | null;
  title: string;
  from: HTMLElement | null;
  startAt?: number;
  onClosed: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const closing = useRef(false);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef(0);

  /** Transform that puts the box exactly over `from`. */
  const fromVars = () => {
    const box = boxRef.current!;
    const a = from?.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (!a || !b.width) return null;
    return {
      x: a.left + a.width / 2 - (b.left + b.width / 2),
      y: a.top + a.height / 2 - (b.top + b.height / 2),
      scaleX: a.width / b.width,
      scaleY: a.height / b.height,
    };
  };

  useEffect(() => {
    const d = dialog.current!;
    const v = video.current!;
    d.showModal();
    v.currentTime = startAt;
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      void v.play().catch(() => {});
    });
    if (prefersReducedMotion()) return;
    let revert = () => {};
    let cancelled = false;
    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const start = fromVars();
      const ctx = gsap.context(() => {
        gsap.from(".vlb-bg", {
          opacity: 0,
          duration: 0.45,
          ease: "power2.out",
        });
        if (start)
          gsap.from(boxRef.current, {
            ...start,
            duration: 0.75,
            ease: "expo.out",
            clearProps: "transform",
          });
        gsap.from(".vlb-meta, .vlb-x", {
          opacity: 0,
          duration: 0.4,
          delay: 0.35,
        });
      }, d);
      revert = () => ctx.revert();
    });
    return () => {
      cancelled = true;
      revert();
    };
    // Opening runs once per mount; `from` and `startAt` are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const d = dialog.current!;
    video.current?.pause();
    const done = () => {
      d.close();
      onClosed();
    };
    if (prefersReducedMotion()) return done();
    void import("gsap").then(({ gsap }) => {
      const end = fromVars();
      const tl = gsap.timeline({ onComplete: done });
      tl.to(".vlb-meta, .vlb-x", { opacity: 0, duration: 0.15 }, 0);
      if (end)
        tl.to(
          boxRef.current,
          { ...end, duration: 0.55, ease: "expo.inOut" },
          0,
        );
      tl.to(boxRef.current, { opacity: 0, duration: 0.15 }, end ? 0.45 : 0).to(
        d.querySelector(".vlb-bg"),
        { opacity: 0, duration: 0.4 },
        0.1,
      );
    });
  };

  const toggle = () => {
    const v = video.current!;
    if (v.paused) void v.play();
    else v.pause();
  };
  const poke = () => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(
      () => setIdle(!video.current?.paused),
      2200,
    );
  };

  return (
    <dialog
      ref={dialog}
      className="vlb"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        const v = video.current!;
        if (e.key === " " && e.target === e.currentTarget) {
          e.preventDefault();
          toggle();
        }
        if (e.key === "ArrowRight") seekTo(v, v.currentTime + 5);
        if (e.key === "ArrowLeft") seekTo(v, v.currentTime - 5);
      }}
    >
      <div className="vlb-bg" onClick={close} aria-hidden />
      <div className="vlb-col">
        <div
          ref={boxRef}
          className={idle ? "vlb-box idle" : "vlb-box"}
          onPointerMove={poke}
        >
          <video
            ref={video}
            src={src}
            poster={poster ?? undefined}
            playsInline
            onClick={toggle}
            onPlay={() => {
              setPaused(false);
              poke();
            }}
            onPause={() => {
              setPaused(true);
              setIdle(false);
            }}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          />
          <button
            type="button"
            className="vlb-x"
            onClick={close}
            aria-label="关闭 / Close"
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="vlb-ctl">
            <button
              type="button"
              className="pp"
              onClick={toggle}
              aria-label={paused ? "播放 / Play" : "暂停 / Pause"}
            >
              <svg viewBox="0 0 10 10" aria-hidden>
                <path d={paused ? PLAY : PAUSE} />
              </svg>
            </button>
            <Scrub video={video} showTime />
            <button
              type="button"
              onClick={() => {
                video.current!.muted = !video.current!.muted;
              }}
              aria-label={muted ? "取消静音 / Unmute" : "静音 / Mute"}
            >
              <svg viewBox="0 0 24 24" className="line" aria-hidden>
                <path d="M4 9h4l5-4v14l-5-4H4z" />
                <path d="M17 9a4 4 0 010 6" opacity={muted ? 0.2 : 1} />
              </svg>
            </button>
            <button
              type="button"
              onClick={() =>
                document.fullscreenElement
                  ? void document.exitFullscreen()
                  : void boxRef.current?.requestFullscreen?.()
              }
              aria-label="全屏 / Fullscreen"
            >
              <svg viewBox="0 0 24 24" className="line" aria-hidden>
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            </button>
          </div>
        </div>
        <div className="vlb-meta">
          <b>{title}</b>
          <span className="mono mute">
            <T zh="演示视频 · Esc 关闭" en="Demo video · Esc to close" />
          </span>
        </div>
      </div>
    </dialog>
  );
}

/** Seek bar for a <video>: buffered + played, hover time, drag to scrub. */
export function Scrub({
  video,
  showTime = false,
}: {
  video: React.RefObject<HTMLVideoElement | null>;
  showTime?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const time = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const v = video.current;
    const el = root.current;
    if (!v || !el) return;
    const fill = el.querySelector<HTMLElement>(".fill")!;
    const buf = el.querySelector<HTMLElement>(".buf")!;
    const knob = el.querySelector<HTMLElement>(".knob")!;
    let raf = 0;
    const draw = () => {
      const d = v.duration || 0;
      const p = d ? v.currentTime / d : 0;
      fill.style.transform = `scaleX(${p})`;
      knob.style.left = `${p * 100}%`;
      el.setAttribute("aria-valuenow", String(Math.round(p * 100)));
      if (d && v.buffered.length)
        buf.style.transform = `scaleX(${v.buffered.end(v.buffered.length - 1) / d})`;
      if (time.current)
        time.current.textContent = `${formatDuration(v.currentTime)} / ${formatDuration(d)}`;
    };
    const loop = () => {
      draw();
      raf = v.paused ? 0 : requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) loop();
    };
    const events = [
      "play",
      "seeked",
      "progress",
      "loadedmetadata",
      "timeupdate",
    ];
    events.forEach((e) => v.addEventListener(e, kick));
    draw();
    return () => {
      cancelAnimationFrame(raf);
      events.forEach((e) => v.removeEventListener(e, kick));
    };
  }, [video]);

  const at = (e: React.PointerEvent) => {
    const r = root.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  const seek = (p: number) => {
    const v = video.current;
    if (v?.duration) seekTo(v, p * v.duration);
  };

  return (
    <>
      <div
        ref={root}
        className="scrub"
        role="slider"
        tabIndex={0}
        aria-label="进度 / Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.classList.add("drag");
          seek(at(e));
        }}
        onPointerMove={(e) => {
          const p = at(e);
          const tip = e.currentTarget.querySelector<HTMLElement>(".tip")!;
          tip.style.left = `${p * 100}%`;
          tip.textContent = formatDuration(p * (video.current?.duration || 0));
          if (e.currentTarget.classList.contains("drag")) seek(p);
        }}
        onPointerUp={(e) => e.currentTarget.classList.remove("drag")}
        onKeyDown={(e) => {
          const v = video.current;
          if (!v) return;
          if (e.key === "ArrowRight") seekTo(v, v.currentTime + 5);
          if (e.key === "ArrowLeft") seekTo(v, v.currentTime - 5);
          e.stopPropagation();
        }}
      >
        <span className="rail">
          <i className="buf" />
          <i className="fill" />
        </span>
        <i className="knob" />
        <span className="tip">0:00</span>
      </div>
      {showTime && <span ref={time} className="t mono" />}
    </>
  );
}

function seekTo(v: HTMLVideoElement, seconds: number) {
  v.currentTime = Math.max(0, Math.min(v.duration || 0, seconds));
}
