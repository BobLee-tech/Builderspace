-- 近 7 天提交数改用一条一页的请求来数 ---------------------------------------------------
-- 20261108000000_project_repos.sql 用 per_page=100 拉完整的提交列表只为数个数，一个回应
-- 可达几百 KB，还在 net._http_response 里留 6 小时。现在每页只要 1 条，从 Link 头里
-- rel="last" 的页码读出总数，没有 Link 头（0 或 1 条）就数回应本身。上限仍是 100。
-- 只换两个函数，表和权限不变；上线前后跑都行，旧请求（per_page=100）的回应也读得对。

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
  commits_headers jsonb;
  commits_link text;
  last_url text;
  last_page int;
  page_size int;
  body jsonb;
begin
  if r.repo_req is not null then
    select true, status_code, content, timed_out, error_msg
    into repo_found, repo_status, repo_body, repo_timed_out, repo_error
    from net._http_response where id = r.repo_req;
  end if;
  if r.commits_req is not null then
    select status_code, content, headers into commits_status, commits_body, commits_headers
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
    -- More than one page: the rel="last" link says how many pages there are,
    -- so there are at least (last - 1) full pages plus one more commit.
    select value into commits_link
    from jsonb_each_text(coalesce(commits_headers, '{}')) where lower(key) = 'link' limit 1;
    last_url := (regexp_match(commits_link, '<([^>]*)>;\s*rel="last"'))[1];
    last_page := (regexp_match(last_url, '[?&]page=(\d{1,6})(?:&|$)'))[1]::int;
    page_size := coalesce((regexp_match(last_url, '[?&]per_page=(\d{1,3})(?:&|$)'))[1]::int, 30);
    update project_repos
    set commits_7d = least(greatest(jsonb_array_length(body), coalesce((last_page - 1) * page_size + 1, 0)), 100),
        commits_at = r.requested_at
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
      -- One commit a page: the count comes from the Link header.
      commits_req = net.http_get(
        url := 'https://api.github.com/repos/' || pr.repo || '/commits',
        params := jsonb_build_object('since', since, 'per_page', '1'),
        headers := headers,
        timeout_milliseconds := 10000
      ),
      requested_at = now()
  where pr.project_id in (select project_id from project_repos order by project_id limit 200);
end;
$$;
revoke all on function github_sync_run() from public, anon, authenticated;
