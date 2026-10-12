-- PRD v0.5 §4.2 项目进展更新：发起人可提交更新；运营能导出双周活跃项目数
-- PRD v0.5 §1.4 报名表里的 3 个验证问题，§6.5 按渠道链接参数归因

-- 项目进展更新 -----------------------------------------------------------
-- Rows ops add in the table editor stay approved by default; public submissions
-- must arrive as pending (enforced below) and only count once approved.
alter table project_updates
  add column review_status review_status not null default 'approved',
  add column submitted_by text check (char_length(submitted_by) <= 40);

drop policy "public reads updates of approved projects" on project_updates;

create policy "public reads approved updates of approved projects" on project_updates
  for select to anon, authenticated using (
    review_status = 'approved'
    and exists (select 1 from projects p where p.id = project_id and p.review_status = 'approved')
  );

create policy "public submits pending updates to approved projects" on project_updates
  for insert to anon, authenticated with check (
    review_status = 'pending'
    and exists (select 1 from projects p where p.id = project_id and p.review_status = 'approved')
  );

create or replace view biweekly_active_projects with (security_invoker = true) as
select count(distinct u.project_id)::int as active_projects
from project_updates u
join projects p on p.id = u.project_id and p.review_status = 'approved'
where u.review_status = 'approved'
  and u.occurred_at > now() - interval '14 days';

-- 运营导出：每周日 24:00（悉尼）时点的双周活跃项目数，本周取到当前为止
create view biweekly_active_projects_history with (security_invoker = true) as
with weeks as (
  select
    w::date as week_start,
    least((w + interval '7 days') at time zone 'Australia/Sydney', now()) as as_of
  from generate_series(
    date_trunc('week', (select min(occurred_at) from project_updates) at time zone 'Australia/Sydney'),
    date_trunc('week', now() at time zone 'Australia/Sydney'),
    interval '1 week'
  ) as w
),
approved_updates as (
  select u.project_id, u.occurred_at
  from project_updates u
  join projects p on p.id = u.project_id and p.review_status = 'approved'
  where u.review_status = 'approved'
)
select
  weeks.week_start,
  count(distinct a.project_id)::int as active_projects
from weeks
left join approved_updates a
  on a.occurred_at > weeks.as_of - interval '14 days'
  and a.occurred_at <= weeks.as_of
group by weeks.week_start
order by weeks.week_start desc;

-- 运营回访清单：每个公开项目最近一次进展，超过 14 天没动静的排在前面
create view project_activity with (security_invoker = true) as
select
  p.slug,
  p.name,
  p.status,
  p.owner_name,
  p.contact,
  max(u.occurred_at) filter (where u.review_status = 'approved') as last_update_at,
  count(u.id) filter (
    where u.review_status = 'approved' and u.occurred_at > now() - interval '14 days'
  )::int as updates_14d,
  count(u.id) filter (where u.review_status = 'pending')::int as pending_updates
from projects p
left join project_updates u on u.project_id = p.id
where p.review_status = 'approved'
group by p.id
order by last_update_at asc nulls first;

-- 加入表单 -------------------------------------------------------------
alter table join_submissions
  add column stalled_project boolean,
  add column blockers text[] not null default '{}'
    check (blockers <@ array['teammates', 'coding', 'time', 'idea', 'deploy', 'other']),
  -- ?ref= or utm_source on the join link, one per channel or admin QR.
  add column channel text check (channel ~ '^[a-z0-9_-]{1,40}$');

-- Grants ----------------------------------------------------------------
-- The two ops views stay dashboard-only; revoke in case the project still
-- auto-grants new relations to the API roles.
revoke all on biweekly_active_projects_history, project_activity from anon, authenticated;
grant insert on project_updates to anon, authenticated;
