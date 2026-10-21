import { getEvents } from "@/lib/data";
import { getLiveStore } from "@/lib/live-store";

const HOUR = 3_600_000;

/**
 * The event a printed QR code should open: whichever is live; before the
 * host starts, the event happening around now (its page waits and switches
 * on by itself). For the host, the next event that hasn't ended. Null when
 * there's nothing near.
 */
export async function findLiveEvent(host = false): Promise<string | null> {
  let live: string[] = [];
  try {
    live = (await getLiveStore()?.liveSlugs()) ?? [];
  } catch {
    // Fall through to the time-based guess.
  }
  if (live[0]) return live[0];

  const now = Date.now();
  const events = await getEvents();
  const soon = events.find((e) =>
    host
      ? now < Date.parse(e.endsAt) + 12 * HOUR
      : now > Date.parse(e.startsAt) - 12 * HOUR &&
        now < Date.parse(e.endsAt) + 12 * HOUR,
  );
  return soon?.slug ?? null;
}
