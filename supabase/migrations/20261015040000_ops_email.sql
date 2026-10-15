-- 投稿通知改发邮件，停用企业微信 ------------------------------------------------
-- 企业微信企业号被永久封禁（理由「疑似欺诈」），群机器人推的境外签名链接很可能
-- 是诱因。通知改用 Resend 发纯文本邮件给运营，可以发给多人；企业微信相关的
-- Webhook、图文卡片推送和 Vault 里的地址全部删掉。
--
-- 上线前在 SQL Editor 里存两项（只存在 Vault，不进仓库）：
--   select vault.create_secret('re_…', 'resend_api_key');
--   select vault.create_secret('a@example.com, b@example.com', 'ops_email_to');
-- 发件人默认是 BuilderSpace <notify@builderspace.dev>，需要先在 Resend 里验证
-- builderspace.dev（Cloudflare DNS 加它给的记录）。想换发件人再存一项：
--   select vault.create_secret('BuilderSpace <ops@builderspace.dev>', 'ops_email_from');
-- 加减收件人：
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'ops_email_to'), 'a@…, b@…, c@…');
-- 没存 key 或收件人时什么都不发，也不影响提交。
--
-- 每小时最多 30 封，超出的不发（第二天的汇总里仍会算进待处理数），防止被人刷表单
-- 时把 Resend 额度用光。邮件里照旧只有项目名、昵称这类不敏感的字段。

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- WeCom: stop the media cards and forget the webhook ---------------------------
select cron.unschedule(jobid) from cron.job where jobname = 'ops-send-media';
drop trigger if exists projects_push_media on projects;
drop function if exists ops_send_media();
drop function if exists queue_media_push();
drop function if exists ops_signed_urls(bigint);
drop table if exists ops_media_pushes;
delete from vault.secrets where name = 'ops_webhook_url';
drop function if exists ops_notify(text);

-- Email -------------------------------------------------------------------
create table ops_email_log (
  id bigint generated always as identity primary key,
  subject text not null,
  sent_at timestamptz not null default now()
);
alter table ops_email_log enable row level security;
revoke all on ops_email_log from anon, authenticated;

-- Sends one plain-text email to every address in ops_email_to. Never raises:
-- a missing secret, a bad key or Resend being down must not fail the visitor's
-- submission. pg_net only queues the request; it goes out after commit.
create or replace function ops_notify(subject text, body text) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  api_key text;
  recipients text[];
  sender text;
begin
  select decrypted_secret into api_key
  from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  select array_agg(addr) into recipients
  from unnest(regexp_split_to_array(
    (select decrypted_secret from vault.decrypted_secrets where name = 'ops_email_to' limit 1),
    '[,;\s]+'
  )) addr
  where addr like '%@%';
  if api_key is null or recipients is null then
    return;
  end if;
  if (select count(*) from ops_email_log where sent_at > now() - interval '1 hour') >= 30 then
    raise warning 'ops_notify: hourly cap reached, skipped "%"', subject;
    return;
  end if;
  select decrypted_secret into sender
  from vault.decrypted_secrets where name = 'ops_email_from' limit 1;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', coalesce(sender, 'BuilderSpace <notify@builderspace.dev>'),
      'to', to_jsonb(recipients),
      'subject', left(subject, 200),
      'text', left(body, 8000)
    )
  );
  insert into ops_email_log (subject) values (left(subject, 200));
exception when others then
  raise warning 'ops_notify failed: %', sqlerrm;
end;
$$;

create or replace function notify_ops_on_submit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dashboard constant text :=
    'https://supabase.com/dashboard/project/lkvobwcqucngandunabd/editor';
  subject text;
  body text;
begin
  -- Only visitors' submissions; ops working in the dashboard don't get mail.
  if coalesce(current_setting('role', true), '') not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_table_name = 'projects' then
    subject := format('新项目卡待审核 · %s', ops_plain(new.name, 60));
    body := format(
      E'项目：%s\n目标用户：%s\n发起人：%s\n媒体：%s',
      ops_plain(new.name, 60),
      ops_plain(new.target_user, 80),
      ops_plain(new.owner_name, 40),
      coalesce(nullif(concat_ws('、',
        case when new.cover_path is not null then '封面' end,
        case when new.video_path is not null then '演示视频' end
      ), ''), '无')
    );
  elsif tg_table_name = 'project_updates' then
    if new.review_status <> 'pending' then
      return new;
    end if;
    subject := format('新进展待审核 · %s', coalesce(
      (select ops_plain(p.name, 60) from projects p where p.id = new.project_id),
      '未知项目'
    ));
    body := format(
      E'类型：%s\n内容：%s',
      case new.kind::text
        when 'commit' then '代码提交'
        when 'demo' then 'Demo'
        when 'post' then '更新帖'
        else new.kind::text
      end,
      ops_plain(new.body, 300)
    );
  elsif tg_table_name = 'volunteer_applications' then
    subject := format('新志愿者申请 · %s', ops_plain(new.nickname, 40));
    body := format(
      E'昵称：%s\n职位：%s\n每周投入：%s',
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

  perform ops_notify('[BuilderSpace] ' || subject, body || E'\n\n去后台处理：' || dashboard);
  return new;
end;
$$;

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
  perform ops_notify(
    format('[BuilderSpace] 每日汇总 · %s', to_char(now() at time zone 'Australia/Sydney', 'MM-DD')),
    format(
      E'过去 24 小时新报名：%s 人（其中支持社团申请 %s 人）\n未处理的志愿者申请：%s\n待审核：项目卡 %s · 进展 %s\n\n去后台处理：%s',
      joins, supporters, volunteers_new, projects_pending, updates_pending,
      'https://supabase.com/dashboard/project/lkvobwcqucngandunabd/editor'
    )
  );
end;
$$;

-- Re-register in case it was unscheduled while WeCom was being shut off.
-- 22:00 UTC is 9:00 in Sydney during daylight saving and 8:00 otherwise.
select cron.schedule('ops-daily-digest', '0 22 * * *', 'select public.ops_daily_digest()');

-- None of these are for the API: anon could otherwise call /rpc/ops_notify.
revoke all on function ops_notify(text, text) from public, anon, authenticated;
revoke all on function notify_ops_on_submit() from public, anon, authenticated;
revoke all on function ops_daily_digest() from public, anon, authenticated;
