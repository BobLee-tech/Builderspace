import { Suspense } from "react";
import { StarFeed } from "@/components/card-star";
import { ProjectCard } from "@/components/project-card";
import { getMyStars, getSession } from "@/lib/auth";
import type { Project } from "@/lib/types";
import { ProjectPlaza } from "./project-plaza";

/** The filterable project grid, shared by the home page and /projects. */
export function Plaza({ projects }: { projects: Project[] }) {
  // Cards render on the server; the client plaza only filters and lays them out.
  const cards = Object.fromEntries(
    projects.map((p) => [p.slug, <ProjectCard key={p.slug} project={p} />]),
  );
  return (
    <>
      <ProjectPlaza
        projects={projects.map(({ slug, status, neededRoles, starCount }) => ({
          slug,
          status,
          neededRoles,
          starCount,
        }))}
        cards={cards}
      />
      <Suspense>
        <MyStars />
      </Suspense>
    </>
  );
}

/** This visitor's own stars, streamed into the prerendered cards. */
async function MyStars() {
  const [session, stars] = await Promise.all([getSession(), getMyStars()]);
  return (
    <StarFeed
      viewer={session?.member ? "member" : session ? "no-card" : "guest"}
      starred={stars.map((s) => s.slug)}
    />
  );
}
