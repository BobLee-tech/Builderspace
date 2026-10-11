import { cacheLife } from "next/cache";
import { getEvents } from "@/lib/data";
import { buildCalendar } from "@/lib/ics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
