-- 活动报名：收邮箱、发确认邮件、按邮箱去重、刷新后认出报过名的人 -----------------
-- 1. event_registrations 加 email（报名表必填；之前的记录和现场补登的人为空）和
--    confirmation_sent_at。同一场活动里邮箱也不能重复：微信号或邮箱任一报过，
--    register_for_event() 都返回原来那条，不新增，也不再发邮件。
-- 2. 新报名（包括取消后重新报名）写入后，用 Resend 给报名人发一封确认邮件，附
--    .ics 日历文件；候补的人收到候补版本。和运营通知共用 Vault 里的
--    resend_api_key。发件人默认 BuilderSpace <events@builderspace.dev>，想换就存：
--      select vault.create_secret('BuilderSpace <hi@builderspace.dev>', 'event_email_from');
--    没存 key 时不发，报名照常成功；每小时最多 120 封，防止被人刷表单时把 Resend
--    额度用光。pg_net 只是排队，事务提交后才真正发出。
-- 3. register_for_event() 多一个 p_email（有默认值：还没更新的线上页面照旧能报名），
--    并多返回报名 id。网站把 id 存在这台设备的 httpOnly cookie 里，刷新页面时用
--    my_event_registration() 认出已经报过名，直接显示成功页而不是表单。id 是随机
--    uuid，只有报名人自己的浏览器拿得到，所以凭它只能看到自己的名字、状态和打码的
--    邮箱。
-- 4. resend_event_confirmation()：成功页上的「重发」，同一条报名 10 分钟最多一次。

alter table event_registrations
  add column email text
    check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column confirmation_sent_at timestamptz;

create unique index event_registrations_email_key
  on event_registrations (event_id, lower(email));

