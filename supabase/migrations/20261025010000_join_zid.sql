-- 加入时留 zID（#48） -------------------------------------------------------
-- UNSW 同学加入时必须留下 zID：
-- 1. 登录邮箱是 z1234567@ad.unsw.edu.au 这一类的，zID 直接从已验证的登录邮箱取，
--    不用填，也不信任前端传来的值；其他 UNSW 邮箱（名字@student.unsw.edu.au）
--    必须填。用其他邮箱、勾了「我是 UNSW 在读学生」的也要填，这一条由网站检查
--    （数据库不知道谁勾了）。
-- 2. zID 存在 join_submissions.zid，Hub 的加入登记和导出表格直接读这一列。以前
--    这一列只给「支持社团申请」的人用，现在所有 UNSW 成员都有；把姓名和 zID 交给
--    Arc 仍然要在问卷里单独勾选同意，supporters 统计也只数支持者。
-- 3. 已经加入的成员：登录邮箱是 z1234567@…unsw.edu.au 的，这里直接补上；其他人
--    在 /me 用 save_my_zid() 自己补填，填过就不能再改（要改找管理员）。
--
-- join_builderspace() 多了一个参数 p_zid（默认 null），旧版网站不传它也能调用；
-- 但跑完这个迁移、新版网站上线之前，用非 z 开头 UNSW 邮箱的人会生成卡片失败，
-- 所以跑完 SQL 尽快合并。

-- zID 不再只属于支持者 ----------------------------------------------------
alter table join_submissions
  drop constraint join_supporter_details,
  add constraint join_supporter_details check (
    case
      when affiliation_support then
        full_name is not null and zid is not null and affiliation_consent
      else
        full_name is null and not affiliation_consent
    end
  );

create or replace view join_interest_summary as
select
  count(*)::int as submissions,
  count(*) filter (where next_event_interest = 'yes')::int as next_event_yes,
  count(*) filter (where next_event_interest = 'maybe')::int as next_event_maybe,
  count(*) filter (where 'weekday_evening' = any (availability))::int as weekday_evening,
  count(*) filter (where 'weekend_day' = any (availability))::int as weekend_day,
  count(*) filter (where 'online' = any (availability))::int as online,
  -- 同一个 zID 重复提交只算一次；没勾支持的成员也有 zID，不算进来
  count(distinct zid) filter (where affiliation_support)::int as supporters
from join_submissions;

-- 从登录邮箱取 zID -----------------------------------------------------------
-- 和 src/lib/members.ts 的 zidFromEmail() 同一条规则。
create or replace function zid_from_email(mail text) returns text
language sql
immutable
as $$
  select case
    when lower(mail) ~ '^z[0-9]{7}@([a-z0-9-]+\.)*unsw\.edu\.au$'
      then split_part(lower(mail), '@', 1)
  end;
$$;

update join_submissions j
set zid = zid_from_email(u.email)
from auth.users u
where j.user_id = u.id
  and j.zid is null
  and zid_from_email(u.email) is not null;

-- 生成成员卡：多收一个 zID ---------------------------------------------------
drop function join_builderspace(text, text, text, text[], text, text, text[], text);

