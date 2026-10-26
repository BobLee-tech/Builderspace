"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MemberCard } from "@/app/join/member-card";
import { prefersReducedMotion } from "@/components/fx/motion";
import { memberCode } from "@/lib/members";
import type { OwnerCard } from "@/lib/types";
import { T } from "./t";

type Fx = {
  gsap: typeof import("gsap").gsap;
  Flip: typeof import("gsap/Flip").Flip;
};
let fxLoad: Promise<Fx> | null = null;
const loadFx = () =>
  (fxLoad ??= Promise.all([import("gsap"), import("gsap/Flip")]).then(
    ([{ gsap }, { Flip }]) => {
      gsap.registerPlugin(Flip);
      return { gsap, Flip };
    },
  ));

const onScreen = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
};

/**
 * The owner's member card in miniature, with their name and number. A button
 * above the card's stretched link: clicking it lifts the card out into an
 * enlarged view, like the cards on /people.
 */
export function OwnerChip({ owner }: { owner: OwnerCard }) {
  const { card } = owner;
  const chip = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const slot = useCallback(
    () => chip.current?.querySelector<HTMLElement>(".mc-stage") ?? null,
    [],
  );
  return (
    <>
      <button
        ref={chip}
        type="button"
        className={open ? "owner-chip lifted" : "owner-chip"}
        aria-haspopup="dialog"
        onPointerEnter={() => void loadFx()}
        onClick={() => setOpen(true)}
      >
        <span className="owner-mini" aria-hidden>
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
      {open &&
        createPortal(
          <OwnerZoom
            owner={owner}
            slot={slot}
            onClosed={() => {
              setOpen(false);
              chip.current?.focus({ preventScroll: true });
            }}
          />,
          document.body,
        )}
    </>
  );
}

/**
 * The enlarged card: lifts out of the chip, tilts with the pointer, turns over
 * to the builder profile, and settles back into the chip on close. Flip
 * measures the chip's card when each flight starts, so it leaves from and
 * lands on exactly where that card is, wherever the page has moved.
 */
function OwnerZoom({
  owner,
  slot,
  onClosed,
}: {
  owner: OwnerCard;
  /** The small card in the chip, emptied while this one is out. */
  slot: () => HTMLElement | null;
  onClosed: () => void;
}) {
  const { card } = owner;
  const dlg = useRef<HTMLDialogElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const opening = useRef<gsap.core.Timeline | null>(null);
  const closing = useRef(false);
  const [flipped, setFlipped] = useState(false);
  const [ready, setReady] = useState(false);

  const stage = () =>
    box.current?.querySelector<HTMLElement>(".mc-stage") ?? null;

  useEffect(() => {
    dlg.current?.showModal();
    let alive = true;
    void loadFx().then(({ gsap, Flip }) => {
      const el = stage();
      const from = slot();
      if (!alive || !el) return;
      const quick = prefersReducedMotion();
      setReady(true);
      const tl = (opening.current = gsap.timeline());
      tl.fromTo(
        bg.current,
        { opacity: 0 },
        { opacity: 1, duration: quick ? 0 : 0.5, ease: "power2.out" },
        0,
      );
      if (from && onScreen(from) && !quick) {
        // Sit exactly on the small card, then lift off with a slight tilt and
        // a slow start, so it reads as that card leaving its slot.
        Flip.fit(el, from, { scale: true });
        gsap.set(el, { rotation: -4 });
        tl.to(
          el,
          {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            duration: 0.85,
            ease: "expo.inOut",
            clearProps: "transform",
          },
          0,
        );
      } else
        tl.fromTo(
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
          0,
        );
      if (info.current)
        tl.fromTo(
          info.current.children,
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.05,
            ease: "power3.out",
            clearProps: "opacity,transform",
          },
          quick ? 0 : 0.45,
        );
    });
    return () => {
      alive = false;
      opening.current?.kill();
    };
  }, [slot]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setFlipped(false);
    void loadFx().then(({ gsap, Flip }) => {
      // Closing mid-flight turns the card round from where it got to.
      opening.current?.kill();
      const done = () => {
        dlg.current?.close();
        onClosed();
      };
      const el = stage();
      if (!el) return done();
      const quick = prefersReducedMotion();
      const to = slot();
      const tl = gsap.timeline({ onComplete: done });
      if (info.current)
        tl.to(
          info.current.children,
          { opacity: 0, y: 8, duration: quick ? 0 : 0.2, stagger: 0.02 },
          0,
        );
      tl.to(bg.current, { opacity: 0, duration: quick ? 0 : 0.45 }, 0.15);
      // Back into the chip if it's on screen; otherwise it fades away.
      if (to && onScreen(to) && !quick)
        tl.to(
          el,
          {
            ...(Flip.fit(el, to, { scale: true, getVars: true }) as object),
            duration: 0.7,
            ease: "expo.inOut",
          },
          0.05,
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
