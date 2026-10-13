-- 加入表单：下一场活动意向，以及自愿登记支持社团申请 ----------------------
-- 两道活动题都是选填。姓名和 zID 只在成员勾选支持并单独同意后才写入；
-- 没有勾选时，这两列必须为空（由下面的约束保证，前端传了也存不进来）。
alter table join_submissions
  add column next_event_interest text
    check (next_event_interest in ('yes', 'maybe', 'no')),
  add column availability text[] not null default '{}'
    check (availability <@ array['weekday_evening', 'weekend_day', 'online']),
  add column affiliation_support boolean not null default false,
  add column full_name text check (char_length(full_name) between 1 and 80),
  add column zid text check (zid ~ '^z[0-9]{7}$'),
  add column affiliation_consent boolean not null default false,
  add constraint join_supporter_details check (
    case
      when affiliation_support then
        full_name is not null and zid is not null and affiliation_consent
      else
        full_name is null and zid is null and not affiliation_consent
    end
  );

-- 运营看板：登记人数与活动意向的汇总，只在 dashboard 里看 ------------------
create view join_interest_summary as
select
  count(*)::int as submissions,
  count(*) filter (where next_event_interest = 'yes')::int as next_event_yes,
  count(*) filter (where next_event_interest = 'maybe')::int as next_event_maybe,
  count(*) filter (where 'weekday_evening' = any (availability))::int as weekday_evening,
  count(*) filter (where 'weekend_day' = any (availability))::int as weekend_day,
  count(*) filter (where 'online' = any (availability))::int as online,
  -- 同一个 zID 重复提交只算一次
  count(distinct zid)::int as supporters
from join_submissions;

-- Grants ----------------------------------------------------------------
-- 公开访客仍然只能写入、不能读回；汇总视图同样不对 API 角色开放。
revoke all on join_interest_summary from anon, authenticated;