create function join_builderspace(
  p_nickname text,
  p_school_degree text,
  p_major text,
  p_skills text[],
  p_spark text,
  p_building text,
  p_looking_for text[],
  p_channel text,
  p_zid text default null
) returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mail text := lower(coalesce(auth.jwt() ->> 'email', ''));
  domain text := split_part(mail, '@', 2);
  is_school boolean := domain ~ '(^|\.)(edu|edu\.[a-z]{2}|ac\.[a-z]{2})$';
  is_unsw boolean := domain ~ '(^|\.)unsw\.edu\.au$';
  zid_in text := coalesce(zid_from_email(mail), lower(nullif(trim(p_zid), '')));
  join_id uuid;
  no int;
  base text;
  pick text;
  result profiles;
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;

  -- 已经生成过：直接返回，重复点按钮不会多占号。
  select * into result from profiles where id = uid;
  if found then
    return result;
  end if;

  if is_unsw and zid_in is null then
    raise exception 'UNSW members need a zID' using errcode = '22023';
  end if;

  -- 老成员认领时，运营会先把 join_submissions.user_id 填上，他们拿回原来的号。
  select id, member_no into join_id, no from join_submissions where user_id = uid;
  if join_id is null then
    insert into join_submissions (nickname, school_degree, major, skills, idea, channel, user_id, zid)
    values (
      p_nickname,
      coalesce(p_school_degree, ''),
      coalesce(p_major, ''),
      coalesce(p_skills, '{}'),
      nullif(trim(coalesce(p_building, '')), ''),
      p_channel,
      uid,
      zid_in
    )
    returning id, member_no into join_id, no;
  else
    update join_submissions set zid = coalesce(zid, zid_in) where id = join_id;
  end if;

  -- 公开链接用的短名：昵称里的英文数字，取不到就用编号。
  base := trim(both '-' from regexp_replace(lower(p_nickname), '[^a-z0-9]+', '-', 'g'));
  base := left(base, 24);
  if char_length(base) < 2 then
    base := 'builder-' || no;
  end if;
  pick := base;
  if exists (select 1 from profiles where handle = pick) then
    pick := left(base, 20) || '-' || no;
  end if;

  insert into profiles (
    id, member_no, handle, nickname, school_degree, major, skills, spark,
    building, looking_for, school_domain, school_verified_at
  ) values (
    uid, no, pick, p_nickname, coalesce(p_school_degree, ''), coalesce(p_major, ''),
    coalesce(p_skills, '{}'), p_spark, nullif(trim(coalesce(p_building, '')), ''),
    coalesce(p_looking_for, '{}'),
    case when is_school then domain end,
    case when is_school then now() end
  )
  returning * into result;

  return result;
end;
$$;

-- 问卷：已经有 zID 的不覆盖，没勾支持也不清掉 ---------------------------------
create or replace function save_join_survey(
  p_stalled_project boolean,
  p_blockers text[],
  p_referral_source text,
  p_next_event_interest text,
  p_showcase_consent boolean,
  p_affiliation_support boolean,
  p_full_name text,
  p_zid text,
  p_affiliation_consent boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  update join_submissions set
    stalled_project = p_stalled_project,
    blockers = coalesce(p_blockers, '{}'),
    referral_source = p_referral_source,
    next_event_interest = p_next_event_interest,
    showcase_consent = coalesce(p_showcase_consent, false),
    affiliation_support = coalesce(p_affiliation_support, false),
    full_name = case when p_affiliation_support then p_full_name end,
    zid = coalesce(zid, case when p_affiliation_support then lower(p_zid) end),
    affiliation_consent = coalesce(p_affiliation_support, false) and coalesce(p_affiliation_consent, false)
  where user_id = uid;
  if not found then
    raise exception 'no join record for this member' using errcode = 'P0002';
  end if;
end;
$$;

-- 本人的 zID：只给本人看，不把 join 记录整行开放给 API ------------------------
create or replace function my_zid() returns text
language sql
stable
security definer
set search_path = public
as $$
  select zid from join_submissions where user_id = auth.uid();
$$;

-- 补填 zID：只能填一次，返回最后存下的 zID -------------------------------------
create or replace function save_my_zid(p_zid text) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  saved text;
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  update join_submissions set zid = lower(trim(p_zid))
  where user_id = uid and zid is null
  returning zid into saved;
  if saved is null then
    select zid into saved from join_submissions where user_id = uid;
    if not found then
      raise exception 'no join record for this member' using errcode = 'P0002';
    end if;
  end if;
  return saved;
end;
$$;

revoke all on function zid_from_email(text) from public, anon, authenticated;
revoke all on function join_builderspace(text, text, text, text[], text, text, text[], text, text) from public, anon;
revoke all on function my_zid() from public, anon;
revoke all on function save_my_zid(text) from public, anon;
grant execute on function join_builderspace(text, text, text, text[], text, text, text[], text, text) to authenticated;
grant execute on function my_zid() to authenticated;
grant execute on function save_my_zid(text) to authenticated;

notify pgrst, 'reload schema';
