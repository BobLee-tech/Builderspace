import { redirect } from "next/navigation";
import { findLiveEvent } from "../live/find-event";

// builderspace.dev/intent — the QR code on the slide after the guest's talk.
// It opens the live event's "what next" form directly, whatever step the host
// is on; answers land with the live page's, in the host console.
export async function GET() {
  const slug = await findLiveEvent();
  redirect(slug ? `/live/${slug}/intent` : "/events");
}
