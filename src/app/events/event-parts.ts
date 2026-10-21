// Bits shared by the events page and the event detail page.
import {
  ChatText,
  Code,
  ForkKnife,
  GithubLogo,
  Laptop,
  QrCode,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { getEventPage, type EventIcon } from "@/lib/event-pages";
import { SEAT_GROUPS, type EventSignups, type SiteEvent } from "@/lib/types";

export const EVENT_ICONS: Record<EventIcon, Icon> = {
  code: Code,
  sparkle: Sparkle,
  people: UsersThree,
  laptop: Laptop,
  github: GithubLogo,
  snack: ForkKnife,
  prompt: ChatText,
  live: QrCode,
};

/** The seat groups an event takes, with their quotas, in display order. */
export function seatGroups(event: SiteEvent) {
  return SEAT_GROUPS.flatMap((g) => {
    const n = event.seatQuotas?.[g];
    return n === undefined ? [] : [[g, n] as const];
  });
}

/** Full once every group that's open has no seat left. */
export function eventIsFull(event: SiteEvent, signups: EventSignups) {
  return (
    (event.capacity !== null && signups.confirmed >= event.capacity) ||
    (event.seatQuotas !== null &&
      Object.entries(event.seatQuotas).every(
        ([g, n]) =>
          (signups.byGroup[g as keyof typeof signups.byGroup] ?? 0) >= n,
      ))
  );
}

/**
 * The seats the site shows: total, taken, left and per group, leaving out
 * the groups the event page lists as unlisted.
 */
export function shownSeats(event: SiteEvent, signups: EventSignups) {
  const unlisted = getEventPage(event.slug)?.unlistedSeats ?? [];
  const groups = seatGroups(event).filter(([g]) => !unlisted.includes(g));
  let capacity = event.capacity;
  let confirmed = signups.confirmed;
  for (const g of unlisted) {
    if (capacity !== null) capacity -= event.seatQuotas?.[g] ?? 0;
    confirmed -= signups.byGroup[g] ?? 0;
  }
  const left = capacity === null ? null : Math.max(capacity - confirmed, 0);
  return { capacity, confirmed, left, groups };
}
