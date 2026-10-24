-- 成员页的创始团队和核心成员 -------------------------------------------------
-- /people 上出现的人，一人一行，只放本人同意公开的。展示名由本人自己填（昵称、
-- 英文名或真名都行），consent_at 记本人同意照片、名字和成员卡公开的时间。
-- 关联了成员账号（member_id）的人，页面上显示他们自己在 /me/card 设计的成员卡
-- 和真实加入编号；没关联的显示默认卡面。
--
-- 运营在 Supabase 后台的 Table editor 里维护，流程见 docs/team.md。撤下一个人：
-- listed 改成 false，再删掉 team-photos 里的两张照片。
--
-- 访客读不到这张表，也读不到 profiles 和 member_cards，只能调 team_list()：
-- 它只返回 listed 的人，以及成员卡上本来就印着的那几项。
-- 依赖 20261017000000_member_accounts.sql 和 20261017010000_member_cards.sql。

create table team_members (
  id uuid primary key default gen_random_uuid(),
  member_id uuid unique references profiles (id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 20),
  team text not null check (team in ('founder', 'ops', 'tech', 'events')),
  -- 职位跟 /core-team 申请表的一样（src/lib/types.ts 的 DEPARTMENTS）；创始人留空。
  -- coalesce：核心成员的 position 为空时 in (...) 得到 null，check 会放过。
  position text check (coalesce(
    (team = 'founder' and position is null)
    or (team = 'ops' and position in ('content', 'design_media', 'recruiting'))
    or (team = 'tech' and position in ('product', 'web_tools', 'teaching', 'tech_explore'))
    or (team = 'events' and position in ('events', 'partnerships')),
    false
  )),
  -- 头衔，比如创始人的 Co-President；核心成员一般留空。
  title text check (char_length(title) between 1 and 40),
  bio text check (char_length(bio) between 1 and 80),
  bio_en text check (char_length(bio_en) between 1 and 240),
  link_url text check (link_url ~ '^https://\S{1,300}$'),
  -- team-photos 里的文件名，由 scripts/team-photos.mjs 生成的随机名，不用真名。
  avatar_path text check (avatar_path ~ '^[a-z0-9-]{8,64}\.webp$'),
  portrait_path text check (portrait_path ~ '^[a-z0-9-]{8,64}\.webp$'),
  -- 没交照片时用哪只吉祥物占位；关联了账号的人用卡上那只。
  spark text not null default 'geo'
    check (spark in ('vivi', 'lumi', 'geo', 'momo', 'kiko')),
  sort smallint not null default 0,
  consent_at timestamptz not null,
  listed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger team_members_touch before update on team_members
  for each row execute function touch_updated_at();

-- 没有任何 policy：只有后台（service role）能读写，页面走 team_list()。
alter table team_members enable row level security;
revoke all on team_members from anon, authenticated;

create or replace function team_list() returns table (
  id uuid,
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
    t.id, t.team, t.position, t.title, t.display_name, t.bio, t.bio_en,
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

-- 照片：公开 bucket，访客按文件名直接取，列不出目录（没有 select policy）。
-- 只有后台能上传。脚本输出的都是 WebP，单张不超过 1 MB。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-photos', 'team-photos', true, 1048576, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
