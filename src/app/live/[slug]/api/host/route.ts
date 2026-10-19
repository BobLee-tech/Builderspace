import { cookies } from "next/headers";
import { ADMIN_KEY_COOKIE } from "@/lib/admin";
import { getLiveStore } from "@/lib/live-store";

// The host console's view: names, feedback text, and the WeChat IDs of people
// who want to join. The database checks the /admin key on every call.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/live/[slug]/api/host">,
) {
  const { slug } = await ctx.params;
  const store = getLiveStore();
  if (!store) return Response.json({ closed: true }, { status: 503 });
  const key = (await cookies()).get(ADMIN_KEY_COOKIE)?.value ?? "";
  try {
    const host = await store.hostState(slug, key);
    if (!host) return Response.json({ missing: true }, { status: 404 });
    if (typeof host === "string") {
      return Response.json({ denied: host }, { status: 403 });
    }
    return Response.json(
      { host },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ failed: true }, { status: 502 });
  }
}
