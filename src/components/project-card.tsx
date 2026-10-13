import { User, ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { formatShortDate } from "@/lib/format";
import { ROLE_LABEL, STATUS_LABEL, type Project } from "@/lib/types";
import { T } from "./t";

/** Stable small hash so a project always gets the same generative cover. */
function hash(s: string) {
  return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}

/** Monochrome pattern + outlined initials, picked by slug; see .cover in motion.css. */
export function Cover({ seed, label }: { seed: string; label: string }) {
  return (
    <div className="cover" data-v={hash(seed) % 6} aria-hidden>
      <span className="ini">{[...label].slice(0, 2).join("")}</span>
      <span className="id">#{seed}</span>
    </div>
  );
}

export function StatusDot({ status }: { status: Project["status"] }) {
  return <i className={`st-dot st-${status}`} aria-hidden />;
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className={`pcard ${project.status === "paused" ? "paused" : ""}`}
    >
      <Cover seed={project.slug} label={project.name} />
      <div className="pcard-head">
        <div className="pcard-top">
          <span
            className={`tag ${project.status === "recruiting" ? "fill" : ""}`}
          >
            <StatusDot status={project.status} />
            <T {...STATUS_LABEL[project.status]} />
          </span>
          <span className="mono mute">{project.targetUser}</span>
        </div>
        <h3>{project.name}</h3>
        <p className="prob">{project.problem}</p>
      </div>
      {project.neededRoles.length > 0 && (
        <div className="pcard-need">
          <span className="mono mute need-k">
            <T zh="缺" en="Needs" />
          </span>
          <div className="need">
            {project.neededRoles.map((role) => (
              <span key={role} className="tag dash">
                <T {...ROLE_LABEL[role]} />
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="pcard-foot">
        <span>
          <User weight="light" size={15} aria-hidden />
          {project.ownerName}
        </span>
        <span className="mono">
          <ClockCounterClockwise weight="light" size={15} aria-hidden />
          <T zh="更新于" en="Updated" /> {formatShortDate(project.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
