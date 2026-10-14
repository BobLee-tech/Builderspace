"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  frameLoop,
  hasFinePointer,
  prefersReducedMotion,
} from "@/components/fx/motion";
import { Scramble } from "@/components/fx/text-fx";
import { T } from "@/components/t";
import {
  HOURS_LABEL,
  SKILL_LABEL,
  type Skill,
  type WeeklyHours,
} from "@/lib/types";

export type CardData = {
  nickname: string;
  schoolDegree: string;
  major: string;
  skills: Skill[];
  hours: WeeklyHours | null;
};

export function readCard(form: HTMLFormElement): CardData {
  const d = new FormData(form);
  const s = (k: string) => String(d.get(k) ?? "").trim();
  return {
    nickname: s("nickname"),
    schoolDegree: s("schoolDegree"),
    major: s("major"),
    skills: d.getAll("skills").map(String) as Skill[],
    hours: (s("weeklyHours") || null) as WeeklyHours | null,
  };
}

/** Display-only number, stable for a nickname; not stored anywhere. */
const memberNo = (name: string) =>
  `BS-T3-${([...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 9000) + 1000}`;

/** Where the virtual light sits when nothing is hovering: a slow loop. */
const idleLight = (t: number) => [
  0.5 + Math.cos(t / 2200) * 0.38,
  0.35 + Math.sin(t / 2200) * 0.3,
];

/**
 * A preview of the member card that fills in as the form is typed; on success
 * it flips to show the admin's WeChat QR on the back. A brushed-metal card lit
 * by one virtual light: the pointer moves the light (and tilts the card), and
 * when idle the light drifts on its own.
 */
export function MemberCard({
  data,
  flipped,
  adminQr,
}: {
  data: CardData | null;
  flipped: boolean;
  adminQr: string | null;
}) {
  const col = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const name = data?.nickname || null;
  const major = [data?.major, data?.schoolDegree].filter(Boolean).join(" · ");

  const light = useCallback((x: number, y: number, tiltToo: boolean) => {
    // Set on the column so the shadow under the card can follow the light too.
    const el = col.current;
    if (!el) return;
    const dx = x - 0.5;
    const dy = y - 0.5;
    el.style.setProperty("--lx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--ly", `${(y * 100).toFixed(1)}%`);
    el.style.setProperty(
      "--la",
      `${((Math.atan2(dy, dx) * 180) / Math.PI + 90).toFixed(1)}deg`,
    );
    el.style.setProperty(
      "--lk",
      Math.min(1, Math.hypot(dx, dy) * 1.6).toFixed(2),
    );
    if (tiltToo) {
      el.style.setProperty("--ry", `${(dx * 20).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-dy * 14).toFixed(2)}deg`);
    }
  }, []);

  // Idle drift, only while the card is on screen.
  useEffect(() => {
    const el = tilt.current;
    if (!el || prefersReducedMotion()) return;
    let stop: (() => void) | null = null;
    const io = new IntersectionObserver(([e]) => {
      stop?.();
      stop = e.isIntersecting
        ? frameLoop.add((_, now) => {
            if (!hovering.current) {
              const [x, y] = idleLight(now);
              light(x, y, false);
            }
            return true;
          })
        : null;
    });
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
    };
  }, [light]);

  return (
    <div className="mc-col" ref={col}>
      <div
        className="mc-stage"
        onPointerMove={(e) => {
          if (!hasFinePointer() || prefersReducedMotion()) return;
          const r = e.currentTarget.getBoundingClientRect();
          hovering.current = true;
          tilt.current?.classList.add("tracking");
          light(
            (e.clientX - r.left) / r.width,
            (e.clientY - r.top) / r.height,
            true,
          );
        }}
        onPointerLeave={() => {
          hovering.current = false;
          tilt.current?.classList.remove("tracking");
          col.current?.style.setProperty("--rx", "0deg");
          col.current?.style.setProperty("--ry", "0deg");
        }}
      >
        <div className="mc-tilt" ref={tilt}>
          <div className={flipped ? "mcard flip" : "mcard"}>
            <i className="mc-edge" aria-hidden />
            <i className="mc-edge" aria-hidden />
            <i className="mc-edge" aria-hidden />
            <div className="mc-face mc-front" aria-hidden={flipped}>
              <Lighting guilloche />
              <span className="mc-frame" aria-hidden />
              <span className="mc-mascot" aria-hidden />
              <div className="mc-top">
                <span className="logo">BuilderSpace</span>
                <span className="mono mute">Member · T3 2026</span>
              </div>
              <div className="mc-mid">
                <b className="mc-name">
                  {name ? (
                    <Scramble text={name} frames={14} />
                  ) : (
                    <T zh="你的昵称" en="Your name" />
                  )}
                </b>
                <span className="mc-major">
                  {major || <T zh="专业 · 学位" en="Major · degree" />}
                </span>
                <div className="mc-skills">
                  {data?.skills.map((s) => (
                    <span key={s} className="tag">
                      <T {...SKILL_LABEL[s]} />
                    </span>
                  ))}
                </div>
              </div>
              <div className="mc-bot">
                <div>
                  <span className="mono mute">No.</span>
                  <b className="mono">
                    {name ? (
                      <Scramble text={memberNo(name)} frames={20} />
                    ) : (
                      "BS-T3-····"
                    )}
                  </b>
                </div>
                <div>
                  <span className="mono mute">
                    <T zh="每周" en="Weekly" />
                  </span>
                  <b className="mono">
                    {data?.hours ? <T {...HOURS_LABEL[data.hours]} /> : "—"}
                  </b>
                </div>
                <div className="mc-chip" aria-hidden />
              </div>
              <span className="mc-micro" aria-hidden>
                BUILDERSPACE · MEMBER · SYDNEY · T3 2026 · BRING AN IDEA · LEAVE
                WITH SOMETHING THAT WORKS · BUILDERSPACE · MEMBER · SYDNEY
              </span>
            </div>
            <div className="mc-face mc-back" aria-hidden={!flipped}>
              <Lighting />
              <span className="mc-frame" aria-hidden />
              <div className="mc-top">
                <span className="mono mute">
                  <T zh="扫码加管理员微信" en="Add the admin on WeChat" />
                </span>
                <span className="mono mute">BuilderSpace</span>
              </div>
              <div className="mc-qr">
                {adminQr ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ops-supplied QR, any host
                  <img src={adminQr} alt="Admin WeChat QR / 管理员微信二维码" />
                ) : (
                  <T zh="管理员二维码待上传" en="Admin QR coming soon" />
                )}
              </div>
              <p className="mono mute" style={{ fontSize: 10.5 }}>
                <T
                  zh="备注 “BuilderSpace + 昵称”"
                  en='Note: "BuilderSpace + your nickname"'
                />
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mc-shadow" aria-hidden />
      <p className="mono mute mc-cap">
        <T
          zh="你的成员卡 · 跟着表单实时更新"
          en="Your member card · updates as you type"
        />
      </p>
    </div>
  );
}

/** The light-dependent layers of one card face; see .mc-* in motion.css. */
function Lighting({ guilloche = false }: { guilloche?: boolean }) {
  return (
    <>
      <i className="mc-brush" aria-hidden />
      {guilloche && <i className="mc-guil" aria-hidden />}
      <i className="mc-aniso" aria-hidden />
      <i className="mc-spec" aria-hidden />
      <i className="mc-glare" aria-hidden />
      <i className="mc-grain" aria-hidden />
      <i className="mc-rim" aria-hidden />
    </>
  );
}
