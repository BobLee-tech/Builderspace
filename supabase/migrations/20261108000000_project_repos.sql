-- 项目的 GitHub 仓库信息 -------------------------------------------------------------
-- 公开项目的 repo_url 是 github.com/<owner>/<repo> 时，每小时读一次 GitHub 公开 API：
-- star 数、主要语言、最近推送、近 7 天默认分支的提交数，存在 project_repos，项目页标题区
-- 显示。只读公开仓库；私有、删了、改名的仓库（404）不显示。
-- pg_net 的请求是异步的：每一轮先收上一轮的回应（net._http_response 默认留 6 小时），
-- 再发这一轮的请求，所以页面上的数据最多晚两个小时。
-- GitHub token 选填，放 Vault（只读公开仓库、不给任何权限的 fine-grained token 就够）：
--   select vault.create_secret('github_pat_…', 'github_token');
-- 没有 token 时匿名请求，GitHub 给每个 IP 每小时 60 次，每个项目每轮用 2 次。
-- 依赖 20261029010000_projects_column_grants.sql（visitors 按列读 projects）。

create table project_repos (
  project_id uuid primary key references projects (id) on delete cascade,
  -- owner/repo, as github_repo_of() reads it from projects.repo_url.
  repo text not null check (repo ~ '^[A-Za-z0-9-]{1,39}/[A-Za-z0-9._-]{1,100}$'),
  stars int check (stars >= 0),
  language text check (char_length(language) <= 40),
  pushed_at timestamptz,
  archived boolean not null default false,
  -- Commits on the default branch in the 7 days before commits_at; capped at 100.
  commits_7d int check (commits_7d between 0 and 100),
  commits_at timestamptz,
  -- Last time GitHub answered for this repo. Null until then, and again once
  -- the repo is gone; the page only shows rows that have it.
  synced_at timestamptz,
  -- The last failed reply ("HTTP 403", "timeout" …); the stats stay as they were.
  sync_error text check (char_length(sync_error) <= 200),
  -- pg_net request ids from the last run, read back on the next one.
  repo_req bigint,
  commits_req bigint,
  requested_at timestamptz
);

alter table project_repos enable row level security;

create policy "public reads repos of approved projects" on project_repos
  for select to anon, authenticated using (
    synced_at is not null
    and exists (select 1 from projects p where p.id = project_id and p.review_status = 'approved')
  );

-- owner/repo from a GitHub repo link, or null for anything else (a profile, an
-- org page, another host). Trailing `.git`, paths and queries are dropped.
create or replace function github_repo_of(url text) returns text
language sql
immutable
set search_path = public
as $$
  select m[1] || '/' || regexp_replace(m[2], '\.git$', '')
  from regexp_match(
    coalesce(url, ''),
    '^https?://(?:www\.)?github\.com/([A-Za-z0-9-]{1,39})/([A-Za-z0-9._-]{1,100})(?:[/?#].*)?$'
  ) as m
  where m[1] not in ('orgs', 'settings', 'topics', 'collections', 'marketplace', 'sponsors')
    and regexp_replace(m[2], '\.git$', '') not in ('', '.', '..');
$$;

-- Fold GitHub's replies into a row. Only called by github_sync_run().
create or replace function github_sync_apply(r project_repos) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  repo_found boolean := false;
  repo_status int;
  repo_body text;
  repo_timed_out boolean;
  repo_error text;
  commits_status int;
  commits_body text;
  body jsonb;
