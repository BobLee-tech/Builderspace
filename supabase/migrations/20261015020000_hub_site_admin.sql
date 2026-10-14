-- Hub 后台直连用的数据库账号 ------------------------------------------------
-- 社团内部工具 BuilderSpace Hub 的「官网」后台用这个角色直连本库：审核项目卡和
-- 项目进展、跟进志愿者申请、查看加入登记。它只能读下面四张表，只能改审核状态、
-- 志愿者状态和备注这几列；不能新增或删除行，碰不到 auth、storage 和其他表。
-- 这样就不用把能做任何事的 service_role key 交给另一个系统。
--
-- 密码不写在迁移里。跑完迁移后在 SQL Editor 执行一次（换成新生成的长随机密码）：
--   alter role hub_site_admin with login password '<密码>';
-- 然后把 Connect → Transaction pooler 的连接串交给 Hub 的部署环境，用户名写成
-- hub_site_admin.<project ref>。要停用时：alter role hub_site_admin nologin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'hub_site_admin') then
    create role hub_site_admin nologin noinherit;
  end if;
end
$$;

-- A slow query from the Hub must never hold the website's database.
alter role hub_site_admin set statement_timeout = '10s';

grant usage on schema public to hub_site_admin;

grant select on projects, project_updates, volunteer_applications, join_submissions
  to hub_site_admin;
grant update (review_status) on projects, project_updates to hub_site_admin;
grant update (status, ops_notes) on volunteer_applications to hub_site_admin;

-- RLS is on for all four tables. These policies let the role see every row;
-- what it may change is limited by the column grants above.
drop policy if exists "hub reads projects" on projects;
create policy "hub reads projects" on projects
  for select to hub_site_admin using (true);
drop policy if exists "hub reviews projects" on projects;
create policy "hub reviews projects" on projects
  for update to hub_site_admin using (true) with check (true);

drop policy if exists "hub reads project updates" on project_updates;
create policy "hub reads project updates" on project_updates
  for select to hub_site_admin using (true);
drop policy if exists "hub reviews project updates" on project_updates;
create policy "hub reviews project updates" on project_updates
  for update to hub_site_admin using (true) with check (true);

drop policy if exists "hub reads volunteer applications" on volunteer_applications;
create policy "hub reads volunteer applications" on volunteer_applications
  for select to hub_site_admin using (true);
drop policy if exists "hub follows up volunteer applications" on volunteer_applications;
create policy "hub follows up volunteer applications" on volunteer_applications
  for update to hub_site_admin using (true) with check (true);

drop policy if exists "hub reads join submissions" on join_submissions;
create policy "hub reads join submissions" on join_submissions
  for select to hub_site_admin using (true);
