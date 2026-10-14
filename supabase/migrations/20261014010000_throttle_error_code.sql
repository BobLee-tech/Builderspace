-- Give the public-insert throttle its own SQLSTATE so the site can tell
-- "too many submissions" apart from a real failure and ask people to retry in
-- a minute. A PTxxx code also makes PostgREST answer with HTTP 429.

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
    raise exception using
      errcode = 'PT429',
      message = 'too many submissions, try again in a minute';
  end if;
  return new;
end;
$$;

revoke all on function throttle_public_inserts() from public, anon, authenticated;
