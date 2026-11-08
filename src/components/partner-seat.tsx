"use client";

import { Check, X } from "@phosphor-icons/react/dist/ssr";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { Arr } from "@/components/fx/arr";
import { burst } from "@/components/fx/celebrate";
import { createEased, prefersReducedMotion } from "@/components/fx/motion";
import { T } from "@/components/t";
import { formatIsoDay } from "@/lib/format";
import { PARTNER_EMAIL, ROLE_LABEL } from "@/lib/partners";
import { getSmoothScroller } from "@/lib/smooth-scroll";
import { CopyText } from "./copy-text";

type Text = { zh: string; en: string };

/** One number on the card, e.g. "近" + "200" + "成员". */
export type SeatStat = {
  pre?: Text;
  value: string;
  sub?: string;
  label: Text;
};

const WAYS = ["venue", "credits", "speaker", "cohost"] as const;
type Way = (typeof WAYS)[number];
const isWay = (v: string | undefined): v is Way =>
  (WAYS as readonly string[]).includes(v ?? "");

/**
 * The plate's light, in % of the plate (`p…`) and of the number (`n…`), plus
 * the pointer's own glint across the number (`hx`, at strength `ho`, 0–100).
 */
type Light = {
  pmx: number;
  pmy: number;
  nmx: number;
  nmy: number;
  hx: number;
  ho: number;
};
const REST: Light = { pmx: 72, pmy: 38, nmx: 62, nmy: 22, hx: 50, ho: 0 };

function paintLight(plate: HTMLElement, num: HTMLElement, l: Light) {
  plate.style.setProperty("--mx", `${l.pmx.toFixed(2)}%`);
  plate.style.setProperty("--my", `${l.pmy.toFixed(2)}%`);
  num.style.setProperty("--mx", `${l.nmx.toFixed(2)}%`);
  num.style.setProperty("--my", `${l.nmy.toFixed(2)}%`);
  num.style.setProperty("--hx", `${l.hx.toFixed(2)}%`);
  num.style.setProperty("--ho", (l.ho / 100).toFixed(3));
}

