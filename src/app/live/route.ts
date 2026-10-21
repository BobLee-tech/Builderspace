import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { findLiveEvent } from "./find-event";

// builderspace.dev/live — the one QR code printed for every event. It opens
// whichever event is live; before the host starts, the event happening around
// now (its page waits and switches on by itself); otherwise the events list.
// /live?host is the host's shortcut from /admin: the live event's console, or
// the next event's so it can be started.
export async function GET(request: NextRequest) {
  const host = request.nextUrl.searchParams.has("host");
  const slug = await findLiveEvent(host);
  redirect(slug ? `/live/${slug}${host ? "/host" : ""}` : "/events");
}
