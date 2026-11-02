-- 项目发起人的邮件提醒（issue #57 的 PR ②）----------------------------------------
-- 发起人提交项目卡时选两项提醒，之后在「我的」里随时改：
--   有人评论时：即时（默认）· 每日汇总 · 不提醒
--   有人 Star 时：每周汇总（默认）· 只在里程碑 · 不提醒
-- 审核通过或退回总是发一封。信发到发起人的登录邮箱（auth.users），表单里不填邮箱。
--
-- 怎么发：评论、Star、审核结果先由触发器写进 owner_outbox，不当场发；pg_cron 每
-- 5 分钟跑一次 owner_notify_run()，按项目合并后用 Resend 发纯文本信（和运营通知
-- 共用 Vault 里的 resend_api_key）。
--   - 即时：第一条评论后等 10 分钟，这 10 分钟里的评论合成一封；「想加入」排最前。
--     发起人自己的回复（is_owner）不算；发信前被删的评论不发。
--   - 每日汇总：悉尼时间每天早上 9 点；没有新评论就不发。
--   - 每周汇总：悉尼时间周一早上 9 点，写上一周新增 Star 和评论数；这周没人 Star
--     就不发。
--   - 里程碑：第 1、10、50、100 个 Star，下一轮就发；取消再点不会重复。发起人自己
--     Star 不算。
--   pg_cron 按 UTC 跑，悉尼有夏令时，所以每天 / 每周那两封在每轮里判断悉尼本地时间，
--   过了 9 点、今天（本周）还没跑过就跑，记在 owner_notify_runs。
--
-- 额度：Resend 免费套餐每天 100 封、每月 3000 封，登录验证码（Supabase Auth 的
-- SMTP）、运营通知、Hub 都在同一个账号里。所以：
--   - 提醒信 24 小时内最多 40 封（全站），给验证码留出余量；想改上限：
--       select vault.create_secret('60', 'owner_email_daily_cap');
--   - 每个人 24 小时内最多收 6 封。
--   超了不丢：信留在队列里，下一轮再试，到时候合进同一封。
--
-- 每封信底部有退订链接，只退这一个项目的这一类提醒（project_notify_prefs 里的
-- unsubscribe_token，不用登录）；信头带 List-Unsubscribe，邮箱客户端能一键退订。
--
-- 没存 resend_api_key 时什么都不发，队列攒着，存上以后补发（每人每天最多 6 封）。
-- 依赖 20261015040000_ops_email.sql（Vault、pg_net、pg_cron、ops_plain）、
-- 20261026000000_project_owners_and_pitch.sql（owner_id）、
-- 20261026030000_project_stars.sql（star_count）。

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Settings ----------------------------------------------------------------------
-- A project without a row gets the defaults. projects is readable by visitors,
-- so the settings and the unsubscribe token live here, readable by nobody but
-- the functions below.
create table project_notify_prefs (
  project_id uuid primary key references projects (id) on delete cascade,
  comments text not null default 'instant'
    check (comments in ('instant', 'daily', 'off')),
  stars text not null default 'weekly'
    check (stars in ('weekly', 'milestone', 'off')),
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  -- Highest star milestone already queued, so unstar + star doesn't repeat it.
  star_milestone int not null default 0,
  updated_at timestamptz not null default now()
);
alter table project_notify_prefs enable row level security;
revoke all on project_notify_prefs from anon, authenticated;

-- The row for a project, created with the defaults the first time it's needed.
create or replace function project_notify_row(pid uuid) returns project_notify_prefs
language plpgsql
security definer
set search_path = public
as $$
declare
  r project_notify_prefs;
begin
  insert into project_notify_prefs (project_id) values (pid) on conflict do nothing;
  select * into r from project_notify_prefs where project_id = pid;
  return r;
end;
$$;
revoke all on function project_notify_row(uuid) from public, anon, authenticated;

