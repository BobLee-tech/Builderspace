-- Caps how fast the public (anon/authenticated) can insert into the form
-- tables, so a scripted flood that skips the website still can't fill them.
-- Ops editing in the dashboard are not throttled.

create or replace function throttle_public_inserts() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  -- `role` reflects the API role even inside this security-definer function.
  if coalesce(current_setting('role', true), '') not in ('anon', 'authenticated') then
    return new;
  end if;
  execute format(
    'select count(*) from %I where created_at > now() - interval ''1 minute''',
    tg_table_name
  ) into recent;
  if recent >= tg_argv[0]::int then
    raise exception 'too many submissions, try again in a minute';
  end if;
  return new;
end;
$$;

revoke all on function throttle_public_inserts() from public, anon, authenticated;

create trigger join_submissions_throttle before insert on join_submissions
  for each row execute function throttle_public_inserts('20');
create trigger projects_throttle before insert on projects
  for each row execute function throttle_public_inserts('10');
create trigger project_updates_throttle before insert on project_updates
  for each row execute function throttle_public_inserts('10');
