import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { T } from "@/components/t";
import { getEvent } from "@/lib/data";
import { eventCopy } from "@/lib/event-pages";
import { LiveApp } from "./live-app";
import "../live.css";

export async function generateMetadata({
  params,
}: PageProps<"/live/[slug]">): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  return {
    title: event ? `现场 · ${event.title}` : "现场",
    robots: { index: false },
  };
}

export default function LivePage({ params }: PageProps<"/live/[slug]">) {
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
        <LiveShell slug={slug} />
      ))}
    </Suspense>
  );
}

async function LiveShell({ slug }: { slug: string }) {
  const event = await getEvent(slug);
  if (!event) notFound();
  return <LiveApp slug={slug} title={eventCopy(event).title} />;
}
