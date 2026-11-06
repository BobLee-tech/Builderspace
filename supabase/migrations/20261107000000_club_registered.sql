-- 社团已在 Arc 注册：不再收集支持者 ------------------------------------------
-- /me 问卷去掉了「支持 BuilderSpace 申请成为正式社团」那一段（姓名、zID、同意交给
-- Arc）。网站调用 save_join_survey() 时这几项固定传「不支持」，函数和列都不动：
-- Hub 的加入登记还在读 affiliation_support 和 full_name。
--
-- 每日汇总不再写「其中支持社团申请 N 人」，其余和 20261015050000 一样。

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