-- Queue and log -----------------------------------------------------------------
create table owner_outbox (
  id bigint generated always as identity primary key,
  project_id uuid not null references projects (id) on delete cascade,
  kind text not null check (kind in ('comment', 'star_milestone', 'approved', 'rejected')),
  comment_id uuid references project_comments (id) on delete cascade,
  milestone int,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  -- 'sent', or 'skipped' when nobody gets it (setting off, comment deleted,
  -- no owner).
  outcome text check (outcome in ('sent', 'skipped'))
);
create index owner_outbox_pending_idx on owner_outbox (project_id, created_at)
  where sent_at is null;
alter table owner_outbox enable row level security;
revoke all on owner_outbox from anon, authenticated;

create table owner_email_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  project_id uuid references projects (id) on delete set null,
  kind text not null,
  sent_at timestamptz not null default now()
);
create index owner_email_log_sent_idx on owner_email_log (sent_at);
create index owner_email_log_user_idx on owner_email_log (user_id, sent_at);
alter table owner_email_log enable row level security;
revoke all on owner_email_log from anon, authenticated;

-- When the daily / weekly digests last ran, as a Sydney date.
create table owner_notify_runs (
  job text primary key,
  last_day date not null
);
alter table owner_notify_runs enable row level security;
revoke all on owner_notify_runs from anon, authenticated;

-- Queueing ----------------------------------------------------------------------
create or replace function queue_comment_notice() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.is_owner and exists (
    select 1 from projects p where p.id = new.project_id and p.owner_id is not null
  ) then
    insert into owner_outbox (project_id, kind, comment_id)
    values (new.project_id, 'comment', new.id);
  end if;
  return null;
end;
$$;
revoke all on function queue_comment_notice() from public, anon, authenticated;

create trigger project_comments_queue_notice after insert on project_comments
  for each row execute function queue_comment_notice();

-- Runs after project_stars_count (triggers fire in name order), so star_count
-- already includes this star.
create or replace function queue_star_milestone() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p projects;
  done int;
begin
  select * into p from projects where id = new.project_id;
  if p.owner_id is null or p.owner_id = new.user_id
     or p.star_count not in (1, 10, 50, 100) then
    return null;
  end if;
  done := (project_notify_row(p.id)).star_milestone;
  if p.star_count > done then
    update project_notify_prefs set star_milestone = p.star_count where project_id = p.id;
    insert into owner_outbox (project_id, kind, milestone)
    values (p.id, 'star_milestone', p.star_count);
  end if;
  return null;
end;
$$;
revoke all on function queue_star_milestone() from public, anon, authenticated;

create trigger project_stars_queue_milestone after insert on project_stars
  for each row execute function queue_star_milestone();

-- Ops approve or reject in the Hub or the dashboard; the owner hears either way.
create or replace function queue_review_notice() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null
     and new.review_status in ('approved', 'rejected')
     and new.review_status is distinct from old.review_status then
    insert into owner_outbox (project_id, kind) values (new.id, new.review_status::text);
  end if;
  return null;
end;
$$;
revoke all on function queue_review_notice() from public, anon, authenticated;

create trigger projects_queue_review_notice after update of review_status on projects
  for each row execute function queue_review_notice();

