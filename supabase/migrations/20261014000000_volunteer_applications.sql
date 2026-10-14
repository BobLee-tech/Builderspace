-- 志愿者申请：核心团队职位申请，官网 /volunteer 提交，运营在 Supabase 后台看 ------
-- 和加入表单（join_submissions）是两张表：加入表单收的是意向成员，这里收的是
-- 想参与核心团队的人，需要联系、筛选，所以多了联系方式和处理状态。
-- 不收学生证和 zID。

create type volunteer_status as enum
  ('new', 'contacted', 'interviewing', 'accepted', 'declined');

create table volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 1 and 40),
  -- WeChat ID or email: the only way to reach the applicant.
  contact text not null check (char_length(contact) between 1 and 120),
  school_degree text not null check (char_length(school_degree) between 1 and 80),
  -- The eleven positions in three departments; keys match VOLUNTEER_POSITIONS.
  positions text[] not null
    check (
      cardinality(positions) >= 1
      and positions <@ array[
        'events', 'content', 'design_media', 'partnerships', 'recruiting',
        'product', 'web_tools', 'teaching', 'tech_explore',
        'secretary', 'finance'
      ]
    ),
  weekly_hours weekly_hours not null,
  about text not null check (char_length(about) between 1 and 500),
  portfolio_url text check (char_length(portfolio_url) <= 300 and portfolio_url ~ '^https?://'),
  -- ?ref= or utm_source on the link the applicant came in by.
  channel text check (channel ~ '^[a-z0-9_-]{1,40}$'),
  data_consent boolean not null check (data_consent),
  created_at timestamptz not null default now(),
  -- Ops columns: edited in the dashboard, never written by the public form.
  status volunteer_status not null default 'new',
  ops_notes text check (char_length(ops_notes) <= 1000)
);

alter table volunteer_applications enable row level security;

create policy "public submits volunteer applications" on volunteer_applications
  for insert to anon, authenticated
  with check (status = 'new' and ops_notes is null);

create trigger volunteer_applications_throttle before insert on volunteer_applications
  for each row execute function throttle_public_inserts('10');

-- Grants ----------------------------------------------------------------
-- Visitors can write the applicant-facing columns and nothing else: no read
-- back, and not the two ops columns even if a request names them.
revoke all on volunteer_applications from anon, authenticated;
grant insert (
  nickname, contact, school_degree, positions, weekly_hours, about,
  portfolio_url, channel, data_consent
) on volunteer_applications to anon, authenticated;
