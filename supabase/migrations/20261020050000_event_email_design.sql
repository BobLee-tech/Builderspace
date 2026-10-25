-- 报名确认邮件换成有社团标识的设计 ---------------------------------------------
-- send_event_confirmation()（20261020040000）的邮件改成：顶部拼图 Logo +
-- BuilderSpace，黑色头图里五个吉祥物，活动做成一张带撕口的票（日期 / 时间 /
-- 地点，下半截参加者、微信号、状态），「加到 Google 日历」按钮，三步「接下来」，
-- 页脚标语和官网链接。候补的人写报名那一刻排在同类候补的第几位。
-- 图片是网站上的 PNG（Gmail 不显示 SVG）：public/email/，由
-- scripts/generate-email-images.mjs 生成。先部署网站、再跑这个迁移，不然邮件里
-- 的图片是空的。邮箱拦截图片时，文字和按钮照常可读。
-- 手机上（窄于 520px）日期、时间、地点改成一行一个，「11月5日」不折行。

-- URL 里的参数：除字母、数字和 -._~ 以外都按 UTF-8 字节转成 %XX。
create or replace function url_encode(value text) returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(string_agg(
    case
      when b between 48 and 57 or b between 65 and 90 or b between 97 and 122
        or b in (45, 46, 95, 126) then chr(b)
      else '%' || upper(lpad(to_hex(b), 2, '0'))
    end, '' order by i), '')
  from (
    select i, get_byte(bytes, i) as b
    from (select convert_to(coalesce(value, ''), 'UTF8') as bytes) v,
      generate_series(0, octet_length(v.bytes) - 1) as i
  ) s;
$$;

revoke all on function url_encode(text) from public, anon, authenticated;