begin
  if r.repo_req is not null then
    select true, status_code, content, timed_out, error_msg
    into repo_found, repo_status, repo_body, repo_timed_out, repo_error
    from net._http_response where id = r.repo_req;
  end if;
  if r.commits_req is not null then
    select status_code, content into commits_status, commits_body
    from net._http_response where id = r.commits_req;
  end if;

  if repo_status = 200 then
    body := repo_body::jsonb;
    if coalesce((body ->> 'private')::boolean, false) then
      update project_repos
      set stars = null, language = null, pushed_at = null, commits_7d = null,
          commits_at = null, synced_at = null, sync_error = 'private'
      where project_id = r.project_id;
      return;
    end if;
    update project_repos
    set stars = greatest((body ->> 'stargazers_count')::int, 0),
        language = left(body ->> 'language', 40),
        pushed_at = (body ->> 'pushed_at')::timestamptz,
        archived = coalesce((body ->> 'archived')::boolean, false),
        synced_at = now(),
        sync_error = null
    where project_id = r.project_id;
  elsif repo_status in (301, 404, 451) then
    -- Moved, deleted, private or blocked: stop showing it.
    update project_repos
    set stars = null, language = null, pushed_at = null, commits_7d = null,
        commits_at = null, synced_at = null, sync_error = format('HTTP %s', repo_status)
    where project_id = r.project_id;
    return;
  elsif r.repo_req is not null then
    update project_repos
    set sync_error = case
      when not coalesce(repo_found, false) then 'no reply'
      when repo_timed_out then 'timeout'
      when repo_status is null then left(coalesce(repo_error, 'failed'), 200)
      else format('HTTP %s', repo_status)
    end
    where project_id = r.project_id;
  end if;

  if commits_status = 200 then
    body := commits_body::jsonb;
    update project_repos
    set commits_7d = least(jsonb_array_length(body), 100), commits_at = r.requested_at
    where project_id = r.project_id and jsonb_typeof(body) = 'array';
  elsif commits_status = 409 then
    -- An empty repository.
    update project_repos set commits_7d = 0, commits_at = r.requested_at
    where project_id = r.project_id;
  end if;
exception when others then
  raise warning 'github_sync_apply % failed: %', r.repo, sqlerrm;
  update project_repos set sync_error = left(sqlerrm, 200) where project_id = r.project_id;
end;
$$;
revoke all on function github_sync_apply(project_repos) from public, anon, authenticated;

-- One hourly run: read the last run's replies, line the rows up with the
-- approved projects' repo links, then ask GitHub again.
create or replace function github_sync_run() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r project_repos;
  token text;
  headers jsonb;
  since text := to_char((now() - interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
begin
  for r in select * from project_repos where repo_req is not null or commits_req is not null loop
    perform github_sync_apply(r);
  end loop;
  update project_repos set repo_req = null, commits_req = null
  where repo_req is not null or commits_req is not null;

  -- A link that changed or went away takes its stats with it.
  delete from project_repos pr
  where not exists (
    select 1 from projects p
    where p.id = pr.project_id and p.review_status = 'approved'
      and github_repo_of(p.repo_url) = pr.repo
  );
  insert into project_repos (project_id, repo)
  select p.id, github_repo_of(p.repo_url)
  from projects p
  where p.review_status = 'approved' and github_repo_of(p.repo_url) is not null
  on conflict (project_id) do nothing;

  select decrypted_secret into token
  from vault.decrypted_secrets where name = 'github_token' limit 1;
  headers := jsonb_build_object(
    'Accept', 'application/vnd.github+json',
    'X-GitHub-Api-Version', '2022-11-28',
    'User-Agent', 'BuilderSpace (builderspace.dev)'
  );
  if nullif(trim(token), '') is not null then
    headers := headers || jsonb_build_object('Authorization', 'Bearer ' || trim(token));
  end if;

  update project_repos pr
  set repo_req = net.http_get(
        url := 'https://api.github.com/repos/' || pr.repo,
        headers := headers,
        timeout_milliseconds := 10000
      ),
      commits_req = net.http_get(
        url := 'https://api.github.com/repos/' || pr.repo || '/commits',
        params := jsonb_build_object('since', since, 'per_page', '100'),
        headers := headers,
        timeout_milliseconds := 10000
      ),
      requested_at = now()
  where pr.project_id in (select project_id from project_repos order by project_id limit 200);
end;
$$;
revoke all on function github_sync_run() from public, anon, authenticated;

select cron.schedule('github-sync', '17 * * * *', 'select public.github_sync_run()');

-- Grants ----------------------------------------------------------------------
-- New tables get no API privileges by default on this project. Visitors read
-- the stats, not the request bookkeeping or the errors.
revoke all on project_repos from anon, authenticated;
grant select (project_id, repo, stars, language, pushed_at, archived, commits_7d, commits_at, synced_at)
  on project_repos to anon, authenticated;

grant select on project_repos to hub_site_admin;
create policy "hub reads project repos" on project_repos
  for select to hub_site_admin using (true);

notify pgrst, 'reload schema';
