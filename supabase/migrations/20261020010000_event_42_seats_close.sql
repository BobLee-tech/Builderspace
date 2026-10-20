-- 首场 Workshop：UNSW 名额 30 → 42，候补递补上来，然后关闭报名 ------------------
-- 原来 UNSW 30 个名额满了以后的人都在候补。名额改成 42，按报名顺序把 UNSW 候补
-- 递补成已确认，直到 42 个满为止；校外 10 个名额（官网不显示）不动。
-- 递补完把报名截止时间设成现在：官网一分钟内显示「报名已截止」，数据库也不再收新报名。
-- 递补触发器只在有人取消时跑，所以这里自己按同样的顺序和规则递补一遍。

update events
set seat_quotas = '{"unsw": 42, "external": 10}', capacity = 52
where slug = 'put-yourself-online';

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
end;
$$;

update events
set registration_closes_at = now()
where slug = 'put-yourself-online'
  and (registration_closes_at is null or registration_closes_at > now());