-- Sending -----------------------------------------------------------------------
-- 'sent' | 'deferred' (no key yet, or over a cap: try again next round) |
-- 'skipped' (the owner has no email). Never raises.
create or replace function owner_send(
  p_project uuid,
  p_kind text,
  p_subject text,
  p_body text,
  -- 'comments' | 'stars' for the unsubscribe link; null for review mail.
  p_unsub text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  site constant text := 'https://www.builderspace.dev';
  api_key text;
  sender text;
  cap int;
  owner uuid;
  addr text;
  token uuid;
  unsub_url text;
  body text := p_body;
  headers jsonb := '{}'::jsonb;
begin
  select owner_id into owner from projects where id = p_project;
  select email into addr from auth.users where id = owner;
  if addr is null or addr not like '%@%' then
    return 'skipped';
  end if;

  select decrypted_secret into api_key
  from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if api_key is null then
    return 'deferred';
  end if;
  select coalesce(
    (select nullif(regexp_replace(decrypted_secret, '\D', '', 'g'), '')::int
     from vault.decrypted_secrets where name = 'owner_email_daily_cap' limit 1),
    40
  ) into cap;
  if (select count(*) from owner_email_log where sent_at > now() - interval '24 hours') >= cap
     or (select count(*) from owner_email_log
         where user_id = owner and sent_at > now() - interval '24 hours') >= 6 then
    return 'deferred';
  end if;
  select decrypted_secret into sender
  from vault.decrypted_secrets where name = 'ops_email_from' limit 1;

  if p_unsub is not null then
    token := (project_notify_row(p_project)).unsubscribe_token;
    unsub_url := format('%s/unsubscribe?t=%s&k=%s', site, token, p_unsub);
    headers := jsonb_build_object(
      'List-Unsubscribe', format('<%s/unsubscribe/one-click?t=%s&k=%s>', site, token, p_unsub),
      'List-Unsubscribe-Post', 'List-Unsubscribe=One-Click'
    );
    body := body || format(
      E'\n\n—\n%s\n%s\n在「我的」里改提醒设置 / All settings: %s/me',
      case p_unsub
        when 'comments' then '不想再收这个项目的评论提醒 / Stop comment emails for this project:'
        else '不想再收这个项目的 Star 提醒 / Stop star emails for this project:'
      end,
      unsub_url, site
    );
  else
    body := body || format(E'\n\n—\nBuilderSpace · %s', site);
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', coalesce(sender, 'BuilderSpace <notify@builderspace.dev>'),
      'to', jsonb_build_array(addr),
      'reply_to', 'hello@builderspace.dev',
      'subject', left(p_subject, 200),
      'text', left(body, 12000),
      'headers', headers
    )
  );
  insert into owner_email_log (user_id, project_id, kind) values (owner, p_project, p_kind);
  return 'sent';
exception when others then
  raise warning 'owner_send failed: %', sqlerrm;
  return 'deferred';
end;
$$;
revoke all on function owner_send(uuid, text, text, text, text) from public, anon, authenticated;

-- The comment lines of one email: "wants to join" first, then by time.
create or replace function owner_comment_lines(ids uuid[]) returns text
language sql
stable
security definer
set search_path = public
as $$
  with live as (
    select c.*,
      case
        when c.parent_id is not null then '回复 / Reply'
        when c.kind = 'join' then '想加入 / Wants to join'
        when c.kind = 'idea' then '建议 / Suggestion'
        else '提问 / Question'
      end as label
    from project_comments c
    where c.id = any(ids) and c.deleted_at is null
    order by (c.kind = 'join') desc nulls last, c.created_at
    limit 20
  )
  select string_agg(
    format(E'[%s] %s：\n%s', label, ops_plain(nickname, 40), ops_plain(body, 500)),
    E'\n\n' order by (kind = 'join') desc nulls last, created_at
  )
  from live;
$$;
revoke all on function owner_comment_lines(uuid[]) from public, anon, authenticated;

