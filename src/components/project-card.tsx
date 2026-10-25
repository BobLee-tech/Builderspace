import {
  ChatCircle,
  ClockCounterClockwise,
  Star,
  User,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { MemberCard } from "@/app/join/member-card";
import { formatShortDate } from "@/lib/format";
import { memberCode } from "@/lib/members";
import {
  NO_MEDIA,
  ROLE_LABEL,
  STATUS_LABEL,
  type OwnerCard,
  type Project,
  type ProjectEn,
  type ProjectMedia,
} from "@/lib/types";
import { CoverMedia } from "./project-media";
import { T, TranslatedMark } from "./t";

/** A text field in both languages; English falls back to the main field. */
export function projectText(
  project: Project,
  field: keyof ProjectEn,
): { zh: string | null; en: string | null } {
  return { zh: project[field], en: project.en?.[field] ?? project[field] };
}

/**
 * The card's one line: the pitch, or on projects from before pitches existed
 * the old intro, which the card clamps to two lines.
 */
export function pitchText(project: Project) {
  return projectText(project, project.pitch ? "pitch" : "problem");
}

/** The owner's member card in miniature, with their name and number. */
export function OwnerChip({ owner }: { owner: OwnerCard }) {
  const { card } = owner;
  return (
    <span className="owner-chip">
      <span className="owner-mini" aria-hidden>
        <MemberCard
          card={card}
          design={owner.design}
          flipped={false}
          still
          className="mini"
        />
      </span>
      <span>
        <b>{card.nickname}</b>
        {card.memberNo && (
          <small className="mono">{memberCode(card.memberNo)}</small>
        )}
      </span>
    </span>
  );
}

/** Stable small hash so a project always gets the same generative cover. */
export function coverSeed(s: string) {
  return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}

/**
 * The uploaded cover / demo video when there is one, otherwise a monochrome
 * pattern + outlined initials picked by slug; see .cover in motion.css.
 */
export function Cover({
  seed,
  label,
  media = NO_MEDIA,
}: {
  seed: string;
  label: string;
  media?: ProjectMedia;
}) {
  return (
    <div className="cover" data-v={coverSeed(seed) % 6}>
      <span className="ini" aria-hidden>
        {[...label].slice(0, 2).join("")}
      </span>
      <CoverMedia media={media} title={label} />
      <span className="id" aria-hidden>
        #{seed}
      </span>
    </div>
  );
}

export function StatusDot({ status }: { status: Project["status"] }) {
  return <i className={`st-dot st-${status}`} aria-hidden />;
}

// An <article> with the title link stretched over it, so the play button on
// the cover can be its own control instead of a button inside a link.
// `preview` renders the submit form's live card, which links nowhere.
export function ProjectCard({
  project,
  preview = false,
}: {
  project: Project;
  preview?: boolean;
}) {
  return (
    <article className={`pcard ${project.status === "paused" ? "paused" : ""}`}>
      <Cover seed={project.slug} label={project.name} media={project.media} />
      <div className="pcard-head">
        <div className="pcard-top">
          <span
            className={`tag ${project.status === "recruiting" ? "fill" : ""}`}
          >
            <StatusDot status={project.status} />
            <T {...STATUS_LABEL[project.status]} />
          </span>
          <span className="mono mute">
            <T {...projectText(project, "targetUser")} />
          </span>
        </div>
        <h3>
          {preview ? (
            project.name
          ) : (
            <Link href={`/projects/${project.slug}`} className="pcard-link">
              <T {...projectText(project, "name")} />
            </Link>
          )}
        </h3>
        <p className="prob">
          <T {...pitchText(project)} />
        </p>
      </div>
      {project.neededRoles.length > 0 && (
        <div className="pcard-need">
          <span className="mono mute need-k">
            <T zh="在寻找" en="Needs" />
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
        {project.owner ? (
          <OwnerChip owner={project.owner} />
        ) : (
          <span>
            <User weight="light" size={15} aria-hidden />
            {project.ownerName}
          </span>
        )}
        <span className="mono">
          {project.starCount > 0 && (
            <span className="pcard-cc">
              <Star weight="light" size={15} aria-hidden />
              {project.starCount}
              <span className="sr-only">
                <T zh="个 Star" en="stars" />
              </span>
            </span>
          )}
          {project.commentCount > 0 && (
            <span className="pcard-cc">
              <ChatCircle weight="light" size={15} aria-hidden />
              {project.commentCount}
              <span className="sr-only">
                <T zh="条评论" en="comments" />
              </span>
            </span>
          )}
          <ClockCounterClockwise weight="light" size={15} aria-hidden />
          {preview ? (
            <T zh="刚刚" en="Just now" />
          ) : (
            <>
              <T zh="更新于" en="Updated" />{" "}
              {formatShortDate(project.updatedAt)}
            </>
          )}
        </span>
      </div>
      <TranslatedMark lang={project.translated} className="pcard-tr" />
    </article>
  );
}
