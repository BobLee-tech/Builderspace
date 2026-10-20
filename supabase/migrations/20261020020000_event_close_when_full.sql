-- 首场 Workshop 重新开放报名，UNSW 报满 42 人自动关闭 ---------------------------
-- 20261020010000 运行时直接把报名关了，但本意是报满 42 人再关。这里把截止时间
-- 恢复成原来的 10/21 23:59，并让数据库在 UNSW 第 42 人确认的那一刻自动关闭报名。

-- events.close_when_full：这一类名额满了就关闭整场报名（候补和其他类也不再收）。
-- 为空则照旧，满了转候补。
alter table events
  add column if not exists close_when_full text
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
drop trigger if exists event_registrations_close_when_full on event_registrations;
create trigger event_registrations_close_when_full
  after insert or update of status on event_registrations
  for each row
  when (new.status = 'confirmed')
  execute function close_event_when_full_trigger();

update events
set close_when_full = 'unsw',
  registration_closes_at = '2026-10-21 23:59:59+11'
where slug = 'put-yourself-online';

-- 已经满 42 人的话，马上关回去。
select close_event_when_full(id) from events where slug = 'put-yourself-online';
