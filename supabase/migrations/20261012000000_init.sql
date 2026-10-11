-- BuilderSpace v0 schema · PRD v0.5 §4
-- Ops edit content in the Supabase table editor; the site only reads published rows.
-- Public visitors can insert join submissions and project drafts, never read them back.

create extension if not exists pgcrypto;

create type event_kind as enum ('workshop', 'build_night', 'demo_night', 'online', 'other');
create type project_status as enum ('recruiting', 'building', 'demoed', 'paused');
create type review_status as enum ('pending', 'approved', 'rejected');
create type update_kind as enum ('commit', 'demo', 'post');
create type weekly_hours as enum ('lt2', '2to5', 'gt5');
create type pick_kind as enum ('news', 'campus_event');

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 活动页 ---------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  kind event_kind not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  location text not null,
  summary text,
  signup_url text,
  capacity integer check (capacity > 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_starts_at_idx on events (starts_at) where published;
create trigger events_updated_at before update on events
  for each row execute function set_updated_at();

-- 项目广场 -------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 60),
  problem text not null check (char_length(problem) <= 280),
  target_user text not null check (char_length(target_user) <= 80),
  status project_status not null default 'recruiting',
  needed_roles text[] not null default '{}'
    check (needed_roles <@ array['frontend', 'backend', 'design', 'product', 'tester']),
  next_step text check (char_length(next_step) <= 280),
  -- Shown publicly; the submitter chooses what to share (e.g. a WeChat ID).
  contact text not null check (char_length(contact) <= 120),
  owner_name text not null check (char_length(owner_name) <= 40),
  repo_url text,
  demo_url text,
  review_status review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_public_idx on projects (status) where review_status = 'approved';
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

-- 项目进展更新：北极星指标的数据来源
create table project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  kind update_kind not null,
  body text not null check (char_length(body) <= 500),
  url text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index project_updates_project_idx on project_updates (project_id, occurred_at desc);

-- 双周活跃项目数：过去 14 天有代码提交、Demo 或更新帖任一的公开项目
create view biweekly_active_projects with (security_invoker = true) as
select count(distinct u.project_id)::int as active_projects
from project_updates u
join projects p on p.id = u.project_id and p.review_status = 'approved'
where u.occurred_at > now() - interval '14 days';

-- 教程资料 -------------------------------------------------------------
create table tutorials (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events (id) on delete set null,
  title text not null,
  summary text,
  slides_url text,
  repo_url text,
  recording_url text,
  published_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- 每周精选：只写摘要，必须有来源和日期
create table weekly_picks (
  id uuid primary key default gen_random_uuid(),
  kind pick_kind not null,
  title text not null,
  summary text not null check (char_length(summary) <= 400),
  source_name text not null,
  source_url text not null,
  picked_on date not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- 加入表单：不收 zID 和学生证 ---------------------------------------------
create table join_submissions (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 1 and 40),
  school_degree text not null check (char_length(school_degree) <= 80),
  major text not null check (char_length(major) <= 80),
  skills text[] not null default '{}'
    check (skills <@ array['frontend', 'backend', 'design', 'product', 'beginner']),
  idea text check (char_length(idea) <= 500),
  weekly_hours weekly_hours not null,
  referral_source text not null check (char_length(referral_source) <= 40),
  showcase_consent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row level security ----------------------------------------------------
alter table events enable row level security;
alter table projects enable row level security;
alter table project_updates enable row level security;
alter table tutorials enable row level security;
alter table weekly_picks enable row level security;
alter table join_submissions enable row level security;

create policy "public reads published events" on events
  for select to anon, authenticated using (published);

create policy "public reads approved projects" on projects
  for select to anon, authenticated using (review_status = 'approved');

create policy "public submits project drafts" on projects
  for insert to anon, authenticated with check (review_status = 'pending');

create policy "public reads updates of approved projects" on project_updates
  for select to anon, authenticated using (
    exists (select 1 from projects p where p.id = project_id and p.review_status = 'approved')
  );

create policy "public reads published tutorials" on tutorials
  for select to anon, authenticated using (published);

create policy "public reads published picks" on weekly_picks
  for select to anon, authenticated using (published);

create policy "public submits join form" on join_submissions
  for insert to anon, authenticated with check (true);
