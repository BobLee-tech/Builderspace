"use client";

import { useRef } from "react";
import { hasFinePointer, prefersReducedMotion } from "@/components/fx/motion";
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

/**
 * A preview of the member card that fills in as the form is typed; on success
 * it flips to show the admin's WeChat QR on the back. Tilts toward the pointer.
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
  const card = useRef<HTMLDivElement>(null);
  const name = data?.nickname || null;
  const major = [data?.major, data?.schoolDegree].filter(Boolean).join(" · ");

  return (
    <div className="mc-col">
      <div
        className="mc-stage"
        onPointerMove={(e) => {
          const el = card.current;
          if (!el || !hasFinePointer() || prefersReducedMotion()) return;
          const r = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          const y = (e.clientY - r.top) / r.height;
          el.style.transition = "transform .15s linear";
          el.style.setProperty("--ry", `${((x - 0.5) * 16).toFixed(2)}deg`);
          el.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`);
          el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
          el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
        }}
        onPointerLeave={() => {
          const el = card.current;
          if (!el) return;
          el.style.transition = "";
          el.style.setProperty("--rx", "0deg");
          el.style.setProperty("--ry", "0deg");
        }}
      >
        <div className={flipped ? "mcard flip" : "mcard"} ref={card}>
          <div className="mc-face mc-front" aria-hidden={flipped}>
            <div className="mc-holo" aria-hidden />
            <div className="mc-top">
              <span className="logo">BuilderSpace</span>
              <span className="mono mute">Member · T3 2026</span>
            </div>
            <div className="mc-mid">
              <b className="mc-name">
                {name ?? <T zh="你的昵称" en="Your name" />}
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
                <b className="mono">{name ? memberNo(name) : "BS-T3-····"}</b>
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
          </div>
          <div className="mc-face mc-back" aria-hidden={!flipped}>
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
      <p className="mono mute mc-cap">
        <T
          zh="你的成员卡 · 跟着表单实时更新"
          en="Your member card · updates as you type"
        />
      </p>
    </div>
  );
}