-- 邮件里的文字 ------------------------------------------------------------
create or replace function html_text(value text) returns text
language sql
immutable
set search_path = public
as $$
  select replace(replace(replace(replace(replace(coalesce(value, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

-- RFC 5545 TEXT：反斜杠、分号、逗号转义，换行写成 \n（同 src/lib/ics.ts）。
create or replace function ics_text(value text) returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
    replace(replace(replace(coalesce(value, ''), '\', '\\'), ';', '\;'), ',', '\,'),
    '\r?\n', '\\n', 'g'
  );
$$;

-- 发确认邮件。从不报错：没配 key、Resend 挂了，都不能让报名失败。 -------------
create or replace function send_event_confirmation(p_registration_id uuid) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  site constant text := 'https://www.builderspace.dev';
  r event_registrations;
  ev events;
  api_key text;
  sender text;
  wait boolean;
  local_start timestamp;
  local_end timestamp;
  day_label text;
  time_label text;
  page_url text;
  subject text;
  heading text;
  lede text;
  after_note text;
  html text;
  body text;
  ics text;
begin
  select * into r from event_registrations where id = p_registration_id;
  if not found or r.email is null or r.status = 'cancelled' then
    return false;
  end if;
  select * into ev from events where id = r.event_id;

  select decrypted_secret into api_key
  from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if api_key is null then
    return false;
  end if;
  if (
    select count(*) from event_registrations
    where confirmation_sent_at > now() - interval '1 hour'
  ) >= 120 then
    raise warning 'send_event_confirmation: hourly cap reached';
    return false;
  end if;
  select decrypted_secret into sender
  from vault.decrypted_secrets where name = 'event_email_from' limit 1;

  wait := r.status = 'waitlist';
  local_start := ev.starts_at at time zone 'Australia/Sydney';
  local_end := ev.ends_at at time zone 'Australia/Sydney';
  day_label := to_char(local_start, 'YYYY"年"FMMM"月"FMDD"日"') || ' '
    || (array['周日', '周一', '周二', '周三', '周四', '周五', '周六'])[extract(dow from local_start)::int + 1];
  time_label := to_char(local_start, 'HH24:MI') || '–' || to_char(local_end, 'HH24:MI');
  page_url := site || '/events/' || ev.slug;

  if wait then
    subject := '你在候补名单上 · ' || ev.title;
    heading := r.full_name || '，你在候补名单上。';
    lede := '这场名额已满，你排在候补名单上。有人取消时会按报名顺序自动递补，递补上了我们会微信通知你。';
    after_note := '递补上了我们会用微信（' || r.wechat || '）联系你。';
  else
    subject := '报名成功 · ' || ev.title;
    heading := r.full_name || '，现场见！';
    lede := '你已经报名成功，名额为你保留。下面是活动信息，建议先加到日历（附件里的 .ics 文件）。';
    after_note := '截止后我们会用微信（' || r.wechat || '）拉你进参与者群。';
  end if;

  html := format(
    $html$<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f4f4f2;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;font-family:-apple-system,'PingFang SC','Helvetica Neue',Arial,sans-serif;color:#111;font-size:15px;line-height:1.6;">
<tr><td style="padding:28px 24px;border-radius:14px;background:#050505;color:#f4f4f2;">
<div style="font-family:Menlo,monospace;font-size:11px;letter-spacing:.1em;color:#8a8a90;">%s</div>
<div style="margin-top:8px;font-size:24px;line-height:1.25;font-weight:700;">%s</div>
</td></tr>
<tr><td style="padding:20px 4px 4px;">%s</td></tr>
<tr><td style="padding:8px 4px;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="font-size:14px;">
<tr><td style="padding:10px 0;width:72px;color:#888;border-bottom:1px solid #e4e4e0;">活动</td><td style="padding:10px 0;border-bottom:1px solid #e4e4e0;">%s</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #e4e4e0;">时间</td><td style="padding:10px 0;border-bottom:1px solid #e4e4e0;">%s %s<br><span style="color:#888;font-size:12px;">悉尼时间</span></td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #e4e4e0;">地点</td><td style="padding:10px 0;border-bottom:1px solid #e4e4e0;">%s</td></tr>
</table>
</td></tr>
<tr><td style="padding:20px 4px;"><a href="%s" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#050505;color:#fff;text-decoration:none;font-size:14px;">查看活动页</a></td></tr>
<tr><td style="padding:14px 4px 0;border-top:1px solid #e4e4e0;font-size:12px;color:#888;">%s<br>这封邮件是因为你在 builderspace.dev 报名了这场活动，不用回复。<br>BuilderSpace · Sydney</td></tr>
</table></body></html>$html$,
    case when wait then 'WAITLIST' else 'CONFIRMED' end,
    html_text(heading),
    html_text(lede),
    html_text(ev.title),
    html_text(day_label), html_text(time_label),
    html_text(ev.location),
    html_text(page_url),
    html_text(after_note)
  );
  body := format(
    E'%s\n\n%s\n\n活动：%s\n时间：%s %s（悉尼时间）\n地点：%s\n活动页：%s\n\n%s\n\nBuilderSpace · Sydney',
    heading, lede, ev.title, day_label, time_label, ev.location, page_url, after_note
  );
  ics := concat_ws(E'\r\n',
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BuilderSpace//Events//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    -- 和 /events.ics 订阅里的同一场活动用同一个 UID，日历里不会出现两条。
    'UID:' || ev.slug || '@www.builderspace.dev',
    'DTSTAMP:' || to_char(now() at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"'),
    'DTSTART:' || to_char(ev.starts_at at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"'),
    'DTEND:' || to_char(ev.ends_at at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"'),
    'SUMMARY:' || ics_text(ev.title),
    'LOCATION:' || ics_text(ev.location),
    'URL:' || page_url,
    'END:VEVENT',
    'END:VCALENDAR'
  ) || E'\r\n';

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', coalesce(sender, 'BuilderSpace <events@builderspace.dev>'),
      'to', jsonb_build_array(r.email),
      'subject', left(subject, 200),
      'html', html,
      'text', body,
      'attachments', jsonb_build_array(jsonb_build_object(
        'filename', ev.slug || '.ics',
        'content', replace(encode(convert_to(ics, 'UTF8'), 'base64'), E'\n', ''),
        'content_type', 'text/calendar; charset=utf-8; method=PUBLISH'
      ))
    )
  );
  update event_registrations set confirmation_sent_at = now() where id = r.id;
  return true;
exception when others then
  raise warning 'send_event_confirmation failed: %', sqlerrm;
  return false;
end;
$$;

-- 报名：同 20261019000000，多收邮箱、按邮箱也去重、发确认邮件、返回 id ---------
drop function register_for_event(text, text, text, text, text, text, text, text, boolean, text, text);

create function register_for_event(
  p_event_slug text,
  p_full_name text,
  p_wechat text,
  p_seat_group text,
  p_zid text,
  p_school text,
  p_occupation text,
  p_github_username text,
  p_photo_consent boolean default false,
  p_channel text default null,
  p_coding_level text default null,
  p_email text default null
) returns table (
  status registration_status,
  already_registered boolean,
  registration_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  ev events;
  wx text := trim(coalesce(p_wechat, ''));
  em text := nullif(lower(trim(coalesce(p_email, ''))), '');
  grp text := p_seat_group;
  sch text;
  prev_id uuid;
  prev_status registration_status;
  next_status registration_status;
  reg_id uuid;
begin
  -- 锁住活动这一行：同时报名的人排队取号，最后一个名额不会被两个人拿到。
  select * into ev from events e
  where e.slug = p_event_slug and e.published
  for update;
  if not found then
    raise exception 'event not found' using errcode = 'PT404';
  end if;
  if ev.registration_closes_at is null
     or now() >= ev.registration_closes_at
     or now() >= ev.starts_at then
    raise exception 'registration is closed' using errcode = 'PT410';
  end if;
  if ev.seat_quotas is not null and not ev.seat_quotas ? grp then
    raise exception 'this group is not open for this event' using errcode = 'PT422';
  end if;

  sch := case grp
    when 'unsw' then 'UNSW'
    when 'usyd' then 'USYD'
    when 'other_school' then nullif(trim(coalesce(p_school, '')), '')
  end;

  -- 微信号或邮箱任一对上就是同一个人：先看还有效的报名，再看取消过的，
  -- 取消过的里面优先微信号对上的那条。
  select r.id, r.status into prev_id, prev_status
  from event_registrations r
  where r.event_id = ev.id
    and (lower(r.wechat) = lower(wx) or (em is not null and lower(r.email) = em))
  order by r.status = 'cancelled', lower(r.wechat) = lower(wx) desc, r.created_at
  limit 1;
  if prev_id is not null and prev_status <> 'cancelled' then
    return query select prev_status, true, prev_id;
    return;
  end if;

  -- 同类已经有人在候补，就排在他们后面，不插队。
  next_status := case
    when event_seat_open(ev, grp) and not exists (
      select 1 from event_registrations r
      where r.event_id = ev.id and r.status = 'waitlist' and r.seat_group = grp
    ) then 'confirmed'
    else 'waitlist'
  end::registration_status;

  if prev_id is not null then
    -- 取消过又回来报名：用新填的信息重新排队。这个邮箱要是还挂在另一条取消过的
    -- 记录上，先从那条上拿掉，唯一索引才放得下。
    if em is not null then
      update event_registrations set email = null
      where event_id = ev.id and lower(email) = em and id <> prev_id;
    end if;
    update event_registrations set
      full_name = p_full_name,
      wechat = wx,
      email = em,
      seat_group = grp,
      zid = case when grp = 'unsw' then lower(trim(p_zid)) end,
      school = sch,
      occupation = case when grp = 'external' then nullif(trim(coalesce(p_occupation, '')), '') end,
      github_username = nullif(trim(coalesce(p_github_username, '')), ''),
      photo_consent = coalesce(p_photo_consent, false),
      coding_level = p_coding_level,
      channel = p_channel,
      status = next_status,
      confirmation_sent_at = null,
      created_at = now()
    where id = prev_id;
    reg_id := prev_id;
  else
    insert into event_registrations (
      event_id, full_name, wechat, email, seat_group, zid, school, occupation,
      github_username, photo_consent, coding_level, channel, status
    ) values (
      ev.id, p_full_name, wx, em, grp,
      case when grp = 'unsw' then lower(trim(p_zid)) end,
      sch,
      case when grp = 'external' then nullif(trim(coalesce(p_occupation, '')), '') end,
      nullif(trim(coalesce(p_github_username, '')), ''),
      coalesce(p_photo_consent, false), p_coding_level, p_channel, next_status
    )
    returning id into reg_id;
  end if;

  perform send_event_confirmation(reg_id);
  return query select next_status, false, reg_id;
end;
$$;

-- 这台设备报过名吗：凭 cookie 里的报名 id 认人 ----------------------------------
create or replace function my_event_registration(p_event_slug text, p_registration_id uuid)
returns table (
  full_name text,
  status registration_status,
  email_hint text,
  confirmation_sent_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.full_name,
    r.status,
    -- 只给第一个字母和域名：l•••@gmail.com
    case when r.email is not null then
      left(split_part(r.email, '@', 1), 1) || '•••@' || split_part(r.email, '@', 2)
    end,
    r.confirmation_sent_at
  from event_registrations r
  join events e on e.id = r.event_id
  where r.id = p_registration_id
    and e.slug = p_event_slug
    and r.status <> 'cancelled';
$$;

-- 重发确认邮件：sent / wait（10 分钟内发过）/ missing / failed -------------------
create or replace function resend_event_confirmation(p_registration_id uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  r event_registrations;
begin
  select * into r from event_registrations where id = p_registration_id for update;
  if not found or r.status = 'cancelled' or r.email is null then
    return 'missing';
  end if;
  if r.confirmation_sent_at > now() - interval '10 minutes' then
    return 'wait';
  end if;
  if send_event_confirmation(r.id) then
    return 'sent';
  end if;
  return 'failed';
end;
$$;

revoke all on function html_text(text) from public, anon, authenticated;
revoke all on function ics_text(text) from public, anon, authenticated;
revoke all on function send_event_confirmation(uuid) from public, anon, authenticated;
revoke all on function register_for_event(text, text, text, text, text, text, text, text, boolean, text, text, text) from public;
revoke all on function my_event_registration(text, uuid) from public;
revoke all on function resend_event_confirmation(uuid) from public;
grant execute on function register_for_event(text, text, text, text, text, text, text, text, boolean, text, text, text) to anon, authenticated;
grant execute on function my_event_registration(text, uuid) to anon, authenticated;
grant execute on function resend_event_confirmation(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
