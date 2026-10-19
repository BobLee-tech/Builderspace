-- 活动现场码：一个码用一整场 ---------------------------------------------------
-- builderspace.dev/live 永远指向正在进行的活动。主持人在 /live/<slug>/host 切换
-- 当前环节，大家手机上的页面跟着换：签到 → 最爱的 AI 投票 → 交网址并互相点赞 →
-- 秀（投屏轮播） → 反馈和加入意向。投影屏 /live/<slug>/screen 只读公开汇总。
--
-- 1. events 加两列：
--    live_step：当前环节，为空就是没在进行。环节名固定：wait（跟着主讲做）、
--      checkin、poll、link、show、feedback；文案在 src/lib/event-live.ts。
--    live_spotlight：秀的时候主持人点名投屏的那个网站，为空就自动轮播。
-- 2. event_live_sessions：一台设备认出是谁以后的凭证。网站发一个随机 token 存在
--    httpOnly cookie 里，这里只存它的 sha256。一个人可以有好几台设备（手机和
--    电脑），两人一台电脑的可以在页面上「换人」。
-- 3. event_live_responses：每人每个环节一条，重复提交覆盖（poll / link /
--    feedback）。on_wall 是本人勾的「可以投屏、可以被社团发帖」，hidden 是主持人
--    藏起来的。签到不单独存，认人那一刻就写 event_registrations.checked_in_at。
-- 4. event_live_hearts：给别人的网站点赞，可附一句「喜欢的地方」，只有网站主人
--    能看到这句话。
-- 5. 访客不能直接读写这几张表，只能调下面的函数。主持人的函数用 /admin 的
--    管理员口令（comment_admin_verdict），和删评论是同一个口令。
-- 6. 现场补登：没报名直接来的人填名字和微信号，记为 other_school、
--    channel = 'walk-in'，学校没填就写「现场补登」。

alter table events
  add column live_step text check (
    live_step in ('wait', 'checkin', 'poll', 'link', 'show', 'feedback')
  ),
  add column live_spotlight uuid;

create table event_live_sessions (
  token_hash bytea primary key,
  registration_id uuid not null references event_registrations (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index event_live_sessions_registration_idx
  on event_live_sessions (registration_id);

create table event_live_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  registration_id uuid not null references event_registrations (id) on delete cascade,
  step text not null check (step in ('poll', 'link', 'feedback')),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 4000
  ),
  on_wall boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, step)
);
create index event_live_responses_event_idx
  on event_live_responses (event_id, step);

alter table events
  add constraint events_live_spotlight_fkey foreign key (live_spotlight)
  references event_live_responses (id) on delete set null;

