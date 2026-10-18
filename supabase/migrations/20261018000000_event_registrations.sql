-- 活动报名：在官网活动详情页直接报名，按身份分名额，已报名人数实时显示 ----------
-- 1. events 加两列：
--    registration_closes_at：有值、没过截止时间、活动还没开始，详情页就开放报名；
--      为空的活动照旧用 signup_url 或不开报名。
--    seat_quotas：每类人的名额，比如 {"unsw": 30, "usyd": 10}。键名是
--      unsw（UNSW 学生）、usyd（悉大学生）、other_school（其他学校学生）、
--      external（校外成员）；没写的类别这场不开放。为空则只看 capacity。
-- 2. event_registrations：报名记录。先问是不是 UNSW 学生：是就填 zID；不是就选
--    其他学校学生（填学校）或校外成员（填职业）。访客不能直接读写这张表，只能
--    调用 register_for_event()。哪类名额满了，这一类后面报的人进候补；同一个
--    微信号重复报名返回原来的状态，不会占两个名额。运营在后台把某人改成
--    cancelled 后，同类最早的候补自动递补（记得私信通知 TA）。
-- 3. event_signup_stats()：公开的人数统计，只有每类已报名人数和候补人数，不含
--    任何个人信息。
-- 4. event_registration_summary：运营看的汇总，只有后台和 Hub 能读。
-- 5. 首场 Workshop「3 小时，把自己放上网」：UNSW 30 人、悉大 10 人。
-- zID 只有 UNSW 学生报名活动时才收，只用于社团活动登记，不公开。不收学生证。

alter table events
  add column registration_closes_at timestamptz,
  add column seat_quotas jsonb check (
    seat_quotas is null or (
      jsonb_typeof(seat_quotas) = 'object'
      and seat_quotas - array['unsw', 'usyd', 'other_school', 'external'] = '{}'::jsonb
    )
  );

create type registration_status as enum ('confirmed', 'waitlist', 'cancelled');

create table event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 40),
  -- 签到、拉参与者群都靠微信号，所以必填；同一场活动里不能重复。
  wechat text not null check (char_length(wechat) between 1 and 60),
  -- 占哪一类名额，键名同 events.seat_quotas。
  seat_group text not null
    check (seat_group in ('unsw', 'usyd', 'other_school', 'external')),
  -- 只有 UNSW 学生填，而且必填。
  zid text check (zid ~ '^z[0-9]{7}$'),
  -- 学校名：UNSW / USYD 由类别决定，其他学校学生自己填；校外成员为空。
  school text check (char_length(school) between 1 and 80),
  -- 只有校外成员填，而且必填。
  occupation text check (char_length(occupation) between 1 and 80),
  -- 选填：有就知道谁还要当场注册 GitHub。
  github_username text check (github_username ~* '^[a-z0-9-]{1,39}$'),
  -- 是否同意现场照片和网站截图被社团发帖：成果墙和发帖只用同意的人。
  photo_consent boolean not null default false,
  -- 报名链接上的 ?ref= / utm_source，用来看哪个渠道带来的人。
  channel text check (channel ~ '^[a-z0-9_-]{1,40}$'),
  status registration_status not null,
  created_at timestamptz not null default now(),
  -- 运营在后台填的列，报名函数从不写。
  checked_in_at timestamptz,
  ops_notes text check (char_length(ops_notes) <= 1000),
  constraint event_registrations_identity_check check (
    (seat_group = 'unsw') = (zid is not null)
    and (seat_group = 'external') = (occupation is not null)
    and (seat_group = 'external') = (school is null)
  )
);

create unique index event_registrations_wechat_key
  on event_registrations (event_id, lower(wechat));
create index event_registrations_event_idx
  on event_registrations (event_id, status, seat_group);

alter table event_registrations enable row level security;
revoke all on event_registrations from anon, authenticated;

create trigger event_registrations_throttle before insert on event_registrations
  for each row execute function throttle_public_inserts('20');

-- 这一类现在还有没有空位：同类名额和总名额都要有余量。
create or replace function event_seat_open(ev events, grp text) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (ev.capacity is null or (
      select count(*) from event_registrations r
      where r.event_id = ev.id and r.status = 'confirmed'
    ) < ev.capacity)
    and (ev.seat_quotas is null or (
      select count(*) from event_registrations r
      where r.event_id = ev.id and r.status = 'confirmed' and r.seat_group = grp
    ) < coalesce((ev.seat_quotas ->> grp)::int, 0));
