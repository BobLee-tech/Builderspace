-- 投稿通知：访客提交后推到运营的企业微信群 -----------------------------------
-- 逐条推：新项目卡、新进展（待审核）、新志愿者申请。
-- 每天一条汇总：加入表单的报名数和各类待处理数量（报名逐条推会刷屏）。
--
-- 群机器人的 Webhook 地址等于密码，不进仓库。上线前在 SQL Editor 里存一次：
--   select vault.create_secret('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…', 'ops_webhook_url');
-- 换 key 时：
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'ops_webhook_url'),
--     'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…');
-- 没存这个地址时什么都不发，也不影响提交。
--
-- 消息里只放项目名、昵称这类本来就公开或不敏感的字段，不放联系方式和 zID。

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Sends one markdown message to the ops group. Never raises: a missing secret,
-- a bad key or WeCom being down must not fail the visitor's submission.
-- pg_net only queues the request; it goes out after the transaction commits.
create or replace function ops_notify(content text) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  url text;
begin
  select decrypted_secret into url
  from vault.decrypted_secrets
  where name = 'ops_webhook_url'
  limit 1;
  if url is null then
    return;
  end if;
  perform net.http_post(
    url := url,
    body := jsonb_build_object(
      'msgtype', 'markdown',
      'markdown', jsonb_build_object('content', left(content, 3800))
    )
  );
exception when others then
  raise warning 'ops_notify failed: %', sqlerrm;
end;
$$;

-- Visitor text goes into a markdown message: drop URLs (WeCom links bare ones
-- too), HTML tags and markdown characters so it can't add links or
-- formatting, flatten newlines and cut it short.
create or replace function ops_plain(value text, max_len int) returns text
language sql
immutable
set search_path = public
as $$
  select left(
    btrim(regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(value, ''), '(https?|ftp)://\S*|www\.\S+|<[^>]*>', ' ', 'gi'),
        '[\[\]()<>*`#_~|\\]', '', 'g'
      ),
      '\s+', ' ', 'g'
    )),
    max_len
  );
$$;

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
        else new.weekly_hours::text
      end
    );
  else
    return new;
  end if;

  perform ops_notify(msg || E'\n[去后台处理](' || dashboard || ')');
  return new;
end;
$$;

create trigger projects_notify_ops after insert on projects
  for each row execute function notify_ops_on_submit();
create trigger project_updates_notify_ops after insert on project_updates
  for each row execute function notify_ops_on_submit();
create trigger volunteer_applications_notify_ops after insert on volunteer_applications
  for each row execute function notify_ops_on_submit();

-- Daily digest ------------------------------------------------------------
create or replace function ops_daily_digest() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  joins int;
  supporters int;
  volunteers_new int;
  projects_pending int;
  updates_pending int;
begin
  select count(*), count(*) filter (where affiliation_support)
    into joins, supporters
    from join_submissions
    where created_at > now() - interval '24 hours';
  select count(*) into volunteers_new from volunteer_applications where status = 'new';
  select count(*) into projects_pending from projects where review_status = 'pending';
  select count(*) into updates_pending from project_updates where review_status = 'pending';

  if joins + volunteers_new + projects_pending + updates_pending = 0 then
    return;
  end if;
  perform ops_notify(format(
    E'**BuilderSpace 每日汇总**\n> 过去 24 小时新报名：%s 人（其中支持社团申请 %s 人）\n> 未处理的志愿者申请：%s\n> 待审核：项目卡 %s · 进展 %s\n[去后台处理](%s)',
    joins, supporters, volunteers_new, projects_pending, updates_pending,
    'https://supabase.com/dashboard/project/lkvobwcqucngandunabd/editor'
  ));
end;
$$;

-- 22:00 UTC is 9:00 in Sydney during daylight saving and 8:00 otherwise.
-- cron.schedule replaces an existing job with the same name.
select cron.schedule('ops-daily-digest', '0 22 * * *', 'select public.ops_daily_digest()');

-- None of these are for the API: anon could otherwise call
-- /rpc/ops_notify or /rpc/ops_daily_digest and spam the group.
revoke all on function ops_notify(text) from public, anon, authenticated;
revoke all on function ops_plain(text, int) from public, anon, authenticated;
revoke all on function notify_ops_on_submit() from public, anon, authenticated;
revoke all on function ops_daily_digest() from public, anon, authenticated;
