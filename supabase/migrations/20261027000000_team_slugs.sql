-- 成员页的个人介绍页地址 -----------------------------------------------------
-- 创始团队每人有一页 /people/<slug>（比如 /people/evan）。slug 由运营在
-- team_members 里填，小写字母开头，只用小写字母、数字和连字符；不填的人没有
-- 介绍页，卡片也点不开。介绍页的正文（经历、奖项、个人网站）在代码里：
-- src/lib/founder-profiles.ts。
-- team_list() 多返回一列 slug；返回的列变了，只能先删再建。
-- 依赖 20261026020000_team_members.sql。

alter table team_members
  add column slug text unique check (slug ~ '^[a-z][a-z0-9-]{1,31}$');

-- link_url 原来的检查写成 \S{1,300}，超过了 Postgres 正则重复次数的上限 255，
-- 一填链接就报 invalid repetition count。改成正则只管格式、长度单独查。
alter table team_members drop constraint team_members_link_url_check;
alter table team_members add constraint team_members_link_url_check
  check (link_url ~ '^https://\S+$' and char_length(link_url) <= 308);

drop function team_list();

create function team_list() returns table (
  id uuid,
  slug text,
  team text,
  "position" text,
  title text,
  display_name text,
  bio text,
  bio_en text,
  link_url text,
  avatar_path text,
  portrait_path text,
  spark text,
  handle text,
  member_no int,
  school_degree text,
  major text,
  skills text[],
  building text,
  looking_for text[],
  school_domain text,
  verified boolean,
  material text,
  tint text,
  pattern text,
  tagline text,
  stickers jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id, t.slug, t.team, t.position, t.title, t.display_name, t.bio, t.bio_en,
    t.link_url, t.avatar_path, t.portrait_path,
    coalesce(p.spark, t.spark),
    p.handle, p.member_no, p.school_degree, p.major, p.skills, p.building,
    p.looking_for,
    -- 学校域名只在认证过时给出，用来印校徽（UNSW / STUDENT）。
    case when p.school_verified_at is not null then p.school_domain end,
    p.school_verified_at is not null,
    c.material, c.tint, c.pattern, c.tagline, c.stickers
  from team_members t
  left join profiles p on p.id = t.member_id
  left join member_cards c on c.user_id = t.member_id
  where t.listed
  order by t.sort, t.created_at;
$$;

revoke all on function team_list() from public;
grant execute on function team_list() to anon, authenticated;