create table event_live_hearts (
  response_id uuid not null references event_live_responses (id) on delete cascade,
  registration_id uuid not null references event_registrations (id) on delete cascade,
  note text check (char_length(note) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (response_id, registration_id)
);
create index event_live_hearts_registration_idx
  on event_live_hearts (registration_id);

-- 认人输错的记录，用来限速：一场活动 10 分钟内错 40 次就先停一下。
create table event_live_attempts (
  event_id uuid not null references events (id) on delete cascade,
  at timestamptz not null default now()
);
create index event_live_attempts_idx on event_live_attempts (event_id, at);

alter table event_live_sessions enable row level security;
alter table event_live_responses enable row level security;
alter table event_live_hearts enable row level security;
alter table event_live_attempts enable row level security;
revoke all on event_live_sessions, event_live_responses, event_live_hearts,
  event_live_attempts from anon, authenticated;

-- 内部：cookie 里的 token 对应这场活动的哪条报名（取消了的不算）。
create or replace function live_registration(p_slug text, p_token text)
returns event_registrations
language sql
stable
security definer
set search_path = public
as $$
  select r.* from event_live_sessions s
  join event_registrations r on r.id = s.registration_id
  join events e on e.id = r.event_id
  where s.token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
    and e.slug = p_slug and e.published and r.status <> 'cancelled';
$$;
revoke all on function live_registration(text, text) from public, anon, authenticated;

-- 内部：这台设备从此认作这个人；认人就算签到。
create or replace function live_start_session(p_registration uuid, p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into event_live_sessions (token_hash, registration_id)
  values (sha256(convert_to(p_token, 'UTF8')), p_registration)
  on conflict (token_hash) do update set registration_id = excluded.registration_id;
  update event_registrations
  set checked_in_at = coalesce(checked_in_at, now())
  where id = p_registration;
$$;
revoke all on function live_start_session(uuid, text) from public, anon, authenticated;

-- 认人：报名时填的微信号 -------------------------------------------------------
-- 'ok' | 'unknown'（没找到这个微信号）| 'closed'（没在进行）| 'throttled' | 'denied'
create or replace function live_identify(p_slug text, p_wechat text, p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ev events;
  reg_id uuid;
begin
  select * into ev from events where slug = p_slug and published;
  if not found or ev.live_step is null then
    return 'closed';
  end if;
  if char_length(coalesce(p_token, '')) not between 32 and 128 then
    return 'denied';
  end if;
  if (select count(*) from event_live_attempts a
      where a.event_id = ev.id and a.at > now() - interval '10 minutes') >= 40 then
    return 'throttled';
  end if;

  select r.id into reg_id from event_registrations r
  where r.event_id = ev.id
    and lower(r.wechat) = lower(trim(coalesce(p_wechat, '')))
    and r.status <> 'cancelled';
  if reg_id is null then
    insert into event_live_attempts (event_id) values (ev.id);
    return 'unknown';
  end if;

  perform live_start_session(reg_id, p_token);
  return 'ok';
end;
$$;

-- 现场补登 ---------------------------------------------------------------------
-- 'ok' | 'closed' | 'denied'（填得不对）
create or replace function live_walk_in(
  p_slug text,
  p_full_name text,
  p_wechat text,
  p_school text,
  p_github_username text,
  p_token text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ev events;
  v_name text := trim(coalesce(p_full_name, ''));
  wx text := trim(coalesce(p_wechat, ''));
  sch text := coalesce(nullif(trim(coalesce(p_school, '')), ''), '现场补登');
  gh text := nullif(trim(coalesce(p_github_username, '')), '');
  prev event_registrations;
  reg_id uuid;
begin
  select * into ev from events where slug = p_slug and published;
  if not found or ev.live_step is null then
    return 'closed';
  end if;
  if char_length(coalesce(p_token, '')) not between 32 and 128
     or char_length(v_name) not between 1 and 40
     or char_length(wx) not between 1 and 60
     or char_length(sch) > 80
     or (gh is not null and gh !~* '^[a-z0-9-]{1,39}$') then
    return 'denied';
  end if;

  select * into prev from event_registrations r
  where r.event_id = ev.id and lower(r.wechat) = lower(wx);
  if prev.id is not null and prev.status <> 'cancelled' then
    -- 其实报过名，只是没认出来：直接用原来那条。
    reg_id := prev.id;
  elsif prev.id is not null then
    update event_registrations set
      full_name = v_name, seat_group = 'other_school', zid = null, school = sch,
      occupation = null, github_username = gh, channel = 'walk-in',
      status = 'confirmed'
    where id = prev.id;
    reg_id := prev.id;
  else
    insert into event_registrations (
      event_id, full_name, wechat, seat_group, school, github_username,
      channel, status
    ) values (ev.id, v_name, wx, 'other_school', sch, gh, 'walk-in', 'confirmed')
    returning id into reg_id;
  end if;

  perform live_start_session(reg_id, p_token);
  return 'ok';
end;
$$;

-- 公开汇总：投影屏和每个人的手机都读这个，没有微信号 ---------------------------
create or replace function live_state(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ev events;
begin
  select * into ev from events where slug = p_slug and published;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'step', ev.live_step,
    'spotlight', ev.live_spotlight,
    'checkedIn', (
      select count(*) from event_registrations r
      where r.event_id = ev.id and r.status <> 'cancelled'
        and r.checked_in_at is not null
    ),
    'poll', coalesce((
      select jsonb_object_agg(x.choice, x.n) from (
        select payload ->> 'choice' as choice, count(*) as n
        from event_live_responses
        where event_id = ev.id and step = 'poll'
        group by 1
      ) x
    ), '{}'::jsonb),
    'pollNotes', coalesce((
      select jsonb_agg(jsonb_build_object('choice', x.choice, 'note', x.note)
                       order by x.at desc)
      from (
        select payload ->> 'choice' as choice, payload ->> 'note' as note,
               updated_at as at
        from event_live_responses
        where event_id = ev.id and step = 'poll' and not hidden
          and coalesce(payload ->> 'note', '') <> ''
        order by updated_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'links', (
      select jsonb_build_object(
        'total', count(*),
        'live', count(*) filter (where payload ->> 'check' = 'live'),
        'pending', count(*) filter (where payload ->> 'check' = 'pending'),
        'pages', count(*) filter (where payload ->> 'kind' = 'pages')
      )
      from event_live_responses
      where event_id = ev.id and step = 'link'
    ),
    'wall', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.hearts desc, w.at desc)
      from (
        select x.id, r.full_name as name,
          x.payload ->> 'url' as url, x.payload ->> 'host' as host,
          x.payload ->> 'kind' as kind, x.payload ->> 'check' as "check",
          x.payload ->> 'title' as title,
          (select count(*) from event_live_hearts h where h.response_id = x.id)
            as hearts,
          x.updated_at as at
        from event_live_responses x
        join event_registrations r on r.id = x.registration_id
        where x.event_id = ev.id and x.step = 'link' and x.on_wall
          and not x.hidden and r.status <> 'cancelled'
        order by x.updated_at desc
        limit 120
      ) w
    ), '[]'::jsonb),
    'feedback', (
      select jsonb_build_object(
        'n', count(*),
        'avg', round(avg((payload ->> 'rating')::numeric), 1),
        'canEdit', jsonb_build_object(
          'yes', count(*) filter (where payload ->> 'canEdit' = 'yes'),
          'maybe', count(*) filter (where payload ->> 'canEdit' = 'maybe'),
          'no', count(*) filter (where payload ->> 'canEdit' = 'no')
        ),
        'friends', jsonb_build_object(
          '0', count(*) filter (where payload ->> 'friends' = '0'),
          '1-2', count(*) filter (where payload ->> 'friends' = '1-2'),
          '3-5', count(*) filter (where payload ->> 'friends' = '3-5'),
          '6+', count(*) filter (where payload ->> 'friends' = '6+')
        ),
        'join', count(*) filter (where (payload ->> 'join')::boolean)
      )
      from event_live_responses
      where event_id = ev.id and step = 'feedback'
    )
  );
end;
$$;

-- 我自己：这台设备是谁、交过什么、给谁点过赞、别人说喜欢我网站的什么 ------------
create or replace function live_me(p_slug text, p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  reg event_registrations := live_registration(p_slug, p_token);
  link_id uuid;
begin
  if reg.id is null then
    return null;
  end if;
  select id into link_id from event_live_responses
  where registration_id = reg.id and step = 'link';

  return jsonb_build_object(
    'name', reg.full_name,
    'github', reg.github_username,
    'photoConsent', reg.photo_consent,
    'responses', coalesce((
      select jsonb_object_agg(x.step, jsonb_build_object(
        'id', x.id, 'payload', x.payload, 'onWall', x.on_wall,
        'hidden', x.hidden
      ))
      from event_live_responses x where x.registration_id = reg.id
    ), '{}'::jsonb),
    'hearted', coalesce((
      select jsonb_agg(h.response_id) from event_live_hearts h
      where h.registration_id = reg.id
    ), '[]'::jsonb),
    'received', jsonb_build_object(
      'hearts', (select count(*) from event_live_hearts h where h.response_id = link_id),
      'notes', coalesce((
        select jsonb_agg(n.note order by n.created_at desc) from (
          select h.note, h.created_at from event_live_hearts h
          where h.response_id = link_id and h.note is not null
          order by h.created_at desc limit 20
        ) n
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- 交一个环节（覆盖上一次） ----------------------------------------------------
-- 'ok' | 'denied'（没认出是谁或内容不对）| 'closed'（活动没在进行）
create or replace function live_submit(
  p_slug text,
  p_token text,
  p_step text,
  p_payload jsonb,
  p_on_wall boolean,
  p_photo_consent boolean default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  reg event_registrations := live_registration(p_slug, p_token);
begin
  if reg.id is null then
    return 'denied';
  end if;
  if (select live_step from events where id = reg.event_id) is null then
    return 'closed';
  end if;
  if p_step not in ('poll', 'link', 'feedback')
     or p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or pg_column_size(p_payload) > 4000 then
    return 'denied';
  end if;

  insert into event_live_responses (event_id, registration_id, step, payload, on_wall)
  values (reg.event_id, reg.id, p_step, p_payload, coalesce(p_on_wall, false))
  on conflict (registration_id, step) do update set
    payload = excluded.payload,
    on_wall = excluded.on_wall,
    updated_at = now();

  if p_photo_consent is not null then
    update event_registrations set photo_consent = p_photo_consent
    where id = reg.id;
  end if;
  return 'ok';
end;
$$;

-- 点赞 / 取消点赞，可附一句喜欢的地方 ----------------------------------------
-- 'ok' | 'denied'
create or replace function live_heart(
  p_slug text,
  p_token text,
  p_response_id uuid,
  p_on boolean,
  p_note text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  reg event_registrations := live_registration(p_slug, p_token);
  note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if reg.id is null or char_length(note) > 80 then
    return 'denied';
  end if;
  if not exists (
    select 1 from event_live_responses x
    where x.id = p_response_id and x.event_id = reg.event_id
      and x.step = 'link' and x.on_wall and not x.hidden
      and x.registration_id <> reg.id
  ) then
    return 'denied';
  end if;

  if p_on then
    insert into event_live_hearts (response_id, registration_id, note)
    values (p_response_id, reg.id, note)
    on conflict (response_id, registration_id) do update
      set note = coalesce(excluded.note, event_live_hearts.note);
  else
    delete from event_live_hearts
    where response_id = p_response_id and registration_id = reg.id;
  end if;
  return 'ok';
end;
$$;

-- 主持人 -----------------------------------------------------------------------
-- 全部明细（含名字、反馈原文、想加入的人的微信号）。口令不对返回
-- {"denied": "denied" | "throttled"}。
create or replace function live_host_state(p_slug text, p_admin_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  verdict text := comment_admin_verdict(p_admin_key);
  ev events;
begin
  if verdict <> 'ok' then
    return jsonb_build_object('denied', verdict);
  end if;
  select * into ev from events where slug = p_slug;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'step', ev.live_step,
    'spotlight', ev.live_spotlight,
    'registered', (
      select count(*) from event_registrations r
      where r.event_id = ev.id and r.status <> 'cancelled'
    ),
    'checkedIn', (
      select count(*) from event_registrations r
      where r.event_id = ev.id and r.status <> 'cancelled'
        and r.checked_in_at is not null
    ),
    'walkIns', (
      select count(*) from event_registrations r
      where r.event_id = ev.id and r.status <> 'cancelled'
        and r.channel = 'walk-in'
    ),
    'responses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'step', x.step, 'name', r.full_name,
        'github', r.github_username, 'payload', x.payload,
        'onWall', x.on_wall, 'hidden', x.hidden,
        'photo', r.photo_consent,
        'wechat', case
          when x.step = 'feedback' and (x.payload ->> 'join')::boolean
          then r.wechat
        end,
        'hearts', (select count(*) from event_live_hearts h where h.response_id = x.id),
        'at', x.updated_at
      ) order by x.updated_at desc)
      from event_live_responses x
      join event_registrations r on r.id = x.registration_id
      where x.event_id = ev.id and r.status <> 'cancelled'
    ), '[]'::jsonb)
  );
end;
$$;

-- 切换环节；p_step 为空就结束现场。'ok' | 'denied' | 'throttled' | 'missing'
create or replace function live_host_step(p_slug text, p_admin_key text, p_step text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  verdict text := comment_admin_verdict(p_admin_key);
begin
  if verdict <> 'ok' then
    return verdict;
  end if;
  update events set
    live_step = nullif(p_step, ''),
    live_spotlight = case when nullif(p_step, '') = 'show' then live_spotlight end
  where slug = p_slug;
  return case when found then 'ok' else 'missing' end;
end;
$$;

-- 秀：点名投某个网站，传空就回到自动轮播。
create or replace function live_host_spotlight(
  p_slug text,
  p_admin_key text,
  p_response_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  verdict text := comment_admin_verdict(p_admin_key);
  ev_id uuid;
begin
  if verdict <> 'ok' then
    return verdict;
  end if;
  select id into ev_id from events where slug = p_slug;
  if ev_id is null or (p_response_id is not null and not exists (
    select 1 from event_live_responses x
    where x.id = p_response_id and x.event_id = ev_id and x.step = 'link'
  )) then
    return 'missing';
  end if;
  update events set live_spotlight = p_response_id where id = ev_id;
  return 'ok';
end;
$$;

-- 藏起 / 放回墙上的一条（网址或投票留言）。
create or replace function live_host_hide(
  p_slug text,
  p_admin_key text,
  p_response_id uuid,
  p_hidden boolean
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  verdict text := comment_admin_verdict(p_admin_key);
begin
  if verdict <> 'ok' then
    return verdict;
  end if;
  update event_live_responses x set hidden = coalesce(p_hidden, true)
  from events e
  where x.id = p_response_id and e.id = x.event_id and e.slug = p_slug;
  if not found then
    return 'missing';
  end if;
  update events set live_spotlight = null
  where slug = p_slug and live_spotlight = p_response_id and p_hidden;
  return 'ok';
end;
$$;

revoke all on function live_identify(text, text, text) from public;
revoke all on function live_walk_in(text, text, text, text, text, text) from public;
revoke all on function live_state(text) from public;
revoke all on function live_me(text, text) from public;
revoke all on function live_submit(text, text, text, jsonb, boolean, boolean) from public;
revoke all on function live_heart(text, text, uuid, boolean, text) from public;
revoke all on function live_host_state(text, text) from public;
revoke all on function live_host_step(text, text, text) from public;
revoke all on function live_host_spotlight(text, text, uuid) from public;
revoke all on function live_host_hide(text, text, uuid, boolean) from public;
grant execute on function live_identify(text, text, text) to anon, authenticated;
grant execute on function live_walk_in(text, text, text, text, text, text) to anon, authenticated;
grant execute on function live_state(text) to anon, authenticated;
grant execute on function live_me(text, text) to anon, authenticated;
grant execute on function live_submit(text, text, text, jsonb, boolean, boolean) to anon, authenticated;
grant execute on function live_heart(text, text, uuid, boolean, text) to anon, authenticated;
grant execute on function live_host_state(text, text) to anon, authenticated;
grant execute on function live_host_step(text, text, text) to anon, authenticated;
grant execute on function live_host_spotlight(text, text, uuid) to anon, authenticated;
grant execute on function live_host_hide(text, text, uuid, boolean) to anon, authenticated;

-- Hub 后台：能看现场收上来的东西，不能改。
grant select on event_live_responses, event_live_hearts to hub_site_admin;
create policy "hub reads live responses" on event_live_responses
  for select to hub_site_admin using (true);
create policy "hub reads live hearts" on event_live_hearts
  for select to hub_site_admin using (true);

-- 运营看现场：在 SQL Editor 里 select * from event_live_summary;
create or replace view event_live_summary
with (security_invoker = true) as
select
  e.slug,
  e.live_step,
  count(distinct r.id) filter (where r.checked_in_at is not null) as checked_in,
  count(distinct r.id) filter (where r.channel = 'walk-in') as walk_ins,
  count(distinct x.id) filter (where x.step = 'poll') as poll_votes,
  count(distinct x.id) filter (where x.step = 'link') as links,
  count(distinct x.id) filter (where x.step = 'link' and x.payload ->> 'check' = 'live') as links_live,
  count(distinct x.id) filter (where x.step = 'feedback') as feedback,
  count(distinct x.id) filter (where x.step = 'feedback' and (x.payload ->> 'join')::boolean) as want_to_join
from events e
join event_registrations r on r.event_id = e.id and r.status <> 'cancelled'
left join event_live_responses x on x.registration_id = r.id
group by e.id, e.slug, e.live_step;

revoke all on event_live_summary from anon, authenticated;
grant select on event_live_summary to hub_site_admin;
