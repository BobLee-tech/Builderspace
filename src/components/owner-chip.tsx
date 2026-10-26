"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MemberCard } from "@/app/join/member-card";
import { prefersReducedMotion } from "@/components/fx/motion";
import { memberCode } from "@/lib/members";
import type { OwnerCard } from "@/lib/types";
import { T } from "./t";

let gsapLoad: Promise<typeof import("gsap").gsap> | null = null;
const loadGsap = () => (gsapLoad ??= import("gsap").then((m) => m.gsap));

/**
 * The owner's member card in miniature, with their name and number. A button
 * above the card's stretched link: clicking it lifts the card out into an
 * enlarged view, like the cards on /people.
 */
export function OwnerChip({ owner }: { owner: OwnerCard }) {
  const { card } = owner;
  const mini = useRef<HTMLSpanElement>(null);
  const [from, setFrom] = useState<DOMRect | null | undefined>(undefined);
  return (
    <>
      <button
        type="button"
        className="owner-chip"
        aria-haspopup="dialog"
        onPointerEnter={() => void loadGsap()}
        onClick={() =>
          setFrom(
            mini.current?.querySelector(".mc-stage")?.getBoundingClientRect() ??
              null,
          )
        }
      >
        <span className="owner-mini" ref={mini} aria-hidden>
          <MemberCard
            card={card}
            design={owner.design}
            flipped={false}
            still
            className="mini"
          />
        </span>
        <span>
          <b>{card.nickname}</b>
          {card.memberNo && (
            <small className="mono">{memberCode(card.memberNo)}</small>
          )}
          <span className="sr-only">
            <T zh="，放大成员卡" en=", enlarge member card" />
          </span>
        </span>
      </button>
      {from !== undefined &&
        createPortal(
          <OwnerZoom
            owner={owner}
            from={from}
            back={() =>
              mini.current?.querySelector(".mc-stage")?.getBoundingClientRect()
            }
            onClosed={() => {
              setFrom(undefined);
              mini.current
                ?.closest<HTMLElement>(".owner-chip")
                ?.focus({ preventScroll: true });
            }}
          />,
          document.body,
        )}
    </>
  );
}

/**
 * The enlarged card: flies up from the chip, tilts with the pointer, turns
 * over to the builder profile, and flies back to the chip on close.
 */
function OwnerZoom({
  owner,
  from,
  back,
  onClosed,
}: {
  owner: OwnerCard;
  from: DOMRect | null;
  /** Where the chip is now, to fly back to. */
  back: () => DOMRect | undefined;
  onClosed: () => void;
}) {
  const { card } = owner;
  const dlg = useRef<HTMLDialogElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const [flipped, setFlipped] = useState(false);
  const [ready, setReady] = useState(false);

  const stage = () =>
    box.current?.querySelector<HTMLElement>(".mc-stage") ?? null;

  useEffect(() => {
    dlg.current?.showModal();
    let alive = true;
    void loadGsap().then((gsap) => {
      const el = stage();
      if (!alive || !el) return;
      const quick = prefersReducedMotion();
      const to = el.getBoundingClientRect();
      setReady(true);
      gsap.fromTo(
        bg.current,
        { opacity: 0 },
        { opacity: 1, duration: quick ? 0 : 0.4, ease: "power2.out" },
      );
      if (from && from.width > 0 && !quick)
        gsap.fromTo(
          el,
          {
            x: from.left - to.left,
            y: from.top - to.top,
            scale: from.width / to.width,
            transformOrigin: "0 0",
          },
          {
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.75,
            ease: "expo.out",
            clearProps: "transform",
          },
        );
      else
        gsap.fromTo(
          el,
          { y: 30, scale: 0.92, opacity: 0 },
          {
            y: 0,
            scale: 1,
            opacity: 1,
            duration: quick ? 0 : 0.6,
            ease: "expo.out",
            clearProps: "transform,opacity",
          },
        );
      if (info.current)
        gsap.fromTo(
          info.current.children,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.05,
            delay: quick ? 0 : 0.2,
            ease: "power3.out",
            clearProps: "opacity,transform",
          },
        );
    });
    return () => {
      alive = false;
    };
  }, [from]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setFlipped(false);
    void loadGsap().then((gsap) => {
      const done = () => {
        dlg.current?.close();
        onClosed();
      };
      const el = stage();
      if (!el) return done();
      const quick = prefersReducedMotion();
      const at = el.getBoundingClientRect();
      // Back into the chip if it's still on screen; otherwise it fades away.
      const target = back();
      const onScreen = Boolean(
        target &&
        target.width > 0 &&
        target.bottom > 0 &&
        target.top < innerHeight,
      );
      const tl = gsap.timeline({ onComplete: done });
      if (info.current)
        tl.to(
          info.current.children,
          { opacity: 0, y: 8, duration: quick ? 0 : 0.18, stagger: 0.02 },
          0,
        );
      tl.to(bg.current, { opacity: 0, duration: quick ? 0 : 0.4 }, 0.1);
      if (target && onScreen && !quick)
        tl.to(
          el,
          {
            x: target.left - at.left,
            y: target.top - at.top,
            scale: target.width / at.width,
            transformOrigin: "0 0",
            duration: 0.55,
            ease: "power3.inOut",
          },
          0,
        );
      else
        tl.to(
          el,
          {
            y: 20,
            scale: 0.94,
            opacity: 0,
            duration: quick ? 0 : 0.3,
            ease: "power2.in",
          },
          0,
        );
    });
  };

  return (
    <dialog
      ref={dlg}
      className={ready ? "oz ready" : "oz"}
      aria-labelledby="oz-name"
      data-lenis-prevent
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        const t = e.target as Element;
        if (t === e.currentTarget || t.classList.contains("oz-in")) close();
      }}
    >
      <div className="oz-bg" ref={bg} />
      <button type="button" className="oz-x" onClick={close}>
        <span aria-hidden>×</span>
        <span className="sr-only">
          <T zh="关闭" en="Close" />
        </span>
      </button>
      <div className="oz-in">
        <div className="oz-card" ref={box}>
          <MemberCard
            card={card}
            design={owner.design}
            flipped={flipped}
            className="shine"
          />
        </div>
        <div className="oz-info" ref={info}>
          <p className="mono mute">
            <T zh="项目发起人" en="Project owner" />
          </p>
          <h2 className="oz-name" id="oz-name">
            {card.nickname}
          </h2>
          <p className="mono mute">
            {card.memberNo ? memberCode(card.memberNo) : "BS-····"}
            {card.seal && ` · ✓ ${card.seal}`}
          </p>
          {!card.memberNo && (
            <p className="mute oz-note">
              <T
                zh="还没连到成员账号，这张卡按名字生成。发起人加入后，可以在「我的卡片」里换成自己的。"
                en="Not tied to a member account yet, so this card is generated from the name. Once the owner joins, they can make it their own."
              />
            </p>
          )}
          <div className="oz-act">
            <button
              type="button"
              className="btn ghost"
              aria-pressed={flipped}
              onClick={() => setFlipped((f) => !f)}
            >
              {flipped ? (
                <T zh="翻回正面" en="Show front" />
              ) : (
                <T zh="翻到背面" en="Turn over" />
              )}
            </button>
          </div>
          <p className="mono oz-hint">
            <T
              zh="移动鼠标看卡面光泽 · Esc 关闭"
              en="Move the pointer to tilt · Esc to close"
            />
          </p>
        </div>
      </div>
    </dialog>
  );
}
