-- 评论区：发起人默认标记 + 官网上的管理员删除按钮 --------------------------------
--
-- 1. 发起人：评论昵称和项目的发起人昵称（projects.owner_name）一样时（忽略大小写和
--    首尾空格），自动标为「发起人」。网站没有账号，别人也能用同一个昵称冒充；运营
--    可以在后台把 is_owner 改回 false，或者直接删掉那条评论。
--
-- 2. 管理员删除：官网 /admin 输入管理员口令后，评论旁会出现「删除」。口令只存在
--    Vault 里，校验和删除都在下面的数据库函数里做，网站照旧只用 anon key。
--    上线前在 SQL Editor 里存一个长随机口令（不进仓库）：
--      select vault.create_secret('<至少 24 位的随机字符串>', 'comment_admin_key');
--    换口令（旧口令登录的浏览器随之失效）：
--      select vault.update_secret(
--        (select id from vault.secrets where name = 'comment_admin_key'), '<新口令>');
--    没存口令时这个功能关闭。10 分钟内输错 10 次就暂停校验，防止猜口令。
--    删除只是填上 deleted_at，清空就恢复。

-- Owner by default ------------------------------------------------------------
create or replace function default_comment_owner() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_owner := new.is_owner or exists (
    select 1 from projects p
    where p.id = new.project_id
      and lower(btrim(p.owner_name)) = lower(btrim(new.nickname))
  );
  return new;
end;
$$;
revoke all on function default_comment_owner() from public, anon, authenticated;

create trigger project_comments_owner_default before insert on project_comments
  for each row execute function default_comment_owner();

-- RLS checks the row after BEFORE triggers, so the insert policy can no longer
-- require is_owner = false. Visitors still can't write the column (no grant);
-- only the trigger above sets it.
drop policy "public comments on approved projects" on project_comments;
create policy "public comments on approved projects" on project_comments
  for insert to anon, authenticated with check (
    deleted_at is null
    and exists (select 1 from projects p where p.id = project_id and p.review_status = 'approved')
    and (parent_id is null or project_comment_open_thread(parent_id, project_id))
  );

update project_comments c
set is_owner = true
from projects p
where p.id = c.project_id
  and not c.is_owner
  and lower(btrim(p.owner_name)) = lower(btrim(c.nickname));

-- Admin delete ------------------------------------------------------------------
create table comment_admin_attempts (
  id bigint generated always as identity primary key,
  ok boolean not null,
  at timestamptz not null default now()
);
create index comment_admin_attempts_at_idx on comment_admin_attempts (at);
alter table comment_admin_attempts enable row level security;
revoke all on comment_admin_attempts from anon, authenticated;

-- 'ok' | 'denied' | 'throttled'. Never raises, so a failed attempt is recorded
-- instead of rolled back.
create or replace function comment_admin_verdict(admin_key text) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  expected text;
begin
  if (select count(*) from comment_admin_attempts
      where not ok and at > now() - interval '10 minutes') >= 10 then
    return 'throttled';
  end if;
  select decrypted_secret into expected
  from vault.decrypted_secrets where name = 'comment_admin_key' limit 1;
  if expected is null or char_length(expected) < 24
     or admin_key is null or admin_key <> expected then
    insert into comment_admin_attempts (ok) values (false);
    return 'denied';
  end if;
  return 'ok';
end;
$$;
revoke all on function comment_admin_verdict(text) from public, anon, authenticated;

-- Sign-in check for /admin.
create or replace function check_comment_admin(admin_key text) returns text
language sql
security definer
set search_path = public
as $$
  select comment_admin_verdict(admin_key);
$$;

-- 'deleted' | 'missing' | 'denied' | 'throttled'
create or replace function delete_project_comment(comment_id uuid, admin_key text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  verdict text := comment_admin_verdict(admin_key);
begin
  if verdict <> 'ok' then
    return verdict;
  end if;
  update project_comments set deleted_at = now()
  where id = comment_id and deleted_at is null;
  return case when found then 'deleted' else 'missing' end;
end;
$$;

revoke all on function check_comment_admin(text) from public;
revoke all on function delete_project_comment(uuid, text) from public;
grant execute on function check_comment_admin(text) to anon, authenticated;
grant execute on function delete_project_comment(uuid, text) to anon, authenticated;