-- One email for the given pending comment rows of one project; marks them done
-- unless the send was deferred.
create or replace function owner_send_comments(pid uuid, row_ids bigint[], digest boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  site constant text := 'https://www.builderspace.dev';
  p projects;
  ids uuid[];
  live int;
  lines text;
  verdict text;
begin
  select * into p from projects where id = pid;
  select array_agg(comment_id) into ids from owner_outbox where id = any(row_ids);
  select count(*) into live from project_comments where id = any(ids) and deleted_at is null;
  if live = 0 then
    update owner_outbox set sent_at = now(), outcome = 'skipped' where id = any(row_ids);
    return;
  end if;
  lines := owner_comment_lines(ids);
  verdict := owner_send(
    pid,
    case when digest then 'comment_digest' else 'comment' end,
    format('「%s」有 %s 条新评论 · %s new comment%s',
      ops_plain(p.name, 60), live, live, case when live > 1 then 's' else '' end),
    format(
      E'%s「%s」有 %s 条新评论：\n\n%s%s\n\n去回复 / Reply: %s/projects/%s#talk\n\n%s new comment%s on %s.',
      case when digest then '过去一天，' else '' end,
      ops_plain(p.name, 60), live, lines,
      case when live > 20 then format(E'\n\n……还有 %s 条 / %s more', live - 20, live - 20) else '' end,
      site, p.slug,
      live, case when live > 1 then 's' else '' end, ops_plain(coalesce(p.name_en, p.name), 60)
    ),
    'comments'
  );
  if verdict <> 'deferred' then
    update owner_outbox
    set sent_at = now(), outcome = case when verdict = 'sent' then 'sent' else 'skipped' end
    where id = any(row_ids);
  end if;
end;
$$;
revoke all on function owner_send_comments(uuid, bigint[], boolean) from public, anon, authenticated;

-- Every 5 minutes.
create or replace function owner_notify_run() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  site constant text := 'https://www.builderspace.dev';
  sydney timestamp := now() at time zone 'Australia/Sydney';
  today date := (now() at time zone 'Australia/Sydney')::date;
  r record;
  verdict text;
begin
  -- One run at a time.
  if not pg_try_advisory_xact_lock(hashtext('owner_notify_run')) then
    return;
  end if;

  -- Nobody to tell: the project lost its owner, or the setting is off.
  update owner_outbox o set sent_at = now(), outcome = 'skipped'
  from projects p
  left join project_notify_prefs s on s.project_id = p.id
  where o.sent_at is null and p.id = o.project_id
    and (p.owner_id is null
      or (o.kind = 'comment' and s.comments = 'off')
      or (o.kind = 'star_milestone' and coalesce(s.stars, 'weekly') <> 'milestone'));

  -- Comments, instant: 10 minutes after the first one waiting.
  for r in
    select o.project_id, array_agg(o.id) as row_ids
    from owner_outbox o
    left join project_notify_prefs s on s.project_id = o.project_id
    where o.sent_at is null and o.kind = 'comment'
      and coalesce(s.comments, 'instant') = 'instant'
    group by o.project_id
    having min(o.created_at) <= now() - interval '10 minutes'
  loop
    perform owner_send_comments(r.project_id, r.row_ids, false);
  end loop;

  -- Comments, daily: once a day after 9:00 in Sydney.
  if extract(hour from sydney) >= 9 and coalesce(
    (select last_day from owner_notify_runs where job = 'daily'), '-infinity'::date
  ) < today then
    insert into owner_notify_runs (job, last_day) values ('daily', today)
    on conflict (job) do update set last_day = excluded.last_day;
    for r in
      select o.project_id, array_agg(o.id) as row_ids
      from owner_outbox o
      join project_notify_prefs s on s.project_id = o.project_id
      where o.sent_at is null and o.kind = 'comment' and s.comments = 'daily'
      group by o.project_id
    loop
      perform owner_send_comments(r.project_id, r.row_ids, true);
    end loop;
  end if;

  -- Star milestones: the highest one waiting, in this round.
  for r in
    select o.project_id, max(o.milestone) as n, array_agg(o.id) as row_ids,
      p.name, p.name_en, p.slug, p.star_count
    from owner_outbox o
    join projects p on p.id = o.project_id
    where o.sent_at is null and o.kind = 'star_milestone'
    group by o.project_id, p.name, p.name_en, p.slug, p.star_count
  loop
    verdict := owner_send(
      r.project_id, 'star_milestone',
      case when r.n = 1
        then format('「%s」收到了第一个 Star · First star on %s',
          ops_plain(r.name, 60), ops_plain(coalesce(r.name_en, r.name), 60))
        else format('「%s」有 %s 个 Star 了 · %s stars on %s',
          ops_plain(r.name, 60), r.n, r.n, ops_plain(coalesce(r.name_en, r.name), 60))
      end,
      format(
        E'%s\n\n项目页 / Project: %s/projects/%s\n\n%s',
        case when r.n = 1
          then format('有人给「%s」点了第一个 Star。', ops_plain(r.name, 60))
          else format('「%s」的 Star 到了 %s 个。', ops_plain(r.name, 60), r.n)
        end,
        site, r.slug,
        case when r.n = 1
          then format('Someone gave %s its first star.', ops_plain(coalesce(r.name_en, r.name), 60))
          else format('%s just reached %s stars.', ops_plain(coalesce(r.name_en, r.name), 60), r.n)
        end
      ),
      'stars'
    );
    if verdict <> 'deferred' then
      update owner_outbox
      set sent_at = now(), outcome = case when verdict = 'sent' then 'sent' else 'skipped' end
      where id = any(r.row_ids);
    end if;
  end loop;

  -- Stars, weekly: Monday after 9:00 in Sydney, about the 7 days before.
  if extract(isodow from sydney) = 1 and extract(hour from sydney) >= 9 and coalesce(
    (select last_day from owner_notify_runs where job = 'weekly'), '-infinity'::date
  ) < today then
    insert into owner_notify_runs (job, last_day) values ('weekly', today)
    on conflict (job) do update set last_day = excluded.last_day;
    for r in
      select p.id, p.name, p.name_en, p.slug, p.star_count,
        (select count(*) from project_stars st
         where st.project_id = p.id and st.user_id <> p.owner_id
           and st.created_at > now() - interval '7 days') as new_stars,
        (select count(*) from project_comments c
         where c.project_id = p.id and c.deleted_at is null and not c.is_owner
           and c.created_at > now() - interval '7 days') as new_comments
      from projects p
      left join project_notify_prefs s on s.project_id = p.id
      where p.owner_id is not null and p.review_status = 'approved'
        and coalesce(s.stars, 'weekly') = 'weekly'
    loop
      continue when r.new_stars = 0;
      -- A deferred weekly is dropped; next Monday's covers its own week.
      perform owner_send(
        r.id, 'star_weekly',
        format('「%s」这周多了 %s 个 Star · %s new star%s this week',
          ops_plain(r.name, 60), r.new_stars, r.new_stars,
          case when r.new_stars > 1 then 's' else '' end),
        format(
          E'「%s」这一周：\n新 Star %s 个（一共 %s 个）\n新评论 %s 条\n\n项目页 / Project: %s/projects/%s\n\n%s this week: %s new star%s (%s in all), %s new comment%s.',
          ops_plain(r.name, 60), r.new_stars, r.star_count, r.new_comments,
          site, r.slug,
          ops_plain(coalesce(r.name_en, r.name), 60),
          r.new_stars, case when r.new_stars > 1 then 's' else '' end, r.star_count,
          r.new_comments, case when r.new_comments = 1 then '' else 's' end
        ),
        'stars'
      );
    end loop;
  end if;

  -- Review results: always.
  for r in
    select o.id, o.kind, p.id as project_id, p.name, p.name_en, p.slug
    from owner_outbox o
    join projects p on p.id = o.project_id
    where o.sent_at is null and o.kind in ('approved', 'rejected')
    order by o.created_at
  loop
    verdict := owner_send(
      r.project_id, r.kind,
      case r.kind
        when 'approved' then format('「%s」已经上线 · %s is live',
          ops_plain(r.name, 60), ops_plain(coalesce(r.name_en, r.name), 60))
        else format('「%s」这次没有通过审核 · %s wasn''t approved',
          ops_plain(r.name, 60), ops_plain(coalesce(r.name_en, r.name), 60))
      end,
      case r.kind
        when 'approved' then format(
          E'「%s」通过审核，已经在项目广场上了：\n%s/projects/%s\n\n有人评论或 Star 时会写信告诉你，在「我的」里可以改：%s/me\n\n%s passed review and is on the projects page. We''ll email you about comments and stars; change that on My card.',
          ops_plain(r.name, 60), site, r.slug, site, ops_plain(coalesce(r.name_en, r.name), 60))
        else format(
          E'「%s」这次没有通过审核。想知道原因，或者改好了想再交，直接回这封信。\n\n%s wasn''t approved this time. Reply to this email to ask why or to send it again.',
          ops_plain(r.name, 60), ops_plain(coalesce(r.name_en, r.name), 60))
      end
    );
    if verdict <> 'deferred' then
      update owner_outbox
      set sent_at = now(), outcome = case when verdict = 'sent' then 'sent' else 'skipped' end
      where id = r.id;
    end if;
  end loop;
end;
$$;
revoke all on function owner_notify_run() from public, anon, authenticated;

select cron.schedule('owner-notify', '*/5 * * * *', 'select public.owner_notify_run()');

-- Owners: their projects and settings ---------------------------------------------
-- Every project the signed-in member owns, pending and rejected included.
create or replace function my_projects()
returns table (
  slug text,
  name text,
  review_status text,
  star_count int,
  created_at timestamptz,
  comments text,
  stars text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.slug, p.name, p.review_status::text, p.star_count, p.created_at,
    coalesce(s.comments, 'instant'), coalesce(s.stars, 'weekly')
  from projects p
  left join project_notify_prefs s on s.project_id = p.id
  where p.owner_id = (select auth.uid())
  order by p.created_at desc;
$$;
revoke all on function my_projects() from public, anon;
grant execute on function my_projects() to authenticated;

-- The owner changes both settings of one project. Raises P0002 for a project
-- that isn't theirs and 23514 for a value the table doesn't allow.
create or replace function set_project_notify(p_slug text, p_comments text, p_stars text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  select id into pid from projects
  where slug = p_slug and owner_id = (select auth.uid());
  if pid is null then
    raise exception 'project not found' using errcode = 'P0002';
  end if;
  insert into project_notify_prefs (project_id, comments, stars)
  values (pid, p_comments, p_stars)
  on conflict (project_id) do update
    set comments = excluded.comments, stars = excluded.stars, updated_at = now();
end;
$$;
revoke all on function set_project_notify(text, text, text) from public, anon;
grant execute on function set_project_notify(text, text, text) to authenticated;

-- Unsubscribe from an email link, no sign-in ---------------------------------------
-- The project and both settings for a token, so the page can say what it's about.
create or replace function owner_unsubscribe_peek(p_token uuid)
returns table (name text, comments text, stars text)
language sql
stable
security definer
set search_path = public
as $$
  select p.name, s.comments, s.stars
  from project_notify_prefs s
  join projects p on p.id = s.project_id
  where s.unsubscribe_token = p_token;
$$;

-- Turns one kind off; returns the project name, or null for an unknown token.
create or replace function owner_unsubscribe(p_token uuid, p_kind text) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  if p_kind = 'comments' then
    update project_notify_prefs set comments = 'off', updated_at = now()
    where unsubscribe_token = p_token returning project_id into pid;
  elsif p_kind = 'stars' then
    update project_notify_prefs set stars = 'off', updated_at = now()
    where unsubscribe_token = p_token returning project_id into pid;
  end if;
  return (select name from projects where id = pid);
end;
$$;

revoke all on function owner_unsubscribe_peek(uuid) from public;
revoke all on function owner_unsubscribe(uuid, text) from public;
grant execute on function owner_unsubscribe_peek(uuid) to anon, authenticated;
grant execute on function owner_unsubscribe(uuid, text) to anon, authenticated;

-- Ops read the queue and the settings in the Hub ------------------------------------
-- Not the unsubscribe tokens: those turn someone's mail off.
grant select on owner_outbox, owner_email_log to hub_site_admin;
grant select (project_id, comments, stars, star_milestone, updated_at)
  on project_notify_prefs to hub_site_admin;
create policy "hub reads owner outbox" on owner_outbox
  for select to hub_site_admin using (true);
create policy "hub reads owner email log" on owner_email_log
  for select to hub_site_admin using (true);
create policy "hub reads notify prefs" on project_notify_prefs
  for select to hub_site_admin using (true);

notify pgrst, 'reload schema';
