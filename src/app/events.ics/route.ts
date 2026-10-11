import { cacheLife } from "next/cache";
import { getEvents } from "@/lib/data";
import { buildCalendar } from "@/lib/ics";
import { siteUrl } from "@/lib/site-url";

async function calendar() {
  "use cache";
  cacheLife("hours");
  const events = await getEvents();
  return buildCalendar(events, {
    siteUrl,
    generatedAt: new Date().toISOString(),
  });
}

export async function GET() {
  return new Response(await calendar(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="builderspace.ics"',
    },
  });
}
