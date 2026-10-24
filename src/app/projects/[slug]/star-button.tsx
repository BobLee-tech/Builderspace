"use client";

import { Star } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Msg, T } from "@/components/t";
import { toggleStar } from "./actions";

/** Who is looking: Star needs a member card, so the other two get a pointer. */
export type Viewer = "member" | "no-card" | "guest" | "loading";

export function StarButton({
  slug,
  count: initialCount,
  starred: initialStarred,
  viewer,
}: {
  slug: string;
  count: number;
  starred: boolean;
  viewer: Viewer;
}) {
  const [starred, setStarred] = useState(initialStarred);
  // The cached count can lag behind a star made on another page.
  const [count, setCount] = useState(
    Math.max(initialCount, initialStarred ? 1 : 0),
  );
  // "join" points the visitor at /join; anything else is an error message.
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const click = () => {
    if (viewer === "loading") return;
    if (viewer !== "member") {
      setNote((n) => (n === "join" ? null : "join"));
      return;
    }
    const next = !starred;
    const before = { starred, count };
    // Show it straight away; the server's count replaces the guess.
    setStarred(next);
    setCount((c) => Math.max(c + (next ? 1 : -1), 0));
    setNote(null);
    start(async () => {
      const result = await toggleStar(slug, next);
      if (result.ok) {
        setCount(result.count);
      } else {
        setStarred(before.starred);
        setCount(before.count);
        setNote(result.message);
      }
    });
  };

  return (
    <div className="star-wrap">
      <button
        type="button"
        className="star-btn"
        aria-pressed={starred}
        aria-busy={pending}
        onClick={click}
      >
        <span className="star-lbl">
          <Star weight={starred ? "fill" : "light"} size={16} aria-hidden />
          {starred ? <T zh="已 Star" en="Starred" /> : "Star"}
        </span>
        <span className="star-n">
          {count}
          <span className="sr-only">
            <T zh="个 Star" en="stars" />
          </span>
        </span>
      </button>
      {note && (
        <p className="star-note" role="status">
          {note === "join" ? (
            <JoinHint slug={slug} hasAccount={viewer === "no-card"} />
          ) : (
            <Msg s={note} />
          )}
        </p>
      )}
    </div>
  );
}

function JoinHint({ slug, hasAccount }: { slug: string; hasAccount: boolean }) {
  return hasAccount ? (
    <>
      <T
        zh="Star 要先生成成员卡，每人每个项目一次。"
        en="Make your member card to star. One star per member."
      />{" "}
      <Link href="/join">
        <T zh="生成成员卡" en="Make my card" /> →
      </Link>
    </>
  ) : (
    <>
      <T
        zh="Star 要先登录，每人每个项目一次。"
        en="Sign in to star. One star per member."
      />{" "}
      <Link href={`/join?next=/projects/${slug}`}>
        <T zh="登录 / 加入" en="Sign in / Join" /> →
      </Link>
    </>
  );
}
