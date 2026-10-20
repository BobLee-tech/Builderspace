-- 首场 Workshop：UNSW 名额 30 → 42，候补递补上来，报满 42 人自动关闭报名 ----------
-- 原来 UNSW 30 个名额满了以后的人都在候补。名额改成 42，按报名顺序把 UNSW 候补
-- 递补成已确认；校外 10 个名额（官网不显示）不动。
-- 之后 UNSW 已确认满 42 人的那一刻，把报名截止时间设成现在：官网显示「报名已截止」，
-- 数据库也不再收新报名（包括候补和校外）。

-- events.close_when_full：这一类名额满了就关闭整场报名。为空则照旧，满了转候补。
alter table events
  add column close_when_full text
    check (close_when_full in ('unsw', 'usyd', 'other_school', 'external'));

-- 这场设了 close_when_full、那一类已确认人数到了名额、报名还开着，就现在截止。
create or replace function close_event_when_full(p_event_id uuid) returns void
language sql
security definer
set search_path = public
as $$
  update events e
  set registration_closes_at = now()
  where e.id = p_event_id
    and e.close_when_full is not null
    and e.registration_closes_at > now()
    and (
      select count(*) from event_registrations r
      where r.event_id = e.id and r.status = 'confirmed'
        and r.seat_group = e.close_when_full
    ) >= coalesce((e.seat_quotas ->> e.close_when_full)::int, 0);
$$;

create or replace function close_event_when_full_trigger() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform close_event_when_full(new.event_id);
  return null;
end;
$$;

revoke all on function close_event_when_full(uuid) from public, anon, authenticated;
revoke all on function close_event_when_full_trigger() from public, anon, authenticated;

-- 报名直接确认，或者候补递补成确认，都可能是最后一个名额。
create trigger event_registrations_close_when_full
  after insert or update of status on event_registrations
  for each row
  when (new.status = 'confirmed')
  execute function close_event_when_full_trigger();

update events
set seat_quotas = '{"unsw": 42, "external": 10}', capacity = 52,
  close_when_full = 'unsw'
where slug = 'put-yourself-online';

-- 递补触发器只在有人取消时跑，所以这里按同样的顺序和规则自己递补一遍。
-- 递补到第 42 个时，上面的触发器就会关闭报名。
do $$
declare
  ev events;
  w record;
begin
  select * into ev from events where slug = 'put-yourself-online' for update;
  if not found then
    return;
  end if;
  for w in
    select id, seat_group from event_registrations
    where event_id = ev.id and status = 'waitlist'
    order by created_at, id
  loop
    if event_seat_open(ev, w.seat_group) then
      update event_registrations set status = 'confirmed' where id = w.id;
    end if;
  end loop;
  -- 本来就正好 42 人、没有人递补时，触发器不会跑。
  perform close_event_when_full(ev.id);
end;
$$;
