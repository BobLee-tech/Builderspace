// Bits shared by the events page and the event detail page.
import {
  Code,
  ForkKnife,
  GithubLogo,
  Laptop,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { EventIcon } from "@/lib/event-pages";
import { SEAT_GROUPS, type EventSignups, type SiteEvent } from "@/lib/types";

export const EVENT_ICONS: Record<EventIcon, Icon> = {
  code: Code,
  sparkle: Sparkle,
  people: UsersThree,
  laptop: Laptop,
  github: GithubLogo,
  snack: ForkKnife,
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
