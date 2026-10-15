-- 评论表的访问权限补齐 ------------------------------------------------------------
-- 线上跑完 20261015050000 之后，anon 读 project_comments 报 42501（permission denied），
-- 项目广场的评论数查询失败，Vercel 构建停在 /sitemap.xml。那次迁移里的授权没有生效
-- （原因没查清，可能只执行了文件的一部分），这里把权限、访问规则和节流按原样再设
-- 一遍。全部可以重复执行，前后顺序也不影响：已经生效的部分重跑不会有变化。

grant usage on schema public to anon, authenticated;

revoke all on project_comments from anon, authenticated;
grant select on project_comments to anon, authenticated;
grant insert (project_id, parent_id, kind, nickname, body)
  on project_comments to anon, authenticated;

grant select on project_comments to hub_site_admin;
grant update (deleted_at, is_owner) on project_comments to hub_site_admin;

alter table project_comments enable row level security;

create or replace function project_comment_open_thread(thread uuid, project uuid) returns boolean
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

drop policy if exists "public reads comments on approved projects" on project_comments;
create policy "public reads comments on approved projects" on project_comments
  for select to anon, authenticated using (
    deleted_at is null
    and exists (select 1 from projects p where p.id = project_id and p.review_status = 'approved')
  );

-- Same as in 20261015060000 (no `not is_owner`: visitors have no grant on that
-- column, and the owner trigger there sets it), so running this file again after
-- that one changes nothing.
drop policy if exists "public comments on approved projects" on project_comments;
create policy "public comments on approved projects" on project_comments
  for insert to anon, authenticated with check (
    deleted_at is null
    and exists (select 1 from projects p where p.id = project_id and p.review_status = 'approved')
    and (parent_id is null or project_comment_open_thread(parent_id, project_id))
  );

drop policy if exists "hub reads project comments" on project_comments;
create policy "hub reads project comments" on project_comments
  for select to hub_site_admin using (true);
drop policy if exists "hub moderates project comments" on project_comments;
create policy "hub moderates project comments" on project_comments
  for update to hub_site_admin using (true) with check (true);

drop trigger if exists project_comments_throttle on project_comments;
create trigger project_comments_throttle before insert on project_comments
  for each row execute function throttle_public_inserts('20');

-- The Data API caches the schema; make it pick up the grants now.
notify pgrst, 'reload schema';
