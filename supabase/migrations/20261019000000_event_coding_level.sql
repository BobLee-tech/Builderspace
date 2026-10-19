-- 活动报名：问编程基础，不再问照片授权；首场 Workshop 改名 ------------------------
-- 1. event_registrations 加 coding_level：none（完全没有）/ some（学过一点）/
--    yes（有），方便按基础分桌。之前的报名记录为空。
-- 2. 报名表不再有「可以发我的现场照片」那一项。photo_consent 列留着（旧记录还
--    有值），新报名一律是 false。
-- 3. register_for_event() 多一个 p_coding_level。p_photo_consent 和后面的参数都
--    有默认值：还没更新的线上页面照旧传 10 个参数也能报上名，换代码时报名不断。
-- 4. 运营汇总 event_registration_summary 末尾加 by_coding_level。
-- 5. 首场 Workshop 改名「做一个自己的个人网站」，简介改成一句话。

alter table event_registrations
  add column coding_level text check (coding_level in ('none', 'some', 'yes'));

drop function register_for_event(text, text, text, text, text, text, text, text, boolean, text);

create function register_for_event(
  p_event_slug text,
  p_full_name text,
  p_wechat text,
  p_seat_group text,
  p_zid text,
  p_school text,
  p_occupation text,
  p_github_username text,
  p_photo_consent boolean default false,
  p_channel text default null,
  p_coding_level text default null
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
      coding_level = p_coding_level,
      channel = p_channel,
      status = next_status,
      created_at = now()
    where id = prev_id;
  else
    insert into event_registrations (
      event_id, full_name, wechat, seat_group, zid, school, occupation,
      github_username, photo_consent, coding_level, channel, status
    ) values (
      ev.id, p_full_name, wx, grp,
      case when grp = 'unsw' then lower(trim(p_zid)) end,
      sch,
      case when grp = 'external' then nullif(trim(coalesce(p_occupation, '')), '') end,
      nullif(trim(coalesce(p_github_username, '')), ''),
      coalesce(p_photo_consent, false), p_coding_level, p_channel, next_status
    );
  end if;

  return query select next_status, false;
end;
$$;

revoke all on function register_for_event(text, text, text, text, text, text, text, text, boolean, text, text) from public;
grant execute on function register_for_event(text, text, text, text, text, text, text, text, boolean, text, text) to anon, authenticated;

-- 运营汇总：同 20261018000000，末尾多一列 by_coding_level。
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
  ) as by_channel,
  (
    select jsonb_object_agg(c.lvl, c.n) from (
      select coalesce(r2.coding_level, '未填') as lvl, count(*) as n
      from event_registrations r2
      where r2.event_id = e.id and r2.status <> 'cancelled'
      group by 1
    ) c
  ) as by_coding_level
from events e
left join event_registrations r on r.event_id = e.id
where e.registration_closes_at is not null
group by e.id, e.slug, e.title, e.capacity, e.seat_quotas;

revoke all on event_registration_summary from anon, authenticated;
grant select on event_registration_summary to hub_site_admin;

-- 首场 Workshop ----------------------------------------------------------
update events set
  title = '做一个自己的个人网站',
  summary = '带上电脑，用 AI 做一个个人网站，发布到 GitHub Pages。'
where slug = 'put-yourself-online';

notify pgrst, 'reload schema';
