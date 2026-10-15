-- 项目评论区 --------------------------------------------------------------------
-- 公开项目的详情页下面可以留言，分想加入、建议、提问三类，可以回复一层。
-- 不用审核，发出去就公开。运营在后台（Hub 或 Table Editor）把 deleted_at 填上
-- 时间就算删除，清空就恢复。「发起人」标记 is_owner 也只有后台能改，访客写不了。
-- 新评论不逐条发邮件，只算进每日汇总。

create type comment_kind as enum ('join', 'idea', 'ask');

create table project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  -- Replies go one level deep, under a top-level comment of the same project.
  parent_id uuid references project_comments (id) on delete cascade,
  -- Top-level comments pick a kind; replies belong to their thread instead.
  kind comment_kind,
  nickname text not null check (char_length(nickname) between 1 and 40),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  -- Ops columns: set in the Hub or the dashboard, never by the public form.
  is_owner boolean not null default false,
  deleted_at timestamptz,
  constraint project_comments_kind_on_top check ((parent_id is null) = (kind is not null))
);
create index project_comments_project_idx on project_comments (project_id, created_at);
create index project_comments_parent_idx on project_comments (parent_id)
  where parent_id is not null;
-- The insert throttle and the daily digest both count the last minutes / hours.
create index project_comments_created_idx on project_comments (created_at);

alter table project_comments enable row level security;

create policy "public reads comments on approved projects" on project_comments
  for select to anon, authenticated using (
    deleted_at is null
    and exists (select 1 from projects p where p.id = project_id and p.review_status = 'approved')
  );

-- A reply must point at a live top-level comment of the same project, so nobody
-- can reply under a deleted comment or nest deeper than one level. A policy
-- can't query its own table (Postgres reports infinite recursion), hence the
-- security-definer helper; it only answers yes / no for ids already public.
create function project_comment_open_thread(thread uuid, project uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from project_comments c
    where c.id = thread
      and c.project_id = project
      and c.parent_id is null
      and c.deleted_at is null
  );
$$;
revoke all on function project_comment_open_thread(uuid, uuid) from public;
grant execute on function project_comment_open_thread(uuid, uuid) to anon, authenticated;

create policy "public comments on approved projects" on project_comments
  for insert to anon, authenticated with check (
    deleted_at is null
    and not is_owner
    and exists (select 1 from projects p where p.id = project_id and p.review_status = 'approved')
    and (parent_id is null or project_comment_open_thread(parent_id, project_id))
  );

create trigger project_comments_throttle before insert on project_comments
  for each row execute function throttle_public_inserts('20');

-- Grants ----------------------------------------------------------------------
-- Visitors read what RLS shows them and write the comment itself, never the
-- two ops columns.
revoke all on project_comments from anon, authenticated;
grant select on project_comments to anon, authenticated;
grant insert (project_id, parent_id, kind, nickname, body)
  on project_comments to anon, authenticated;

-- The Hub deletes / restores comments and marks the owner's replies.
grant select on project_comments to hub_site_admin;
grant update (deleted_at, is_owner) on project_comments to hub_site_admin;

create policy "hub reads project comments" on project_comments
  for select to hub_site_admin using (true);
create policy "hub moderates project comments" on project_comments
  for update to hub_site_admin using (true) with check (true);

-- Daily digest: new comments, and the projects they landed on ----------------
-- Same as 20261015040000 plus the comment lines; the core-team wording follows
-- the site, which no longer says "volunteer".
create or replace function ops_daily_digest() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  joins int;
  supporters int;
  volunteers_new int;
  projects_pending int;
  updates_pending int;
  comments_new int;
  comment_projects text;
begin
  select count(*), count(*) filter (where affiliation_support)
    into joins, supporters
    from join_submissions
    where created_at > now() - interval '24 hours';
  select count(*) into volunteers_new from volunteer_applications where status = 'new';
  select count(*) into projects_pending from projects where review_status = 'pending';
  select count(*) into updates_pending from project_updates where review_status = 'pending';
  select count(*) into comments_new
    from project_comments
    where created_at > now() - interval '24 hours' and deleted_at is null;
  select string_agg(format('%s %s 条', ops_plain(name, 40), n), '、' order by n desc, name)
    into comment_projects
    from (
      select p.name, count(*) as n
      from project_comments c
      join projects p on p.id = c.project_id
      where c.created_at > now() - interval '24 hours' and c.deleted_at is null
      group by p.name
      order by n desc, p.name
      limit 5
    ) busiest;

  if joins + volunteers_new + projects_pending + updates_pending + comments_new = 0 then
    return;
  end if;
  perform ops_notify(
    format('[BuilderSpace] 每日汇总 · %s', to_char(now() at time zone 'Australia/Sydney', 'MM-DD')),
    format(
      E'过去 24 小时新报名：%s 人（其中支持社团申请 %s 人）\n过去 24 小时新评论：%s 条%s\n未处理的核心成员申请：%s\n待审核：项目卡 %s · 进展 %s\n\n评论不用审核，要删除的在 project_comments 里填 deleted_at。\n去后台处理：%s',
      joins, supporters,
      comments_new, coalesce('（' || comment_projects || '）', ''),
      volunteers_new, projects_pending, updates_pending,
      'https://supabase.com/dashboard/project/lkvobwcqucngandunabd/editor'
    )
  );
end;
$$;

revoke all on function ops_daily_digest() from public, anon, authenticated;
