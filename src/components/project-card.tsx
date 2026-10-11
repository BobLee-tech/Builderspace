import Link from "next/link";
import { formatShortDate } from "@/lib/format";
import { ROLE_LABEL, STATUS_LABEL, type Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className={`pcard ${project.status === "paused" ? "paused" : ""}`}
    >
      <div className="pcard-top">
        <span
          className={`tag ${project.status === "recruiting" ? "fill" : ""}`}
        >
          {STATUS_LABEL[project.status]}
        </span>
        <span className="mono mute">{project.targetUser}</span>
      </div>
      <h3>{project.name}</h3>
      <p className="prob">{project.problem}</p>
      {project.neededRoles.length > 0 && (
        <div>
          <span className="mono mute">缺</span>
          <div className="need">
            {project.neededRoles.map((role) => (
              <span key={role} className="tag dash">
                {ROLE_LABEL[role]}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="pcard-foot">
        <span>{project.ownerName}</span>
        <span className="mono">
          更新于 {formatShortDate(project.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
