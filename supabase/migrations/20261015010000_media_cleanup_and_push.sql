-- 项目媒体：自动清理 + 封面 / 视频推到运营的企业微信群 --------------------------
--
-- 两件事都要调 Storage API（文件不能直接在 SQL 里删，签名链接也只能由 Storage 生成），
-- 所以需要 service role key。和 ops_webhook_url 一样只存在 Vault 里，上线前存一次：
--   select vault.create_secret('<Project Settings → API Keys 里的 service_role / secret key>', 'storage_service_key');
-- 没存时：不清理、不推媒体，文字通知照常。
--
-- 清理（每天一次，悉尼凌晨）：
--   · 上传了但没有任何项目引用的文件，24 小时后删（填了一半没提交、换掉的封面、
--     运营删掉的项目）。
--   · 被拒的项目 14 天后清掉媒体，项目行保留。
-- 推送：访客提交带封面或视频的项目卡后，约一分钟内群里多一张图文卡片：
--   点封面看原图，点视频直接播放。链接是 7 天有效的签名链接，只发在运营群里。

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Headers for Storage API calls as service role, or null when no key is stored.
-- Legacy service_role keys are JWTs and go in Authorization too; the newer
-- sb_secret_ keys only work as apikey.
create or replace function ops_storage_headers() returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  key text;
begin
  select decrypted_secret into key
  from vault.decrypted_secrets
  where name = 'storage_service_key'
  limit 1;
  if key is null then
    return null;
  end if;
  return jsonb_build_object('apikey', key, 'Content-Type', 'application/json')
    || case when key like 'eyJ%'
         then jsonb_build_object('Authorization', 'Bearer ' || key)
         else '{}'::jsonb
       end;
end;
$$;

create or replace function ops_storage_url() returns text
language sql
immutable
as $$ select 'https://lkvobwcqucngandunabd.supabase.co/storage/v1' $$;

-- Cleanup -----------------------------------------------------------------
-- Objects in the media buckets that nothing should keep: unreferenced for a
-- day, or belonging to a project rejected two weeks ago.
create or replace function media_to_delete(max_rows int default 500)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = public
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where o.bucket_id in ('project-covers', 'project-videos')
    and o.created_at < now() - interval '24 hours'
    and not exists (
      select 1 from projects p
      where o.name in (p.cover_path, p.video_path, p.video_poster_path)
        and not (p.review_status = 'rejected' and p.updated_at < now() - interval '14 days')
    )
  order by o.created_at
  limit max_rows;
$$;

-- Queues one DELETE per object. pg_net sends them after commit; one that fails
-- leaves the object in place and the next run tries again.
create or replace function cleanup_project_media() returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  headers jsonb := ops_storage_headers();
  o record;
  n int := 0;
begin
  if headers is null then
    raise notice 'cleanup_project_media: no storage_service_key in Vault, skipped';
    return 0;
  end if;
  for o in select * from media_to_delete() loop
    perform net.http_delete(
      url := ops_storage_url() || '/object/' || o.bucket_id || '/' || o.name,
      headers := headers
    );
    n := n + 1;
  end loop;
  -- Rejected projects stop pointing at media that is being deleted.
  update projects
  set cover_path = null, video_path = null, video_poster_path = null,
      video_seconds = null
  where review_status = 'rejected'
    and updated_at < now() - interval '14 days'
    and (cover_path is not null or video_path is not null or video_poster_path is not null);
  return n;
end;
$$;

-- 17:30 UTC is 4:30 in Sydney during daylight saving and 3:30 otherwise.
select cron.schedule('cleanup-project-media', '30 17 * * *', 'select public.cleanup_project_media()');

