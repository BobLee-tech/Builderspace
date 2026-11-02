import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { isUnsubscribeKind } from "@/lib/notify";
import { unsubscribe } from "@/lib/unsubscribe";

// List-Unsubscribe in owner emails points here: mail apps POST
// "List-Unsubscribe=One-Click" (RFC 8058) and expect a plain 200. Opening the
// address in a browser goes to the page with a button instead, so link
// scanners that only GET never turn anything off.
export async function POST(request: NextRequest) {
  const t = request.nextUrl.searchParams.get("t") ?? "";
  const k = request.nextUrl.searchParams.get("k");
  if (!isUnsubscribeKind(k) || !(await unsubscribe(t, k))) {
    return new Response("Unknown link", { status: 404 });
  }
  return new Response("Unsubscribed", { status: 200 });
}

export function GET(request: NextRequest) {
  const { search } = request.nextUrl;
  redirect(`/unsubscribe${search}`);
}
