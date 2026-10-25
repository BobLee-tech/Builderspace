-- 项目 Star ----------------------------------------------------------------------
-- 有成员卡的成员每个公开项目最多 Star 一次，可以取消。谁 Star 了谁不公开，各人只
-- 看得到自己的；公开的只有 projects.star_count，由触发器维护，访客和成员都写不了。
-- star_count 变化不算「项目有更新」，不改 updated_at，广场的「最近更新」排序不受影响。
-- 依赖 20261026000000_project_owners_and_pitch.sql（profiles 是成员卡）。

alter table projects
  add column star_count int not null default 0 check (star_count >= 0);
create index projects_star_count_idx on projects (star_count desc)
  where review_status = 'approved';

-- Submissions always start at zero, whatever the insert says. Done here rather
-- than in the insert policy so the policy stays as 20261026010000 wrote it.
create or replace function reset_project_star_count() returns trigger
language plpgsql
as $$
begin
  new.star_count := 0;
  return new;
end;
$$;
revoke all on function reset_project_star_count() from public, anon, authenticated;

create trigger projects_star_count_zero before insert on projects
  for each row execute function reset_project_star_count();

-- The star counter isn't an update to the project.
drop trigger projects_updated_at on projects;
create trigger projects_updated_at before update on projects
  for each row
  when (
    (to_jsonb(old) - '{star_count,updated_at}'::text[])
      is distinct from (to_jsonb(new) - '{star_count,updated_at}'::text[])
  )
  execute function set_updated_at();

-- Stars -----------------------------------------------------------------------
-- user_id points at profiles, so only members with a card can star.
create table project_stars (
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_stars_user_idx on project_stars (user_id, created_at desc);
-- The insert throttle counts the last minute.
create index project_stars_created_idx on project_stars (created_at);

alter table project_stars enable row level security;

create policy "members read their own stars" on project_stars
  for select to authenticated using (user_id = (select auth.uid()));

create policy "members star approved projects" on project_stars
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from projects p where p.id = project_id and p.review_status = 'approved')
  );

create policy "members take back their stars" on project_stars
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger project_stars_throttle before insert on project_stars
  for each row execute function throttle_public_inserts('60');

create or replace function count_project_stars() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update projects set star_count = star_count + 1 where id = new.project_id;
  else
    update projects set star_count = greatest(star_count - 1, 0) where id = old.project_id;
  end if;
  return null;
end;
$$;
revoke all on function count_project_stars() from public, anon, authenticated;

create trigger project_stars_count after insert or delete on project_stars
  for each row execute function count_project_stars();

-- Star or unstar by slug in one call; returns the new count. Runs as the
-- caller, so the policies above decide what's allowed.
create or replace function set_project_star(p_slug text, p_starred boolean) returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  pid uuid;
  n int;
begin
  select id into pid from projects where slug = p_slug and review_status = 'approved';
  if pid is null then
    raise exception 'project not found' using errcode = 'P0002';
  end if;
  if p_starred then
    insert into project_stars (project_id) values (pid) on conflict do nothing;
  else
    delete from project_stars where project_id = pid and user_id = (select auth.uid());
  end if;
  select star_count into n from projects where id = pid;
  return n;
end;
$$;
revoke all on function set_project_star(text, boolean) from public, anon;
grant execute on function set_project_star(text, boolean) to authenticated;

-- Grants ----------------------------------------------------------------------
-- New tables get no API privileges by default on this project.
revoke all on project_stars from anon, authenticated;
grant select, delete on project_stars to authenticated;
grant insert (project_id) on project_stars to authenticated;

grant select on project_stars to hub_site_admin;
create policy "hub reads project stars" on project_stars
  for select to hub_site_admin using (true);

notify pgrst, 'reload schema';
