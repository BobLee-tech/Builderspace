"use server";

import { redirect } from "next/navigation";
import { isUnsubscribeKind } from "@/lib/notify";
import { unsubscribe } from "@/lib/unsubscribe";

/** The button on /unsubscribe. */
export async function confirmUnsubscribe(form: FormData) {
  const t = String(form.get("t") ?? "");
  const k = form.get("k");
  if (!isUnsubscribeKind(k)) redirect("/unsubscribe");
  const done = await unsubscribe(t, k);
  const query = new URLSearchParams({ t, k });
  if (done) query.set("done", "1");
  redirect(`/unsubscribe?${query}`);
}