create or replace function send_event_confirmation(p_registration_id uuid) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  site constant text := 'https://www.builderspace.dev';
  img constant text := 'https://www.builderspace.dev/email/';
  font constant text := '-apple-system,BlinkMacSystemFont,''PingFang SC'',''Hiragino Sans GB'',''Microsoft YaHei'',''Helvetica Neue'',Arial,sans-serif';
  mono constant text := '''SFMono-Regular'',Menlo,Consolas,monospace';
  label constant text := 'font-family:' || mono || ';font-size:10px;letter-spacing:.12em;color:#8a8a90;';
  r event_registrations;
  ev events;
  api_key text;
  sender text;
  wait boolean;
  place int;
  local_start timestamp;
  local_end timestamp;
  date_label text;
  date_sub text;
  dow text;
  time_label text;
  kind_label text;
  page_url text;
  gcal_url text;
  map_url text;
  subject text;
  heading text;
  lede text;
  status_line text;
  steps text[][];
  step_rows text := '';
  sparks text := '';
  html text;
  body text;
  ics text;
  i int;
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
  if wait then
    -- 递补按报名顺序、同一类名额来，所以排位也只数同类。
    select count(*) into place from event_registrations w
    where w.event_id = r.event_id and w.status = 'waitlist'
      and w.seat_group = r.seat_group
      and (w.created_at, w.id) <= (r.created_at, r.id);
  end if;

  local_start := ev.starts_at at time zone 'Australia/Sydney';
  local_end := ev.ends_at at time zone 'Australia/Sydney';
  date_label := to_char(local_start, 'FMMM"月"FMDD"日"');
  dow := (array['周日', '周一', '周二', '周三', '周四', '周五', '周六'])[extract(dow from local_start)::int + 1];
  date_sub := to_char(local_start, 'YYYY') || ' · ' || dow;
  time_label := to_char(local_start, 'HH24:MI') || ' – ' || to_char(local_end, 'HH24:MI');
  kind_label := case ev.kind::text
    when 'workshop' then 'WORKSHOP'
    when 'build_night' then 'BUILD NIGHT'
    when 'demo_night' then 'DEMO NIGHT'
    when 'online' then 'ONLINE'
    else 'EVENT'
  end;
  page_url := site || '/events/' || ev.slug;
  gcal_url := 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    || '&text=' || url_encode(ev.title)
    || '&dates=' || to_char(ev.starts_at at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"')
    || '/' || to_char(ev.ends_at at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"')
    || '&location=' || url_encode(ev.location)
    || '&details=' || url_encode(page_url)
    || '&ctz=Australia%2FSydney';
  map_url := 'https://www.google.com/maps/search/?api=1&query='
    || url_encode(ev.location || ', Sydney');

  if wait then
    subject := '你在候补名单上 · ' || ev.title;
    heading := r.full_name || '，<br>你在候补名单上。';
    lede := '这场名额已满。有人取消时会按报名顺序自动递补，递补上了我们会微信通知你。';
    status_line := '候补第 ' || place || ' 位';
    steps := array[
      ['01', '等递补', '有人取消就按报名顺序递补，递补上了我们会微信通知你。'],
      ['02', '留意微信', '用的是你报名时填的微信号（' || r.wechat || '）。'],
      ['03', '准时到场', '递补上了的话，提前 10 分钟到，找工作人员签到。']
    ];
  else
    subject := '报名成功 · ' || ev.title;
    heading := r.full_name || '，<br>现场见！';
    lede := '报名成功，名额已经为你保留。下面是你的活动票，先加到日历，当天见。';
    status_line := '已确认';
    steps := array[
      ['01', '加到日历', '用上面的按钮或附件里的 .ics，别错过时间。'],
      ['02', '进参与者群', '截止后我们用微信（' || r.wechat || '）拉你进群。'],
      ['03', '准时到场', '提前 10 分钟到，找工作人员签到。']
    ];
  end if;

  for i in 1 .. 3 loop
    step_rows := step_rows
      || '<tr><td width="34" style="vertical-align:top;padding:6px 0;font-family:' || mono
      || ';font-size:12px;font-weight:700;color:#050505;">' || steps[i][1] || '</td>'
      || '<td style="vertical-align:top;padding:6px 0;font-size:14px;line-height:1.6;color:#666666;">'
      || '<b style="color:#050505;">' || html_text(steps[i][2]) || '</b>&nbsp;&nbsp; '
      || html_text(steps[i][3]) || '</td></tr>';
  end loop;

  for i in 1 .. 5 loop
    sparks := sparks
      || '<td style="padding:0 ' || case when i = 5 then '0' else '6px' end
      || ' 0 0;vertical-align:bottom;"><img src="' || img
      || (array['vivi', 'lumi', 'geo', 'momo', 'kiko'])[i] || '.png" width="48" height="48" alt="'
      || (array['Vivi', 'Lumi', 'Geo', 'Momo', 'Kiko'])[i]
      || '" style="display:block;border:0;width:48px;height:48px;font-size:10px;color:#8a8a90;"></td>';
  end loop;

  html := '<!doctype html><html lang="zh"><head><meta charset="utf-8">'
    || '<meta name="viewport" content="width=device-width,initial-scale=1">'
    || '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">'
    || '<title>' || html_text(subject) || '</title>'
    || '<style>@media (max-width:520px){'
    || '.bs-pad{padding-left:20px!important;padding-right:20px!important}'
    || '.bs-h1{font-size:27px!important}'
    || '.bs-col{display:block!important;width:auto!important;border-right:0!important;border-bottom:1px solid #e6e6e2!important;padding:12px 16px!important}'
    || '.bs-col-last{border-bottom:0!important}'
    || '}</style></head>'
    || '<body style="margin:0;padding:0;background:#ecece8;">'
    -- 收件箱列表里标题后面那一行灰字。
    || '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">'
    || html_text(date_label || ' ' || dow || ' ' || time_label || ' · ' || ev.location)
    || '</div>'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecece8;">'
    || '<tr><td align="center" style="padding:28px 12px 36px;">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:' || font || ';color:#111111;">'

    -- 顶部：Logo
    || '<tr><td style="padding:0 4px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
    || '<td style="vertical-align:middle;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>'
    || '<td style="vertical-align:middle;padding-right:8px;"><a href="' || site || '"><img src="' || img
    || 'mark.png" width="38" height="24" alt="" style="display:block;border:0;width:38px;height:24px;"></a></td>'
    || '<td style="vertical-align:middle;font-size:16px;font-weight:800;letter-spacing:-.02em;">'
    || '<a href="' || site || '" style="color:#050505;text-decoration:none;">BuilderSpace</a></td>'
    || '</tr></table></td>'
    || '<td align="right" style="vertical-align:middle;' || label || 'letter-spacing:.14em;">EVENT PASS</td>'
    || '</tr></table></td></tr>'

    -- 黑色头图
    || '<tr><td class="bs-pad" style="background:#050505;border-radius:20px 20px 0 0;padding:30px 28px 0;">'
    || '<table role="presentation" cellpadding="0" cellspacing="0"><tr>'
    || '<td style="border:1px solid #3a3a3d;border-radius:999px;padding:5px 12px;font-family:' || mono
    || ';font-size:10px;letter-spacing:.14em;color:#f4f4f2;">'
    || '<span style="color:' || case when wait then '#8a8a90' else '#f4f4f2' end || ';">&#9679;</span>&nbsp; '
    || case when wait then 'WAITLIST · 候补中' else 'CONFIRMED · 报名成功' end
    || '</td></tr></table>'
    || '<div class="bs-h1" style="margin-top:18px;font-size:32px;line-height:1.2;font-weight:800;letter-spacing:-.03em;color:#ffffff;">'
    || replace(html_text(heading), '&lt;br&gt;', '<br>') || '</div>'
    || '<div style="margin-top:12px;font-size:14px;line-height:1.7;color:#a8a8ae;">' || html_text(lede) || '</div>'
    || '<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr>' || sparks || '</tr></table>'
    || '</td></tr>'

    -- 票：活动和时间地点
    || '<tr><td class="bs-pad" style="background:#ffffff;padding:26px 28px 22px;">'
    || '<div style="' || label || 'letter-spacing:.14em;">' || kind_label || '</div>'
    || '<div style="margin-top:6px;font-size:22px;line-height:1.3;font-weight:800;letter-spacing:-.02em;color:#050505;">'
    || html_text(ev.title) || '</div>'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #e6e6e2;border-radius:14px;"><tr>'
    || '<td class="bs-col" width="34%" style="padding:14px 16px;border-right:1px solid #e6e6e2;vertical-align:top;">'
    || '<div style="' || label || '">DATE · 日期</div>'
    || '<div style="margin-top:4px;font-size:20px;font-weight:800;letter-spacing:-.02em;color:#050505;white-space:nowrap;">' || date_label || '</div>'
    || '<div style="font-size:12px;color:#666666;">' || date_sub || '</div></td>'
    || '<td class="bs-col" width="33%" style="padding:14px 16px;border-right:1px solid #e6e6e2;vertical-align:top;">'
    || '<div style="' || label || '">TIME · 时间</div>'
    || '<div style="margin-top:4px;font-size:15px;font-weight:700;color:#050505;white-space:nowrap;">' || time_label || '</div>'
    || '<div style="font-size:12px;color:#666666;">悉尼时间</div></td>'
    || '<td class="bs-col bs-col-last" width="33%" style="padding:14px 16px;vertical-align:top;">'
    || '<div style="' || label || '">WHERE · 地点</div>'
    || '<div style="margin-top:4px;font-size:15px;font-weight:700;color:#050505;">' || html_text(ev.location) || '</div>'
    || '<div style="font-size:12px;"><a href="' || html_text(map_url) || '" style="color:#666666;">在地图上看 ↗</a></div></td>'
    || '</tr></table></td></tr>'

    -- 撕口
    || '<tr><td style="background:#ffffff;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
    || '<td width="14" style="width:14px;background:#ecece8;border-radius:0 14px 14px 0;height:28px;font-size:0;line-height:0;">&nbsp;</td>'
    || '<td style="padding:0 10px;"><div style="border-top:2px dashed #dcdcd7;height:0;font-size:0;line-height:0;">&nbsp;</div></td>'
    || '<td width="14" style="width:14px;background:#ecece8;border-radius:14px 0 0 14px;height:28px;font-size:0;line-height:0;">&nbsp;</td>'
    || '</tr></table></td></tr>'

    -- 票根：参加者、按钮
    || '<tr><td class="bs-pad" style="background:#ffffff;padding:18px 28px 26px;">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
    || '<td style="vertical-align:top;padding-right:12px;"><div style="' || label || '">ATTENDEE</div>'
    || '<div style="margin-top:4px;font-size:15px;font-weight:700;color:#050505;">' || html_text(r.full_name) || '</div></td>'
    || '<td style="vertical-align:top;padding-right:12px;"><div style="' || label || '">WECHAT</div>'
    || '<div style="margin-top:4px;font-size:15px;font-weight:700;color:#050505;word-break:break-all;">' || html_text(r.wechat) || '</div></td>'
    || '<td align="right" style="vertical-align:top;"><div style="' || label || '">STATUS</div>'
    || '<div style="margin-top:4px;font-size:15px;font-weight:700;color:#050505;white-space:nowrap;">' || status_line || '</div></td>'
    || '</tr></table>'
    || '<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr>'
    || '<td style="padding:0 8px 8px 0;"><a href="' || html_text(gcal_url)
    || '" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#050505;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">加到 Google 日历 &rarr;</a></td>'
    || '<td style="padding:0 0 8px;"><a href="' || html_text(page_url)
    || '" style="display:inline-block;padding:11px 19px;border-radius:999px;border:1px solid #cfcfca;color:#050505;font-size:14px;font-weight:600;text-decoration:none;">查看活动页</a></td>'
    || '</tr></table>'
    || '<div style="font-size:12px;color:#8a8a90;">苹果日历 / Outlook：点开附件里的 .ics 就能添加。</div>'
    || '</td></tr>'

    -- 接下来
    || '<tr><td class="bs-pad" style="background:#f6f6f3;border-top:1px solid #ecece8;border-radius:0 0 20px 20px;padding:22px 28px 24px;">'
    || '<div style="' || label || 'letter-spacing:.14em;">接下来 · NEXT</div>'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">' || step_rows || '</table>'
    || '</td></tr>'

    -- 页脚
    || '<tr><td align="center" style="padding:28px 16px 0;">'
    || '<img src="' || img || 'mark.png" width="44" height="28" alt="" style="display:block;border:0;width:44px;height:28px;margin:0 auto 10px;">'
    || '<div style="font-size:14px;font-weight:800;letter-spacing:-.01em;color:#050505;">BuilderSpace</div>'
    || '<div style="margin-top:2px;' || label || '">BRING AN IDEA. MAKE IT WORK.</div>'
    || '<div style="margin-top:12px;font-size:12px;color:#666666;">'
    || '<a href="' || site || '" style="color:#050505;">官网</a>&nbsp;&nbsp;·&nbsp;&nbsp;'
    || '<a href="' || site || '/events" style="color:#050505;">更多活动</a>&nbsp;&nbsp;·&nbsp;&nbsp;'
    || '<a href="' || site || '/join" style="color:#050505;">加入社团</a></div>'
    || '<div style="margin-top:14px;font-size:11px;line-height:1.7;color:#9a9a9f;">'
    || '从 UNSW 起步的中英双语创客社 · Sydney<br>这封邮件是因为你在 builderspace.dev 报名了这场活动，不用回复。</div>'
    || '</td></tr>'

    || '</table></td></tr></table></body></html>';

  body := replace(heading, '<br>', '') || E'\n\n' || lede || E'\n\n'
    || '活动：' || ev.title || E'\n'
    || '时间：' || to_char(local_start, 'YYYY"年"') || date_label || ' ' || dow || ' ' || time_label || E'（悉尼时间）\n'
    || '地点：' || ev.location || E'\n'
    || '状态：' || status_line || E'\n\n'
    || '加到 Google 日历：' || gcal_url || E'\n'
    || '活动页：' || page_url || E'\n\n'
    || '接下来' || E'\n'
    || steps[1][1] || ' ' || steps[1][2] || '：' || steps[1][3] || E'\n'
    || steps[2][1] || ' ' || steps[2][2] || '：' || steps[2][3] || E'\n'
    || steps[3][1] || ' ' || steps[3][2] || '：' || steps[3][3] || E'\n\n'
    || 'BuilderSpace · Bring an idea. Make it work.' || E'\n' || site;

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

revoke all on function send_event_confirmation(uuid) from public, anon, authenticated;