$$;

-- 报名 -------------------------------------------------------------------
create or replace function register_for_event(
  p_event_slug text,
  p_full_name text,
  p_wechat text,
  p_seat_group text,
  p_zid text,
  p_school text,
  p_occupation text,
  p_github_username text,
  p_photo_consent boolean,
  p_channel text
) returns table (status registration_status, already_registered boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  ev events;
  wx text := trim(coalesce(p_wechat, ''));
  grp text := p_seat_group;
  sch text;
  prev_id uuid;
  prev_status registration_status;
  next_status registration_status;
begin
  -- 锁住活动这一行：同时报名的人排队取号，最后一个名额不会被两个人拿到。
  select * into ev from events e
  where e.slug = p_event_slug and e.published
  for update;
  if not found then
    raise exception 'event not found' using errcode = 'PT404';
  end if;
  if ev.registration_closes_at is null
     or now() >= ev.registration_closes_at
     or now() >= ev.starts_at then
    raise exception 'registration is closed' using errcode = 'PT410';
  end if;
  if ev.seat_quotas is not null and not ev.seat_quotas ? grp then
    raise exception 'this group is not open for this event' using errcode = 'PT422';
  end if;

  sch := case grp
    when 'unsw' then 'UNSW'
    when 'usyd' then 'USYD'
    when 'other_school' then nullif(trim(coalesce(p_school, '')), '')
  end;

  select r.id, r.status into prev_id, prev_status
  from event_registrations r
  where r.event_id = ev.id and lower(r.wechat) = lower(wx);
  if prev_id is not null and prev_status <> 'cancelled' then
    return query select prev_status, true;
    return;
  end if;

  -- 同类已经有人在候补，就排在他们后面，不插队。
  next_status := case
    when event_seat_open(ev, grp) and not exists (
      select 1 from event_registrations r
      where r.event_id = ev.id and r.status = 'waitlist' and r.seat_group = grp
    ) then 'confirmed'
    else 'waitlist'
  end::registration_status;

  if prev_id is not null then
    -- 取消过又回来报名：用新填的信息重新排队。
    update event_registrations set
      full_name = p_full_name,
      seat_group = grp,
      zid = case when grp = 'unsw' then lower(trim(p_zid)) end,
      school = sch,
      occupation = case when grp = 'external' then nullif(trim(coalesce(p_occupation, '')), '') end,
      github_username = nullif(trim(coalesce(p_github_username, '')), ''),
      photo_consent = coalesce(p_photo_consent, false),
      channel = p_channel,
      status = next_status,
      created_at = now()
    where id = prev_id;
  else
    insert into event_registrations (
      event_id, full_name, wechat, seat_group, zid, school, occupation,
      github_username, photo_consent, channel, status
    ) values (
      ev.id, p_full_name, wx, grp,
      case when grp = 'unsw' then lower(trim(p_zid)) end,
      sch,
      case when grp = 'external' then nullif(trim(coalesce(p_occupation, '')), '') end,
      nullif(trim(coalesce(p_github_username, '')), ''),
      coalesce(p_photo_consent, false), p_channel, next_status
    );
  end if;

  return query select next_status, false;
end;
$$;

-- 有人取消：按报名顺序把还有空位那一类的候补递补上 ------------------------------
create or replace function promote_event_waitlist() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev events;
  w record;
begin
  select * into ev from events where id = new.event_id for update;
  for w in
    select id, seat_group from event_registrations
    where event_id = new.event_id and status = 'waitlist'
    order by created_at, id
  loop
    if event_seat_open(ev, w.seat_group) then
      update event_registrations set status = 'confirmed' where id = w.id;
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function promote_event_waitlist() from public, anon, authenticated;
revoke all on function event_seat_open(events, text) from public, anon, authenticated;

create trigger event_registrations_promote
  after update of status on event_registrations
  for each row
  when (old.status = 'confirmed' and new.status <> 'confirmed')
  execute function promote_event_waitlist();

-- 公开人数：只给数字 ------------------------------------------------------
create or replace function event_signup_stats()
returns table (slug text, confirmed int, waitlist int, by_group jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.slug,
    (select count(*) from event_registrations r
      where r.event_id = e.id and r.status = 'confirmed')::int,
    (select count(*) from event_registrations r
      where r.event_id = e.id and r.status = 'waitlist')::int,
    coalesce((
      select jsonb_object_agg(g.seat_group, g.n) from (
        select r.seat_group, count(*) as n from event_registrations r
        where r.event_id = e.id and r.status = 'confirmed'
        group by r.seat_group
      ) g
    ), '{}'::jsonb)
  from events e
  where e.published and e.registration_closes_at is not null;
$$;

revoke all on function register_for_event(text, text, text, text, text, text, text, text, boolean, text) from public;
revoke all on function event_signup_stats() from public;
grant execute on function register_for_event(text, text, text, text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function event_signup_stats() to anon, authenticated;

-- 运营汇总：在 SQL Editor 里 select * from event_registration_summary; -------
create or replace view event_registration_summary
with (security_invoker = true) as
select
  e.slug,
  e.title,
  e.capacity,
  e.seat_quotas,
  count(*) filter (where r.status = 'confirmed') as confirmed,
  count(*) filter (where r.status = 'waitlist') as waitlist,
  count(*) filter (where r.status = 'cancelled') as cancelled,
  count(*) filter (where r.checked_in_at is not null) as checked_in,
  (
    select jsonb_object_agg(g.k, g.n) from (
      select r2.seat_group || ' · ' || r2.status as k, count(*) as n
      from event_registrations r2
      where r2.event_id = e.id and r2.status <> 'cancelled'
      group by 1
    ) g
  ) as by_group,
  count(*) filter (where r.status <> 'cancelled' and r.github_username is not null) as has_github,
  count(*) filter (where r.status <> 'cancelled' and r.github_username is null) as needs_github,
  count(*) filter (where r.status <> 'cancelled' and r.photo_consent) as photo_consent,
  (
    select jsonb_object_agg(s.src, s.n) from (
      select coalesce(r2.channel, '直接打开') as src, count(*) as n
      from event_registrations r2
      where r2.event_id = e.id and r2.status <> 'cancelled'
      group by 1
    ) s
  ) as by_channel
from events e
left join event_registrations r on r.event_id = e.id
where e.registration_closes_at is not null
group by e.id, e.slug, e.title, e.capacity, e.seat_quotas;

revoke all on event_registration_summary from anon, authenticated;

-- Hub 后台：能看报名、改状态、签到和备注，不能新增或删除。
grant select on event_registrations, event_registration_summary to hub_site_admin;
grant select on events to hub_site_admin;
grant update (status, checked_in_at, ops_notes) on event_registrations to hub_site_admin;
drop policy if exists "hub reads events" on events;
create policy "hub reads events" on events
  for select to hub_site_admin using (true);
drop policy if exists "hub reads event registrations" on event_registrations;
create policy "hub reads event registrations" on event_registrations
  for select to hub_site_admin using (true);
drop policy if exists "hub follows up event registrations" on event_registrations;
create policy "hub follows up event registrations" on event_registrations
  for update to hub_site_admin using (true) with check (true);

-- 首场 Workshop ----------------------------------------------------------
-- 10/22 是悉尼夏令时（AEDT，+11）。报名到 10/21 晚上 23:59 截止。
insert into events (
  slug, title, kind, starts_at, ends_at, location, summary, capacity,
  seat_quotas, published, registration_closes_at
) values (
  'put-yourself-online',
  '3 小时，把自己放上网',
  'workshop',
  '2026-10-22 10:00:00+11',
  '2026-10-22 13:00:00+11',
  'UNSW MCIC',
  '零基础也能做。带上电脑，用 AI 做一个个人网站并发布到 GitHub Pages，离场时带走自己的「用户名.github.io」网址和一桌新朋友。',
  40,
  '{"unsw": 30, "usyd": 10}',
  true,
  '2026-10-21 23:59:59+11'
)
on conflict (slug) do update set
  title = excluded.title,
  kind = excluded.kind,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  location = excluded.location,
  summary = excluded.summary,
  capacity = excluded.capacity,
  seat_quotas = excluded.seat_quotas,
  published = excluded.published,
  registration_closes_at = excluded.registration_closes_at;
