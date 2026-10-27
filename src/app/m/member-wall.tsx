"use client";

import Link from "next/link";
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { prefersReducedMotion } from "@/components/fx/motion";
import { T } from "@/components/t";
import type { PublicCard } from "@/lib/types";
import { levelCard, MemberCard, setCardLight } from "../join/member-card";

/** Cards drawn before "show all": a screenful, so the page stays light. */
const FIRST = 12;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** The wall on /people: every public card in join order, each to its /m page. */
export function MemberWall({ cards }: { cards: PublicCard[] }) {
  const [all, setAll] = useState(false);
  if (cards.length === 0) return null;
  const shown = all ? cards : cards.slice(0, FIRST);
  return (
    <section className="mw" id="members" aria-labelledby="mw-title">
      <div className="tm-sub mono">
        <h2 id="mw-title">
          <T zh="成员卡片" en="Member cards" />
        </h2>
        <span className="tm-rule" aria-hidden />
        <span className="tm-n">{pad2(cards.length)}</span>
      </div>
      <ul className="mw-grid">
        {shown.map((c) => (
          <li key={c.handle}>
            <Tile pub={c} />
          </li>
        ))}
      </ul>
      {!all && cards.length > FIRST && (
        <button
          type="button"
          className="btn ghost sm mw-more"
          onClick={() => setAll(true)}
        >
          <T
            zh={`显示全部 ${cards.length} 张`}
            en={`Show all ${cards.length}`}
          />
        </button>
      )}
    </section>
  );
}

/** One card; the light follows a mouse over it, like the core team's. */
function Tile({ pub }: { pub: PublicCard }) {
  const col = (e: ReactPointerEvent) =>
    e.currentTarget.querySelector<HTMLElement>(".mc-col");
  return (
    <Link
      href={`/m/${pub.handle}`}
      className="mw-tile"
      aria-label={pub.card.nickname}
      onPointerMove={(e) => {
        const c = col(e);
        const stage = c?.querySelector(".mc-stage");
        if (!c || !stage || e.pointerType !== "mouse" || prefersReducedMotion())
          return;
        const r = stage.getBoundingClientRect();
        c.querySelector(".mc-tilt")?.classList.add("tracking");
        setCardLight(
          c,
          (e.clientX - r.left) / r.width,
          (e.clientY - r.top) / r.height,
          0.5,
        );
      }}
      onPointerLeave={(e) => {
        const c = col(e);
        if (c) levelCard(c);
      }}
    >
      <MemberCard card={pub.card} design={pub.design} flipped={false} still />
      <span className="mw-go mono" aria-hidden>
        <T zh="看卡" en="View" /> ↗
      </span>
    </Link>
  );
}
