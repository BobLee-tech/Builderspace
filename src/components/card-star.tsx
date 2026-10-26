"use client";

import { Star } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { toggleStar } from "@/app/projects/[slug]/actions";
import type { Viewer } from "@/app/projects/[slug]/star-button";
import { Msg, T } from "./t";

type Stars = { viewer: Viewer; starred: ReadonlySet<string> };

// Who is looking and what they starred, for every card on the page. The cards
// are prerendered; StarFeed fills this in once the session streams in. A store
// rather than context state, so a remounted plaza doesn't fall back to loading.
const LOADING: Stars = { viewer: "loading", starred: new Set() };
let current = LOADING;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const useStars = () =>
  useSyncExternalStore(
    subscribe,
    () => current,
    () => LOADING,
  );

export function StarFeed({
  viewer,
  starred,
}: {
  viewer: Viewer;
  starred: string[];
}) {
  const key = starred.join(",");
  useEffect(() => {
    current = { viewer, starred: new Set(key ? key.split(",") : []) };
    for (const listener of listeners) listener();
  }, [viewer, key]);
  return null;
}

/**
 * The Star pill on a card's cover, above the card's stretched link. Visitors
 * without a member card are sent to /join, like the project page's button.
 */
export function CardStar({ slug, count }: { slug: string; count: number }) {
  const stars = useStars();
  const router = useRouter();
  // Null until this card is clicked; then it wins over the streamed state.
  const [mine, setMine] = useState<{ starred: boolean; count: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const starred = mine?.starred ?? stars.starred.has(slug);
  // The cached count can lag behind a star made on another page.
  const shown = mine?.count ?? Math.max(count, starred ? 1 : 0);

  const click = () => {
    if (stars.viewer === "loading" || pending) return;
    if (stars.viewer !== "member") {
      router.push(
        stars.viewer === "guest" ? `/join?next=/projects/${slug}` : "/join",
      );
      return;
    }
    const before = { starred, count: shown };
    const next = {
      starred: !starred,
      count: Math.max(shown + (starred ? -1 : 1), 0),
    };
    setMine(next);
    setError(null);
    start(async () => {
      const result = await toggleStar(slug, next.starred);
      if (result.ok) setMine({ starred: next.starred, count: result.count });
      else {
        setMine(before);
        setError(result.message);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="cstar"
        aria-pressed={starred}
        aria-busy={pending}
        onClick={click}
      >
        <Star weight={starred ? "fill" : "light"} size={14} aria-hidden />
        {shown}
        <span className="sr-only">
          <T zh="个 Star" en="stars" />
        </span>
      </button>
      {error && (
        <span className="cstar-note" role="status">
          <Msg s={error} />
        </span>
      )}
    </>
  );
}
