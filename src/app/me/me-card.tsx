"use client";

import { useState } from "react";
import { T } from "@/components/t";
import { MemberCard, type CardView } from "../join/member-card";

/** The member's card with a button to turn it over to the builder profile. */
export function MeCard({ card }: { card: CardView }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="me-card">
      <MemberCard card={card} flipped={flipped} />
      <button
        type="button"
        className="btn ghost sm"
        aria-pressed={flipped}
        onClick={() => setFlipped((f) => !f)}
      >
        {flipped ? (
          <T zh="看正面" en="Show the front" />
        ) : (
          <T zh="看背面" en="Show the back" />
        )}
      </button>
    </div>
  );
}
