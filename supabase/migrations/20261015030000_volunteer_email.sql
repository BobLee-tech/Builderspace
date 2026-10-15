-- 志愿者申请：必填只剩微信昵称、邮箱和职位 ---------------------------------
-- 邮箱用来开通内部协作系统的账号，所以单独一列；学校与学位、每周投入、个人介绍
-- 改成选填。原来的 contact（微信号或邮箱）只留给这次改动之前的申请，表单不再
-- 写它；每一行至少有邮箱或 contact 其中之一，保证都能联系上。
--
-- 和上线前的代码兼容：这个迁移先跑、代码后部署，旧表单照样能提交。

alter table volunteer_applications
  add column email text
    check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  alter column contact drop not null,
  alter column school_degree drop not null,
  alter column weekly_hours drop not null,
  alter column about drop not null,
  add constraint volunteer_applications_reachable
    check (email is not null or contact is not null);

grant insert (email) on volunteer_applications to anon, authenticated;

-- 企业微信通知：每周投入没填时写「未填」，不留空。其余和 20261014020000 相同，
-- 消息里照旧不放邮箱。
create or replace function notify_ops_on_submit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dashboard constant text :=
    'https://supabase.com/dashboard/project/lkvobwcqucngandunabd/editor';
  msg text;
begin
  -- Only visitors' submissions; ops working in the dashboard don't ping the group.
  if coalesce(current_setting('role', true), '') not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_table_name = 'projects' then
    msg := format(
      E'**新项目卡待审核** · %s\n> 目标用户：%s\n> 发起人：%s',
      ops_plain(new.name, 60),
      ops_plain(new.target_user, 80),
      ops_plain(new.owner_name, 40)
    );
  elsif tg_table_name = 'project_updates' then
    if new.review_status <> 'pending' then
      return new;
    end if;
    msg := format(
      E'**新进展待审核** · %s · %s\n> %s',
      coalesce(
        (select ops_plain(p.name, 60) from projects p where p.id = new.project_id),
        '未知项目'
      ),
      case new.kind::text
        when 'commit' then '代码提交'
        when 'demo' then 'Demo'
        when 'post' then '更新帖'
        else new.kind::text
      end,
      ops_plain(new.body, 120)
    );
  elsif tg_table_name = 'volunteer_applications' then
    msg := format(
      E'**新志愿者申请** · %s\n> 职位：%s\n> 每周投入：%s',
      ops_plain(new.nickname, 40),
      (
        select string_agg(
          case p
            when 'events' then '活动'
            when 'content' then '内容与渠道'
            when 'design_media' then '设计与影像'
            when 'partnerships' then '对外合作'
            when 'recruiting' then '招募与成员发展'
            when 'product' then '产品与项目'
            when 'web_tools' then '网站与工具'
            when 'teaching' then '教学与支持'
            when 'tech_explore' then '技术探索'
            when 'secretary' then '秘书与行政'
            when 'finance' then '财务'
            else p
          end,
          '、' order by ord
        )
        from unnest(new.positions) with ordinality as t(p, ord)
      ),
      case new.weekly_hours::text
        when 'lt2' then '2h 以内'
        when '2to5' then '2–5h'
        when 'gt5' then '5h 以上'
        else coalesce(new.weekly_hours::text, '未填')
      end
    );
  else
    return new;
  end if;

  perform ops_notify(msg || E'\n[去后台处理](' || dashboard || ')');
  return new;
end;
$$;
