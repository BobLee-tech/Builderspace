-- 项目卡封面与演示视频 --------------------------------------------------
-- Files go straight from the browser to Supabase Storage (resumable / tus),
-- then the project row stores their paths. Each picked file gets its own
-- <uuid>/ folder because uploads can't overwrite; the poster is one of eight
-- frames taken from the video (poster-0 … poster-7).
-- Both buckets are private: anyone may upload, but a file can only be read
-- once the project that points at it is approved, so pending uploads can't be
-- used as free public hosting. Ops review pending media in the dashboard's
-- Storage view.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-covers', 'project-covers', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('project-videos', 'project-videos', false, 52428800,
    array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table projects
  add column cover_path text
    check (cover_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/cover\.(jpg|png|webp)$'),
  -- Which part of the cover survives a 16:9 crop, as object-position percentages.
  add column cover_focus_x smallint not null default 50 check (cover_focus_x between 0 and 100),
  add column cover_focus_y smallint not null default 50 check (cover_focus_y between 0 and 100),
  add column video_path text
    check (video_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/video\.(mp4|webm|mov)$'),
  -- A frame the submitter picked from the video; stored in project-covers.
  add column video_poster_path text
    check (video_poster_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/poster-[0-7]\.jpg$'),
  add column video_seconds real check (video_seconds > 0 and video_seconds <= 180),
  add constraint projects_video_has_length check ((video_path is null) = (video_seconds is null));

-- Uploads: new objects only (no upsert, update or delete), and only under the
-- file names the site uses.
create policy "public uploads project covers" on storage.objects
  for insert to anon, authenticated with check (
    bucket_id = 'project-covers'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(cover\.(jpg|png|webp)|poster-[0-7]\.jpg)$'
  );

create policy "public uploads project videos" on storage.objects
  for insert to anon, authenticated with check (
    bucket_id = 'project-videos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/video\.(mp4|webm|mov)$'
  );

-- Reads (and signed URLs): only files an approved project points at. The
-- projects policy already hides unapproved rows from anon; the check repeats
-- it so the rule reads on its own.
create policy "public reads media of approved projects" on storage.objects
  for select to anon, authenticated using (
    bucket_id in ('project-covers', 'project-videos')
    and exists (
      select 1 from public.projects p
      where p.review_status = 'approved'
        and storage.objects.name in (p.cover_path, p.video_path, p.video_poster_path)
    )
  );
