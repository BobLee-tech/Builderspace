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
  LOOKING_LABEL,
  MEMBER_SKILL_LABEL,
  SPARK_INFO,
  memberCode,
  type LookingFor,
  type MemberSkill,
  type Spark,
} from "@/lib/members";

export type CardView = {
  nickname: string;
  schoolDegree: string;
  major: string;
  skills: MemberSkill[];
  spark: Spark;
  /** Null until the card is made: the number comes from the real join order. */
  memberNo: number | null;
  /** Set when the sign-in email is a school address; shows the seal. */
  seal: string | null;
  building: string | null;
  lookingFor: LookingFor[];
};

/** Where the virtual light sits when nothing is hovering: a slow loop. */
const idleLight = (t: number) => [
  0.5 + Math.cos(t / 2200) * 0.38,
  0.35 + Math.sin(t / 2200) * 0.3,
];

/**
 * The member card. A brushed-metal card lit by one virtual light: the pointer
 * moves the light (and tilts the card), and when idle the light drifts on its
 * own. The front says who you are; the back is your builder profile: your
 * mascot, what you are building and who you are looking for.
 */
export function MemberCard({
  card,
  flipped,
  caption,
}: {
  card: CardView;
  flipped: boolean;
  caption?: React.ReactNode;
}) {
  const col = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const spark = SPARK_INFO[card.spark];
  const major = [card.major, card.schoolDegree].filter(Boolean).join(" · ");
  const no = card.memberNo ? memberCode(card.memberNo) : "BS-····";

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

  const shown = card.skills.slice(0, 3);
  const more = card.skills.length - shown.length;

  return (
    <div
      className="mc-col"
      ref={col}
      style={{ "--spark": spark.color } as React.CSSProperties}
    >
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
                  {card.nickname ? (
                    <Scramble text={card.nickname} frames={14} />
                  ) : (
                    <T zh="你的昵称" en="Your name" />
                  )}
                </b>
                <span className="mc-major">
                  {major || <T zh="专业 · 学位" en="Major · degree" />}
                </span>
                <div className="mc-skills">
                  {shown.map((s) => (
                    <span key={s} className="tag">
                      <T {...MEMBER_SKILL_LABEL[s]} />
                    </span>
                  ))}
                  {more > 0 && <span className="tag">+{more}</span>}
                </div>
              </div>
              <div className="mc-bot">
                <div>
                  <span className="mono mute">No.</span>
                  <b className="mono">{no}</b>
                </div>
                <div>
                  <span className="mono mute">Spark</span>
                  <b className="mono mc-spark">
                    <T {...spark.role} />
                  </b>
                </div>
                {card.seal && (
                  <i className="mc-seal" title="School email verified">
                    <b>✓</b>
                    <small>{card.seal}</small>
                  </i>
                )}
                <div className="mc-chip" aria-hidden />
              </div>
              <span className="mc-micro" aria-hidden>
                BUILDERSPACE · DIFFERENT PIECES · ONE BIG IDEA · SYDNEY · T3
                2026 · 五色各异 · 拼创无限 · BUILDERSPACE · DIFFERENT PIECES
              </span>
            </div>
            <div className="mc-face mc-back" aria-hidden={!flipped}>
              <Lighting />
              <span className="mc-frame" aria-hidden />
              <div className="mc-top">
                <span className="mono mute">Builder profile</span>
                <span className="mono mute">{no}</span>
              </div>
              <div className="mc-profile">
                <div className="mc-buddy">
                  <span className="mc-say">{spark.say}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG art */}
                  <img src={`/mascots/${card.spark}.svg`} alt="" />
                  <span className="mono mc-buddy-name">
                    {spark.name} · <T {...spark.role} />
                  </span>
                </div>
                <div className="mc-wants">
                  <div>
                    <span className="mono mute">
                      <T zh="正在做" en="Building" />
                    </span>
                    <p className={card.building ? "" : "mute"}>
                      {card.building || (
                        <T
                          zh="还没想好？来 Build Night 找灵感"
                          en="Not sure yet? Find one at Build Night"
                        />
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="mono mute">
                      <T zh="在找" en="Looking for" />
                    </span>
                    <div className="mc-skills">
                      {card.lookingFor.length ? (
                        card.lookingFor.map((k) => (
                          <span key={k} className="tag">
                            <T {...LOOKING_LABEL[k]} />
                          </span>
                        ))
                      ) : (
                        <span className="tag mute">
                          <T zh="随缘" en="Open to anything" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mc-shadow" aria-hidden />
      {caption && <p className="mono mute mc-cap">{caption}</p>}
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
