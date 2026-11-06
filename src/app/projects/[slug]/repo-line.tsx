import { GithubLogo, Star } from "@phosphor-icons/react/dist/ssr";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { formatShortDate } from "@/lib/format";
import type { RepoStats } from "@/lib/types";

/** One line under the hero: the public GitHub repo as of the last hourly sync. */
export function RepoLine({
  repo,
  url,
}: {
  repo: RepoStats;
  url: string | null;
}) {
  const name = (
    <>
      <GithubLogo size={15} weight="bold" aria-hidden />
      {repo.repo}
    </>
  );
  const commits =
    repo.commits7d === null
      ? null
      : repo.commits7d >= 100
        ? "100+"
        : String(repo.commits7d);
  return (
    <p
      className="d-repo mono"
      title="每小时从 GitHub 同步 · Synced from GitHub every hour"
    >
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="d-repo-name">
          {name}
        </a>
      ) : (
        <span className="d-repo-name">{name}</span>
      )}
      <span>
        <Star size={13} weight="fill" aria-label="Star" /> {repo.stars}
      </span>
      {commits !== null && (
        <span>
          <T zh={`7 天 ${commits} 次提交`} en={`${commits} commits / 7d`} />
        </span>
      )}
      {repo.language && <span>{repo.language}</span>}
      {repo.pushedAt && (
        <span>
          <T zh="推送于" en="Pushed" /> {formatShortDate(repo.pushedAt)}
        </span>
      )}
      {repo.archived && (
        <span>
          <T zh="已归档" en="Archived" />
        </span>
      )}
      <SampleNotice />
    </p>
  );
}
