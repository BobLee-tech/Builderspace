-- 创始人也出现在下面的部门里，用自己的成员卡 ---------------------------------
-- 三位创始人除了上面的大照片，也各自在一个部门里有一张成员卡：dept 是部门，
-- position 是在那个部门里的职位（和核心成员一样，必须属于这个部门）。
--
-- 成员卡跟账号走：member_no 记这个人加入时的编号（join_submissions.member_no）。
-- 有了这个编号的账号（profiles.member_no）以后，卡面就是他自己在 /me/card 设计、
-- 自己能改的那张；还没开通账号时显示默认卡面和这个编号。member_id 仍然优先。
-- team_list() 多返回 dept，member_no 在没有账号时取这里的编号；返回的列变了，
-- 只能先删再建。依赖 20261027000000_team_slugs.sql。

alter table team_members
  add column dept text check (dept in ('ops', 'tech', 'events')),
  add column member_no int check (member_no > 0),
  add constraint team_members_dept_founders_only check (dept is null or team = 'founder');

-- 职位跟着部门走：核心成员看 team，创始人看 dept；创始人不在部门里时没有职位。
alter table team_members drop constraint team_members_check;
alter table team_members add constraint team_members_position_check check (coalesce(
  (team = 'founder' and dept is null and position is null)
  or (coalesce(dept, team) = 'ops' and position in ('content', 'design_media', 'recruiting'))
  or (coalesce(dept, team) = 'tech' and position in ('product', 'web_tools', 'teaching', 'tech_explore'))
  or (coalesce(dept, team) = 'events' and position in ('events', 'partnerships')),
  false
));

drop function team_list();

create function team_list() returns table (
  id uuid,
  slug text,
  team text,
  dept text,
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
    t.id, t.slug, t.team, t.dept, t.position, t.title, t.display_name, t.bio, t.bio_en,
    t.link_url, t.avatar_path, t.portrait_path,
    coalesce(p.spark, t.spark),
    p.handle, coalesce(p.member_no, t.member_no), p.school_degree, p.major, p.skills,
    p.building, p.looking_for,
    -- 学校域名只在认证过时给出，用来印校徽（UNSW / STUDENT）。
    case when p.school_verified_at is not null then p.school_domain end,
    p.school_verified_at is not null,
    c.material, c.tint, c.pattern, c.tagline, c.stickers
  from team_members t
  -- 账号：member_id 优先，否则按加入编号找
  left join profiles p on p.id = coalesce(
    t.member_id,
    (select q.id from profiles q where q.member_no = t.member_no)
  )
  left join member_cards c on c.user_id = p.id
  where t.listed
  order by t.sort, t.created_at;
$$;

revoke all on function team_list() from public;
grant execute on function team_list() to anon, authenticated;
