-- 社团已在 Arc 注册：不再收集支持者 ------------------------------------------
-- /me 问卷去掉了「支持 BuilderSpace 申请成为正式社团」那一段（姓名、zID、同意交给
-- Arc）。网站调用 save_join_survey() 时这几项固定传「不支持」，函数和列都不动：
-- Hub 的加入登记还在读 affiliation_support 和 full_name。
--
-- 已经登记的支持者：维护者先在 Hub 导出支持者名单，再跑这个迁移。
-- 1. 清掉姓名、支持和同意三项（join_supporter_details 要求三项一起清）。
-- 2. 只为这次申请留下的 zID 也清掉：20261025010000_join_zid 之前加入的支持者，
--    zID 来自问卷（或更早的加入表单），只留下能从登录邮箱取到的那个。之后加入的
--    人在加入时就留了 zID，问卷不会覆盖，所以保留。分界取 2026-10-26 悉尼零点，
--    宁可多清：被清掉的 UNSW 成员在 /me 会被请求重新补填 zID，作为成员资料。
-- 3. 每日汇总不再写「其中支持社团申请 N 人」，其余和 20261015050000 一样。

update join_submissions j set
  zid = case
    when j.affiliation_support
      and j.created_at < timestamptz '2026-10-26 00:00 Australia/Sydney'
      then (select zid_from_email(u.email) from auth.users u where u.id = j.user_id)
    else j.zid
  end,
  full_name = null,
  affiliation_support = false,
  affiliation_consent = false
where j.affiliation_support or j.full_name is not null or j.affiliation_consent;

create or replace function ops_daily_digest() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  joins int;
  volunteers_new int;
  projects_pending int;
  updates_pending int;
  comments_new int;
  comment_projects text;
begin
  select count(*) into joins
    from join_submissions
    where created_at > now() - interval '24 hours';
  select count(*) into volunteers_new from volunteer_applications where status = 'new';
  select count(*) into projects_pending from projects where review_status = 'pending';
  select count(*) into updates_pending from project_updates where review_status = 'pending';
  select count(*) into comments_new
    from project_comments
    where created_at > now() - interval '24 hours' and deleted_at is null;
  select string_agg(format('%s %s 条', ops_plain(name, 40), n), '、' order by n desc, name)
    into comment_projects
    from (
      select p.name, count(*) as n
      from project_comments c
      join projects p on p.id = c.project_id
      where c.created_at > now() - interval '24 hours' and c.deleted_at is null
      group by p.name
      order by n desc, p.name
      limit 5
    ) busiest;

  if joins + volunteers_new + projects_pending + updates_pending + comments_new = 0 then
    return;
  end if;
  perform ops_notify(
    format('[BuilderSpace] 每日汇总 · %s', to_char(now() at time zone 'Australia/Sydney', 'MM-DD')),
    format(
      E'过去 24 小时新报名：%s 人\n过去 24 小时新评论：%s 条%s\n未处理的核心成员申请：%s\n待审核：项目卡 %s · 进展 %s\n\n评论不用审核，要删除的在 project_comments 里填 deleted_at。\n去后台处理：%s',
      joins,
      comments_new, coalesce('（' || comment_projects || '）', ''),
      volunteers_new, projects_pending, updates_pending,
      'https://supabase.com/dashboard/project/lkvobwcqucngandunabd/editor'
    )
  );
end;
$$;
