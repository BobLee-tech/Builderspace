import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEvent } from "@/lib/data";
import { eventCopy } from "@/lib/event-pages";
import { HostApp } from "./host-app";
import "../../live.css";

export async function generateMetadata({
  params,
}: PageProps<"/live/[slug]/host">): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  return {
    title: event ? `现场主持 · ${event.title}` : "现场主持",
    robots: { index: false },
  };
}

export default function HostPage({ params }: PageProps<"/live/[slug]/host">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <HostShell slug={slug} />
      ))}
    </Suspense>
  );
}

async function HostShell({ slug }: { slug: string }) {
  const event = await getEvent(slug);
  if (!event) notFound();
  return <HostApp slug={slug} title={eventCopy(event).title} />;
}
