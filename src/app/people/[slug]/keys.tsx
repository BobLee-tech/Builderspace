"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { T } from "@/components/t";
import { FROM_PEOPLE } from "@/lib/founder-profiles";

// Whether this profile was opened from a card on /people. Read once from the
// flag the card sets, then kept here while the visitor steps between profiles
// (those replace the history entry), so "back" can be a real back.
let cameFromPeople = false;
function takeFlag() {
  try {
    if (sessionStorage.getItem(FROM_PEOPLE) === "1") cameFromPeople = true;
    sessionStorage.removeItem(FROM_PEOPLE);
  } catch {}
}

/**
 * Back to /people: a real back when the visitor came from a founder card, so
 * the page returns where they left it and the photo morphs home.
 */
function useBack() {
  const router = useRouter();
  return () => {
    if (cameFromPeople) {
      cameFromPeople = false;
      router.back();
    } else router.push("/people");
  };
}

export function BackLink() {
  const back = useBack();
  return (
    <button type="button" className="tm-pf-back" onClick={back}>
      <span aria-hidden>←</span>
      <span className="t">
        <T zh="返回成员" en="All people" />
      </span>
    </button>
  );
}

/** Esc goes back; ← → step to the previous and next founder. */
export function ProfileKeys({ prev, next }: { prev: string; next: string }) {
  const back = useBack();
  const router = useRouter();
  useEffect(takeFlag, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "Escape") back();
      if (e.key === "ArrowLeft") router.replace(prev, { scroll: false });
      if (e.key === "ArrowRight") router.replace(next, { scroll: false });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });
  return null;
}
