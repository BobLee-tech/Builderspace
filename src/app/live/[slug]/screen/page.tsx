import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEvent } from "@/lib/data";
import { eventCopy } from "@/lib/event-pages";
import { ScreenApp } from "./screen-app";
import "../../live.css";

export async function generateMetadata({
  params,
}: PageProps<"/live/[slug]/screen">): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  return {
    title: event ? `投影屏 · ${event.title}` : "投影屏",
    robots: { index: false },
  };
}

export default function ScreenPage({
  params,
}: PageProps<"/live/[slug]/screen">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <ScreenShell slug={slug} />
      ))}
    </Suspense>
  );
}

async function ScreenShell({ slug }: { slug: string }) {
  const event = await getEvent(slug);
  if (!event) notFound();
  return <ScreenApp slug={slug} title={eventCopy(event).title} />;
}