-- Push to WeCom -------------------------------------------------------------
-- One row per submitted project with media: the signing requests in flight,
-- until the card has gone out (or been given up on).
create table ops_media_pushes (
  project_id uuid primary key references projects (id) on delete cascade,
  cover_request bigint,
  video_request bigint,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
alter table ops_media_pushes enable row level security;
revoke all on ops_media_pushes from anon, authenticated;

-- After a visitor's insert: ask Storage to sign the files. The answers land in
-- net._http_response and ops_send_media() picks them up.
create or replace function queue_media_push() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  headers jsonb;
  covers text[];
  week constant int := 7 * 24 * 3600;
begin
  if coalesce(current_setting('role', true), '') not in ('anon', 'authenticated')
     or (new.cover_path is null and new.video_path is null) then
    return new;
  end if;
  headers := ops_storage_headers();
  if headers is null then
    return new;
  end if;
  covers := array_remove(array[new.cover_path, new.video_poster_path], null);
  insert into ops_media_pushes (project_id, cover_request, video_request)
  values (
    new.id,
    case when cardinality(covers) > 0 then net.http_post(
      url := ops_storage_url() || '/object/sign/project-covers',
      body := jsonb_build_object('expiresIn', week, 'paths', to_jsonb(covers)),
      headers := headers
    ) end,
    case when new.video_path is not null then net.http_post(
      url := ops_storage_url() || '/object/sign/project-videos',
      body := jsonb_build_object('expiresIn', week, 'paths', jsonb_build_array(new.video_path)),
      headers := headers
    ) end
  );
  return new;
exception when others then
  -- Never fail the visitor's submission over a notification.
  raise warning 'queue_media_push failed: %', sqlerrm;
  return new;
end;
$$;

create or replace trigger projects_push_media after insert on projects
  for each row execute function queue_media_push();

-- Signed URL per path from one sign response, or an empty object if it failed.
create or replace function ops_signed_urls(request bigint) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_object_agg(e->>'path', ops_storage_url() || (e->>'signedURL'))
     from net._http_response r,
          jsonb_array_elements(case when r.status_code = 200 then r.content::jsonb else '[]' end) e
     where r.id = request and e->>'signedURL' is not null),
    '{}'::jsonb
  );
$$;

-- Runs every minute: sends a news card for each project whose signing answers
-- are back. Gives up after 15 minutes so a broken key doesn't retry forever.
create or replace function ops_send_media() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  p projects;
  urls jsonb;
  url text;
  articles jsonb;
  hook text;
  pic text;
begin
  for r in
    select q.* from ops_media_pushes q where q.done_at is null order by q.created_at
  loop
    begin
      if (r.cover_request is not null and not exists (select 1 from net._http_response where id = r.cover_request))
         or (r.video_request is not null and not exists (select 1 from net._http_response where id = r.video_request)) then
        if r.created_at < now() - interval '15 minutes' then
          update ops_media_pushes set done_at = now() where project_id = r.project_id;
        end if;
        continue;
      end if;

      select * into p from projects where id = r.project_id;
      urls := coalesce(ops_signed_urls(r.cover_request), '{}') || coalesce(ops_signed_urls(r.video_request), '{}');
      articles := '[]'::jsonb;
      -- picurl must be JPG or PNG; a WebP cover falls back to the video frame.
      pic := coalesce(
        case when p.cover_path ~ '\.(jpg|png)$' then urls->>p.cover_path end,
        urls->>p.video_poster_path
      );
      if p.video_path is not null and urls ? p.video_path then
        articles := articles || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
          'title', format('演示视频 · %s · %s:%s', ops_plain(p.name, 40),
            floor(p.video_seconds / 60)::int, lpad((round(p.video_seconds)::int % 60)::text, 2, '0')),
          'description', '点开直接播放 · 待审核 · 链接 7 天内有效',
          'url', urls->>p.video_path,
          'picurl', pic
        )));
      end if;
      if p.cover_path is not null and urls ? p.cover_path then
        url := urls->>p.cover_path;
        articles := articles || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
          'title', format('封面 · %s', ops_plain(p.name, 40)),
          'description', '点开看原图 · 待审核 · 链接 7 天内有效',
          'url', url,
          'picurl', case when p.cover_path ~ '\.(jpg|png)$' then url end
        )));
      end if;

      if jsonb_array_length(articles) > 0 then
        select decrypted_secret into hook from vault.decrypted_secrets where name = 'ops_webhook_url' limit 1;
        if hook is not null then
          perform net.http_post(
            url := hook,
            body := jsonb_build_object('msgtype', 'news', 'news', jsonb_build_object('articles', articles))
          );
        end if;
      end if;
      update ops_media_pushes set done_at = now() where project_id = r.project_id;
    exception when others then
      raise warning 'ops_send_media % failed: %', r.project_id, sqlerrm;
      update ops_media_pushes set done_at = now() where project_id = r.project_id;
    end;
  end loop;
end;
$$;

select cron.schedule('ops-send-media', '* * * * *', 'select public.ops_send_media()');

-- Internal only: none of this belongs on the Data API.
revoke all on function ops_storage_headers() from public, anon, authenticated;
revoke all on function ops_storage_url() from public, anon, authenticated;
revoke all on function media_to_delete(int) from public, anon, authenticated;
revoke all on function cleanup_project_media() from public, anon, authenticated;
revoke all on function queue_media_push() from public, anon, authenticated;
revoke all on function ops_signed_urls(bigint) from public, anon, authenticated;
revoke all on function ops_send_media() from public, anon, authenticated;