/** A guilloché band for the seal, the two wave paths of its ring. */
const SEAL_WAVES = [1, -1].map((s) => {
  let d = "";
  for (let k = 0; k <= 360; k++) {
    const a = (k / 360) * Math.PI * 2;
    const r = 75.5 + 9 * Math.sin(18 * a + s * 0.9);
    d += `${k ? "L" : "M"}${(100 + r * Math.cos(a)).toFixed(2)} ${(100 + r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
});

/**
 * ask: the pitch. check: back from the mail app, did it send? done: the seal.
 * A mailto link can't tell whether anything was sent, so the card asks, and
 * celebrates only on the reader's word.
 */
type Step = "ask" | "check" | "done";

/** Where the card grows from: the centre and width of whatever opened it. */
function fromOrigin(from: HTMLElement | null, card: HTMLElement) {
  if (!from || prefersReducedMotion()) return null;
  const a = from.getBoundingClientRect();
  const b = card.getBoundingClientRect();
  const dx = a.left + a.width / 2 - (b.left + b.width / 2);
  const dy = a.top + a.height / 2 - (b.top + b.height / 2);
  const s = Math.max(0.2, Math.min(0.6, a.width / b.width));
  return `translate(${dx}px, ${dy}px) scale(${s})`;
}

/**
 * A guilloché rosette, as on a certificate, engraved ring by ring around the
 * seat number: two families of waves phase-shifted against each other.
 */
function engrave(
  canvas: HTMLCanvasElement,
  plate: HTMLElement,
  num: HTMLElement,
  instant: boolean,
) {
  const W = plate.clientWidth;
  const H = plate.clientHeight;
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const g = canvas.getContext("2d");
  if (!g) return () => {};
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Layout offsets, so the opening scale doesn't move the centre.
  const cx = num.offsetLeft + num.offsetWidth * 0.52;
  const cy = num.offsetTop + num.offsetHeight * 0.5;
  const rings = 24;
  const r0 = Math.min(W, H) * 0.12;
  const step = Math.max(W, H) * 0.03;
  const ring = (j: number) => {
    const R = r0 + j * step;
    g.strokeStyle = `rgba(255,255,255,${0.035 + 0.09 * (1 - j / rings)})`;
    g.lineWidth = 0.7;
    for (const s of [1, -1]) {
      g.beginPath();
      for (let k = 0; k <= 900; k++) {
        const a = (k / 900) * Math.PI * 2;
        const r = R + step * 1.35 * Math.sin(24 * a + s * j * 0.32);
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    }
  };
  if (instant || prefersReducedMotion()) {
    for (let j = 0; j < rings; j++) ring(j);
    return () => {};
  }
  let done = 0;
  let raf = 0;
  const t0 = performance.now();
  const tick = (now: number) => {
    const n = Math.min(rings, Math.ceil(((now - t0) / 1100) * rings));
    while (done < n) ring(done++);
    if (done < rings) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/**
 * The partner seat card: opens from anything with `data-seat` in the Partners
 * section (the open tile, "Partner with us", the four ways, the invite). The
 * plate makes the case with the next seat's number; the body has three
 * numbers and the address. Picking a way only titles the email.
 */
export function PartnerSeat({
  seat,
  stats,
}: {
  seat: string;
  stats: SeatStat[];
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const num = useRef<HTMLDivElement>(null);
  const from = useRef<HTMLElement | null>(null);
  const closing = useRef(false);
  // Eases toward the pointer and back to rest; see createEased.
  const light = useRef<ReturnType<typeof createEased<keyof Light>> | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [way, setWay] = useState<Way | null>(null);
  const [step, setStep] = useState<Step>("ask");
  const [sentOn, setSentOn] = useState("");
  // Stops waiting for the reader to come back from their mail app.
  const unwait = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest<HTMLElement>("[data-seat]");
      if (!el) return;
      e.preventDefault();
      // Already up (or on its way out): the page behind is inert anyway.
      if (dlg.current?.open) return;
      from.current = el;
      closing.current = false;
      setWay(isWay(el.dataset.way) ? el.dataset.way : null);
      setStep("ask");
      setOpen(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const d = dlg.current;
    if (!open || !d) return;
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    d.querySelector<HTMLElement>(".ps-x")?.focus({ preventScroll: true });
    const p = plate.current;
    const n = num.current;
    const eased = p && n ? createEased(REST, (l) => paintLight(p, n, l)) : null;
    eased?.reset();
    light.current = eased;
    // The page behind stays put while it's open.
    const lenis = getSmoothScroller();
    lenis?.stop();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";

    const o = fromOrigin(from.current, d);
    if (o)
      d.animate(
        [
          { transform: o, opacity: 0.2 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 520, easing: "cubic-bezier(0.2, 0.9, 0.1, 1)" },
      );

    let stop = () => {};
    const draw = (instant: boolean) => {
      stop();
      if (canvas.current && plate.current && num.current)
        stop = engrave(canvas.current, plate.current, num.current, instant);
    };
    draw(false);
    let t: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => draw(true), 120);
    };
    addEventListener("resize", onResize);
    return () => {
      stop();
      eased?.stop();
      light.current = null;
      unwait.current?.();
      clearTimeout(t);
      removeEventListener("resize", onResize);
      root.style.overflow = overflow;
      lenis?.start();
    };
  }, [open]);

  // Each step hands focus to its main button; the seal lands on "done".
  useEffect(() => {
    const d = dlg.current;
    if (!d?.open || step === "ask") return;
    d.scrollTop = 0;
    d.querySelector<HTMLElement>(`[data-focus="${step}"]`)?.focus({
      preventScroll: true,
    });
    if (step !== "done") return;
    // The number catches the light again as the seal lands.
    d.classList.remove("lit");
    void d.offsetWidth;
    d.classList.add("lit");
    if (prefersReducedMotion()) return;
    const t = setTimeout(() => {
      // Closed before the seal landed: nobody is left to see it.
      if (!closing.current)
        void burst("partner", d.querySelector(".ps-seal"), d);
    }, 640);
    return () => clearTimeout(t);
  }, [step]);

  // The mail app takes focus: ask when the reader comes back (phones may only
  // report the page becoming visible again). If nothing opened, the page keeps
  // its focus, so ask anyway after a moment.
  const waitForReturn = () => {
    unwait.current?.();
    const ask = () => {
      unwait.current?.();
      setStep("check");
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") ask();
    };
    const t = setTimeout(() => {
      if (document.hasFocus()) ask();
    }, 1200);
    addEventListener("focus", ask, { once: true });
    document.addEventListener("visibilitychange", onVisible);
    unwait.current = () => {
      clearTimeout(t);
      removeEventListener("focus", ask);
      document.removeEventListener("visibilitychange", onVisible);
      unwait.current = null;
    };
  };

  const close = useCallback(() => {
    const d = dlg.current;
    if (!d || closing.current) return;
    closing.current = true;
    const done = () => {
      d.close();
      setOpen(false);
      from.current?.focus({ preventScroll: true });
    };
    const o = fromOrigin(from.current, d);
    if (!o) return done();
    d.classList.add("out");
    d.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: o, opacity: 0 },
      ],
      { duration: 260, easing: "cubic-bezier(0.4, 0, 0.6, 1)" },
    ).finished.then(() => {
      d.classList.remove("out");
      done();
    }, done);
  }, []);

  // The light eases toward the pointer while a mouse is over the plate and
  // glides back to rest when it leaves (touch keeps the resting light).
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const p = plate.current;
    const n = num.current;
    if (!p || !n) return;
    const pr = p.getBoundingClientRect();
    const nr = n.getBoundingClientRect();
    const x = (v: number, r: DOMRect) => ((v - r.left) / r.width) * 100;
    const y = (v: number, r: DOMRect) => ((v - r.top) / r.height) * 100;
    light.current?.aim({
      pmx: x(e.clientX, pr),
      pmy: y(e.clientY, pr),
      nmx: x(e.clientX, nr),
      nmy: y(e.clientY, nr),
      hx: x(e.clientX, nr),
      ho: 100,
    });
  };
  const onLeave = () => light.current?.rest();

  // Titled in the reader's language at the moment they send it.
  const subject = () => {
    const en = document.documentElement.dataset.lang === "en";
    const parts = en
      ? ["Partnership", way && ROLE_LABEL[way].en, `Seat ${seat}`]
      : ["合作", way && ROLE_LABEL[way].zh, `席位 ${seat}`];
    return parts.filter(Boolean).join(" · ");
  };

  return (
    <dialog
      ref={dlg}
      className={open ? "ps lit" : "ps"}
      data-step={step}
      aria-labelledby="ps-title"
      data-lenis-prevent
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="ps-sheet">
        <button
          type="button"
          className="ps-x"
          onClick={close}
          aria-label="关闭 / Close"
        >
          <X weight="light" size={16} aria-hidden />
        </button>

        <div
          className="ps-plate"
          ref={plate}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
        >
          <canvas ref={canvas} aria-hidden />
          <div className="ps-glint" aria-hidden />
          <div className="ps-top">
            <span className="ps-wm">BuilderSpace</span>
            <span className="ps-rule" aria-hidden />
            <span className="mono mute">
              <T zh="合作席位" en="Partner seat" />
            </span>
          </div>
          {/* Lit, not printed: bloom, chrome, rim and a passing glint. */}
          <div
            className="ps-num"
            ref={num}
            role="img"
            aria-label={`Seat ${seat}`}
          >
            <b className="ps-bloom" aria-hidden>
              {seat}
            </b>
            <b className="ps-chrome" aria-hidden>
              {seat}
            </b>
            <b className="ps-rim" aria-hidden>
              {seat}
            </b>
            <b className="ps-shine" aria-hidden>
              {seat}
            </b>
          </div>
          <div className="ps-lede ps-when-ask">
            <h2 id="ps-title">
              <T
                zh="一起办下一场 Build Night。"
                en="Help run the next Build Night."
              />
            </h2>
          </div>
          <div className="ps-lede ps-when-done" role="status">
            <span className="mono mute" style={{ "--i": 0 } as CSSProperties}>
              <T zh="意向已发出" en="Intent sent" />
            </span>
            <h2 style={{ "--i": 1 } as CSSProperties}>
              <T zh="谢谢你的来信。" en="Thanks for writing." />
            </h2>
            <p className="mute" style={{ "--i": 2 } as CSSProperties}>
              <T
                zh="回信会发到你发信的邮箱。"
                en="We'll reply to the address you wrote from."
              />
            </p>
          </div>
          <div className="ps-seal ps-when-done" aria-hidden>
            <svg viewBox="0 0 200 200">
              <defs>
                <linearGradient id="ps-metal" x1="0" y1="0" x2="0.3" y2="1">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset=".42" stopColor="#cfcfd3" />
                  <stop offset=".5" stopColor="#4c4c52" />
                  <stop offset=".57" stopColor="#e2e2e4" />
                  <stop offset="1" stopColor="#8a8a90" />
                </linearGradient>
                <path
                  id="ps-seal-path"
                  d="M100,100 m-75,0 a75,75 0 1,1 150,0 a75,75 0 1,1 -150,0"
                />
              </defs>
              <circle className="ps-seal-disc" cx="100" cy="100" r="96" />
              <circle className="ps-seal-ring" cx="100" cy="100" r="89" />
              {SEAL_WAVES.map((d) => (
                <path key={d} className="ps-seal-wave" d={d} />
              ))}
              <circle className="ps-seal-ticks" cx="100" cy="100" r="62" />
              <circle className="ps-seal-ring" cx="100" cy="100" r="58" />
              <text className="ps-seal-text">
                <textPath
                  href="#ps-seal-path"
                  textLength={462}
                  lengthAdjust="spacing"
                >
                  {`BUILDERSPACE · PARTNER SEAT ${seat} · INTENT SENT · ${sentOn} ·`}
                </textPath>
              </text>
              <path
                className="ps-seal-check"
                pathLength={100}
                d="M70 102 l20 20 l40 -44"
              />
            </svg>
          </div>
          <div className="ps-micro" aria-hidden>
            {`BuilderSpace · Partner seat ${seat} · Sydney · `.repeat(10)}
          </div>
        </div>

        <div className="ps-body">
          <div className="ps-ask ps-when-ask">
            {stats.length > 0 && (
              <dl className="ps-stats">
                {stats.map((s, i) => (
                  <div key={s.label.en}>
                    <dt className="mute">
                      <T {...s.label} />
                    </dt>
                    <dd>
                      {s.pre && (
                        <small>
                          <T {...s.pre} />
                        </small>
                      )}
                      <span
                        className="ps-v"
                        style={{ "--k": i } as CSSProperties}
                      >
                        {s.value}
                      </span>
                      {s.sub && <small className="tnum">{s.sub}</small>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="ps-ways">
              <span className="mono mute">
                <T zh="你想怎么支持" en="How you'd help" />
              </span>
              <div className="ps-pick" role="group" aria-label="Way to help">
                {WAYS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={way === w}
                    onClick={() => setWay(way === w ? null : w)}
                  >
                    <T {...ROLE_LABEL[w]} />
                  </button>
                ))}
              </div>
            </div>

            <div className="ps-cta">
              <span className="ps-mail mono">
                <span>{PARTNER_EMAIL}</span>
                <CopyText text={PARTNER_EMAIL} />
              </span>
              <a
                className="btn solid"
                href={`mailto:${PARTNER_EMAIL}`}
                onClick={(e) => {
                  e.currentTarget.href = `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent(subject())}`;
                  waitForReturn();
                }}
              >
                <T zh="发邮件聊聊" en="Email us" />
                <Arr />
              </a>
            </div>
          </div>

          <div className="ps-check ps-when-check">
            <div
              className="ps-check-head"
              style={{ "--i": 0 } as CSSProperties}
            >
              <span className="mono mute">
                <T zh="等你发出" en="Waiting on your email" />
              </span>
              <h3>
                <T zh="邮件发出去了吗？" en="Did it send?" />
              </h3>
              <p className="mute">
                <T
                  zh="没弹出邮件应用的话，复制地址发也一样。"
                  en="No mail app opened? Copy the address and send it from anywhere."
                />
              </p>
            </div>
            <div className="ps-row" style={{ "--i": 1 } as CSSProperties}>
              <span className="ps-mail mono">
                <span>{PARTNER_EMAIL}</span>
                <CopyText text={PARTNER_EMAIL} />
              </span>
              <div className="ps-btns">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setStep("ask")}
                >
                  <T zh="返回" en="Back" />
                </button>
                <button
                  type="button"
                  className="btn solid"
                  data-focus="check"
                  onClick={() => {
                    setSentOn(
                      formatIsoDay(new Date().toISOString()).replaceAll(
                        "-",
                        ".",
                      ),
                    );
                    setStep("done");
                  }}
                >
                  <T zh="发出去了" en="It's sent" />
                  <Check weight="bold" size={15} aria-hidden />
                </button>
              </div>
            </div>
          </div>

          <div className="ps-done ps-when-done">
            <dl className="ps-receipt" style={{ "--i": 0 } as CSSProperties}>
              <div>
                <dt className="mono mute">
                  <T zh="席位" en="Seat" />
                </dt>
                <dd className="big">{seat}</dd>
              </div>
              <div>
                <dt className="mono mute">
                  <T zh="方式" en="Way" />
                </dt>
                <dd>
                  {way ? (
                    <T {...ROLE_LABEL[way]} />
                  ) : (
                    <T zh="待定" en="To decide" />
                  )}
                </dd>
              </div>
              <div>
                <dt className="mono mute">
                  <T zh="发往" en="Sent to" />
                </dt>
                <dd>{PARTNER_EMAIL}</dd>
              </div>
              <div>
                <dt className="mono mute">
                  <T zh="日期" en="Date" />
                </dt>
                <dd className="tnum">{sentOn}</dd>
              </div>
            </dl>
            <div className="ps-row" style={{ "--i": 1 } as CSSProperties}>
              <button
                type="button"
                className="ps-undo"
                onClick={() => setStep("check")}
              >
                <T zh="其实没发出去" en="It didn't send" />
              </button>
              <button
                type="button"
                className="btn solid"
                data-focus="done"
                onClick={close}
              >
                <T zh="完成" en="Done" />
                <Arr />
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
