import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getEvents } from "@/lib/data";
import { getLiveStore } from "@/lib/live-store";

const HOUR = 3_600_000;

// builderspace.dev/live — the one QR code printed for every event. It opens
// whichever event is live; before the host starts, the event happening around
// now (its page waits and switches on by itself); otherwise the events list.
// /live?host is the host's shortcut from /admin: the live event's console, or
// the next event's so it can be started.
export async function GET(request: NextRequest) {
  const host = request.nextUrl.searchParams.has("host");
  const to = (slug: string) => `/live/${slug}${host ? "/host" : ""}`;

  let live: string[] = [];
  try {
    live = (await getLiveStore()?.liveSlugs()) ?? [];
  } catch {
    // Fall through to the time-based guess.
  }
  if (live[0]) redirect(to(live[0]));

  const now = Date.now();
  const events = await getEvents();
  const soon = events.find((e) =>
    host
      ? now < Date.parse(e.endsAt) + 12 * HOUR
      : now > Date.parse(e.startsAt) - 12 * HOUR &&
        now < Date.parse(e.endsAt) + 12 * HOUR,
  );
  redirect(soon ? to(soon.slug) : "/events");
}
