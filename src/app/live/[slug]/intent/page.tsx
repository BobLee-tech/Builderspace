import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { T } from "@/components/t";
import { getEvent } from "@/lib/data";
import { eventCopy } from "@/lib/event-pages";
import { LiveApp } from "../live-app";
import "../../live.css";

// The "what next" form on its own, for builderspace.dev/intent: same sign-in
// by name and same answer as the live page's intent step.
export async function generateMetadata({
  params,
}: PageProps<"/live/[slug]/intent">): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  return {
    title: event ? `意向 · ${event.title}` : "意向",
    robots: { index: false },
  };
}

export default function LiveIntentPage({
  params,
}: PageProps<"/live/[slug]/intent">) {
  return (
    <Suspense
      fallback={
        <div className="live-phone">
          <p className="mute">
            <T zh="加载中…" en="Loading…" />
          </p>
        </div>
      }
    >
      {params.then(({ slug }) => (
        <IntentShell slug={slug} />
      ))}
    </Suspense>
  );
}

async function IntentShell({ slug }: { slug: string }) {
  const event = await getEvent(slug);
  if (!event) notFound();
  return <LiveApp slug={slug} title={eventCopy(event).title} only="intent" />;
}
