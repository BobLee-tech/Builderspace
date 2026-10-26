"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react";
import { T } from "@/components/t";
import { SPARKS } from "@/lib/members";
import type { EventMaterials } from "@/lib/event-materials";

type Lang = "zh" | "en";

// The poster is drawn at phone size (9:16) in the site's colours.
const W = 1080;
const H = 1920;
const PAD = 88;
const C = {
  ink: "#050505",
  panel: "#0c0c0d",
  line: "#232325",
  line2: "#3a3a3d",
  mute: "#8a8a90",
  soft: "#c9c9c5",
  paper: "#f4f4f2",
  live: "#6fd36a",
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** The mascots only carry a viewBox; give them a size so every browser draws them. */
async function loadMascot(spark: string) {
  const svg = await fetch(`/mascots/${spark}.svg`).then((r) => r.text());
  const sized = svg.replace("<svg ", '<svg width="240" height="232" ');
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Lines that fit `max`: Chinese breaks anywhere, English at spaces. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    const next = line + ch;
    // Closing punctuation never starts a line.
    if (
      ctx.measureText(next).width <= max ||
      !line ||
      /[，。、？！」）]/.test(ch)
    ) {
      line = next;
      continue;
    }
    const space = line.lastIndexOf(" ");
    if (/[A-Za-z]/.test(ch) && space > 0) {
      lines.push(line.slice(0, space));
      line = line.slice(space + 1) + ch;
    } else {
      lines.push(line);
      line = ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function drawPoster(
  canvas: HTMLCanvasElement,
  lang: Lang,
  user: string,
  slug: string,
  poster: EventMaterials["poster"],
) {
  const css = getComputedStyle(document.body);
  const body = css.fontFamily;
  const display = css.getPropertyValue("--f-display") || body;
  const mono = css.getPropertyValue("--f-mono") || "monospace";
  await Promise.all([
    document.fonts.load(
      `900 100px ${body}`,
      "做一个自己的个人网站 Put yourself online",
    ),
    document.fonts.load(`700 40px ${display}`, "12345"),
    document.fonts.load(`400 40px ${mono}`, "github.io"),
  ]);
  const [logo, ...mascots] = await Promise.all([
    loadImage("/mark-240.png"),
    ...SPARKS.map(loadMascot),
  ]);

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Ground: panel, a soft light top right, the site's halftone dots.
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, W);
  glow.addColorStop(0, "rgba(255,255,255,0.08)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let y = 9; y < H; y += 18)
    for (let x = 9; x < W; x += 18) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

  ctx.textBaseline = "alphabetic";
  ctx.drawImage(logo, PAD, 96, 64, 64);
  ctx.font = `500 28px ${mono}`;
  ctx.fillStyle = C.mute;
  ctx.textAlign = "right";
  ctx.fillText("WORKSHOP 01", W - PAD, 140);
  ctx.textAlign = "left";

  // Title
  ctx.fillStyle = C.paper;
  ctx.font = `900 104px ${body}`;
  const title =
    lang === "zh" ? ["做一个自己的", "个人网站"] : ["Put yourself", "online."];
  title.forEach((t, i) => ctx.fillText(t, PAD, 330 + i * 128));

  // Address
  const urlY = 540;
  ctx.fillStyle = C.ink;
  ctx.strokeStyle = C.line2;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(PAD, urlY, W - PAD * 2, 112, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.live;
  ctx.beginPath();
  ctx.arc(PAD + 52, urlY + 56, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.font = `400 40px ${mono}`;
  const url = `${user || (lang === "zh" ? "用户名" : "username")}.github.io`;
  ctx.fillText(url, PAD + 84, urlY + 70, W - PAD * 2 - 120);

  // Five steps
  let y = 780;
  poster.steps.forEach((s, i) => {
    ctx.fillStyle = C.mute;
    ctx.font = `700 40px ${display}`;
    ctx.fillText(String(i + 1), PAD, y);
    ctx.fillStyle = C.paper;
    ctx.font = `700 46px ${body}`;
    ctx.fillText(s.title[lang], PAD + 84, y);
    ctx.fillStyle = C.soft;
    ctx.font = `400 36px ${body}`;
    ctx.fillText(s.sub[lang], PAD + 84, y + 54, W - PAD * 2 - 84);
    y += 136;
  });

  // Tip, under a dashed rule
  y += 4;
  ctx.strokeStyle = C.line2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = C.soft;
  ctx.font = `400 34px ${body}`;
  wrap(ctx, poster.tip[lang], W - PAD * 2).forEach((l, i) =>
    ctx.fillText(l, PAD, y + 70 + i * 52),
  );

  // Foot: the five mascots and where to find this page
  const footY = H - 230;
  mascots.forEach((img, i) =>
    ctx.drawImage(img, PAD + i * 86, footY, 104, 100),
  );
  ctx.fillStyle = C.mute;
  ctx.font = `400 28px ${mono}`;
  ctx.fillText(`builderspace.dev/learn/${slug}`, PAD, H - 84);
}

/** Shows the poster as the image it saves, then saves or shares it. */
export function PosterDialog({
  open,
  onClose,
  user,
  slug,
  poster,
}: {
  open: boolean;
  onClose: () => void;
  user: string;
  slug: string;
  poster: EventMaterials["poster"];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [png, setPng] = useState<{ url: string; blob: Blob } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let url = "";
    let gone = false;
    const lang: Lang =
      document.documentElement.dataset.lang === "en" ? "en" : "zh";
    const canvas = document.createElement("canvas");
    drawPoster(canvas, lang, user, slug, poster)
      .then(
        () =>
          new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((b) => (b ? resolve(b) : reject()), "image/png"),
          ),
      )
      .then((blob) => {
        if (gone) return;
        url = URL.createObjectURL(blob);
        setPng({ url, blob });
      })
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
      setPng(null);
      setFailed(false);
    };
  }, [open, user, slug, poster]);

  async function save() {
    if (!png) return;
    const name = `builderspace-${slug}.png`;
    const file = new File([png.blob], name, { type: "image/png" });
    // Phones get the share sheet ("Save Image"); computers get a download.
    if (
      matchMedia("(pointer: coarse)").matches &&
      navigator.canShare?.({ files: [file] })
    ) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    const a = document.createElement("a");
    a.href = png.url;
    a.download = name;
    a.click();
  }

  return (
    <dialog
      ref={dialog}
      className="mat-poster"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
    >
      <div className="mat-poster-in">
        <div className="mat-poster-img">
          {png ? (
            // eslint-disable-next-line @next/next/no-img-element -- a blob drawn on this page
            <img src={png.url} alt="" width={W} height={H} />
          ) : (
            <span className="mono mute">
              {failed ? (
                <T
                  zh="这台设备画不出来，截个屏也行。"
                  en="This device can't draw it. A screenshot works too."
                />
              ) : (
                <T zh="正在画…" en="Drawing…" />
              )}
            </span>
          )}
        </div>
        <div className="mat-poster-row">
          <button
            type="button"
            className="btn solid primary"
            onClick={save}
            disabled={!png}
          >
            <T zh="存图" en="Save" />
            <DownloadSimple weight="light" size="1.15em" aria-hidden />
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>
            <T zh="关闭" en="Close" />
            <X weight="light" size="1.1em" aria-hidden />
          </button>
        </div>
      </div>
    </dialog>
  );
}
