import { ProjectCard } from "@/components/project-card";
import type { Project } from "@/lib/types";
import { ProjectPlaza } from "./project-plaza";

/** The filterable project grid, shared by the home page and /projects. */
export function Plaza({ projects }: { projects: Project[] }) {
  // Cards render on the server; the client plaza only filters and lays them out.
  const cards = Object.fromEntries(
    projects.map((p) => [p.slug, <ProjectCard key={p.slug} project={p} />]),
  );
  return (
    <ProjectPlaza
      projects={projects.map(({ slug, status, neededRoles }) => ({
        slug,
        status,
        neededRoles,
      }))}
      cards={cards}
    />
  );
}
