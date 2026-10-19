import { cookies } from "next/headers";
import { LIVE_COOKIE } from "@/lib/event-live";
import { getLiveStore } from "@/lib/live-store";

// Polled every few seconds by phones and the screen: the public summary, and
// for a device that has said who it is, that person's own answers.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/live/[slug]/api/state">,
) {
  const { slug } = await ctx.params;
  const store = getLiveStore();
  if (!store) return Response.json({ closed: true }, { status: 503 });
  const token = (await cookies()).get(LIVE_COOKIE)?.value;
  try {
    const [state, me] = await Promise.all([
      store.state(slug),
      token ? store.me(slug, token) : null,
    ]);
    if (!state) return Response.json({ missing: true }, { status: 404 });
    return Response.json(
      { state, me },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ failed: true }, { status: 502 });
  }
}
