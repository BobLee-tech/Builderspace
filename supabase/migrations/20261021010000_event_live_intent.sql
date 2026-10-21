-- 现场码加一个「意向」环节 -----------------------------------------------------
-- 嘉宾分享完，主持人在 /live/<slug>/host 切到 intent，大家手机上选接下来想做什么
-- （可多选：加入社团、有想法想找人一起做、加入核心团队、想和嘉宾再聊聊），可以写
-- 一句想法，再留微信号或邮箱。和 poll / link / feedback 一样每人一条、重复提交
-- 覆盖。联系方式只有主持台（live_host_state）和 Hub 后台看得到；公开的
-- live_state 不汇总这一步。选项和文案在 src/lib/event-live.ts。

alter table events drop constraint events_live_step_check;
alter table events add constraint events_live_step_check check (
  live_step in ('wait', 'checkin', 'poll', 'link', 'show', 'intent', 'feedback')
);

alter table event_live_responses drop constraint event_live_responses_step_check;
alter table event_live_responses add constraint event_live_responses_step_check
  check (step in ('poll', 'link', 'intent', 'feedback'));

-- 和 20261021000000_event_live.sql 里的一样，只是多认 intent。
create or replace function live_submit(
  p_slug text,
  p_token text,
  p_step text,
  p_payload jsonb,
  p_on_wall boolean
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
  if p_step not in ('poll', 'link', 'intent', 'feedback')
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
  return 'ok';
end;
$$;

-- 运营看现场：多一列 intents（留了意向的人数）。
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
  count(distinct x.id) filter (where x.step = 'intent') as intents
from events e
join event_registrations r on r.event_id = e.id and r.status <> 'cancelled'
left join event_live_responses x on x.registration_id = r.id
group by e.id, e.slug, e.live_step;
