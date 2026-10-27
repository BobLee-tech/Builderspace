-- 公开卡片 + 换登录邮箱 --------------------------------------------------------
-- 1. profiles.is_public 改成默认公开，已经加入的成员也一起打开（和
--    card_on_projects 一样）。成员在 /me 里可以关；关掉后个人卡片页 /m/<handle>
--    和 /people 的成员墙都不再显示这张卡。
-- 2. public_cards()：访客读公开卡片的唯一入口。只有卡片上本来就印着的字段，加上
--    短名和已批准项目的 slug；邮箱、学校域名、zID 都不出去。
-- 3. 换登录邮箱：网站用 Supabase 的 updateUser({ email }) 给新邮箱发 6 位码，验证
--    后 auth.users.email 才变。这里的触发器跟着改资料：
--    - 新邮箱是学校邮箱：补上认证（已经认证过的保留原来的认证时间）。
--    - 新邮箱不是学校邮箱：认证照旧保留，毕业后换回私人邮箱不会掉卡面。
--    - 新邮箱是 z1234567@…unsw.edu.au 且还没有 zID：从邮箱补上 zID。
--    src/lib/members.ts 的 afterEmailChange() 是同一条规则。
--    需要在 Supabase 后台关掉 Secure email change（只验证新邮箱），并在
--    Change Email Address 模板里放 {{ .Token }}。
-- 依赖 20261017000000_member_accounts.sql、20261017010000_member_cards.sql、
-- 20261025010000_join_zid.sql、20261026000000_project_owners_and_pitch.sql。

-- 默认公开 ------------------------------------------------------------------
alter table profiles alter column is_public set default true;

-- 不动 updated_at：这不是成员自己改的。
alter table profiles disable trigger profiles_touch;
update profiles set is_public = true where not is_public;
alter table profiles enable trigger profiles_touch;

-- 公开卡片 ------------------------------------------------------------------
create or replace function public_cards(p_handle text default null)
returns table (
  handle text,
  nickname text,
  member_no int,
  spark text,
  major text,
  school_degree text,
  skills text[],
  building text,
  looking_for text[],
  seal text,
  material text,
  tint text,
  pattern text,
  tagline text,
  stickers jsonb,
  projects text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.handle, f.nickname, f.member_no, f.spark, f.major, f.school_degree,
    f.skills, f.building, f.looking_for,
    -- Same words as the seal on the card (sealLabel in src/lib/members.ts).
    case
      when f.school_verified_at is null then null
      when f.school_domain ~ '(^|\.)unsw\.edu\.au$' then 'UNSW'
      else 'STUDENT'
    end,
    c.material, c.tint, c.pattern, c.tagline, c.stickers,
    array(
      select p.slug from projects p
      where p.owner_id = f.id and p.review_status = 'approved'
      order by p.created_at
    )
  from profiles f
  left join member_cards c on c.user_id = f.id
  where f.is_public
    and (p_handle is null or f.handle = lower(p_handle))
  order by f.member_no;
$$;

revoke all on function public_cards(text) from public;
grant execute on function public_cards(text) to anon, authenticated;

-- 换登录邮箱后同步资料 --------------------------------------------------------
create or replace function sync_member_email() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mail text := lower(coalesce(new.email, ''));
  domain text := split_part(mail, '@', 2);
  zid_in text := zid_from_email(mail);
begin
  if domain ~ '(^|\.)(edu|edu\.[a-z]{2}|ac\.[a-z]{2})$' then
    update profiles
    set school_domain = domain,
        school_verified_at = coalesce(school_verified_at, now())
    where id = new.id;
  end if;
  if zid_in is not null then
    update join_submissions set zid = zid_in
    where user_id = new.id and zid is null;
  end if;
  return new;
end;
$$;

revoke all on function sync_member_email() from public, anon, authenticated;

drop trigger if exists member_email_changed on auth.users;
create trigger member_email_changed
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function sync_member_email();

notify pgrst, 'reload schema';
