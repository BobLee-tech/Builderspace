-- 项目挂作者卡 + 一句话介绍 ------------------------------------------------------
-- 1. projects.owner_id：登录成员提交的项目记下发起人。没登录也还能提交（owner_id
--    为空），以前匿名提交的项目由运营在后台按需关联。
-- 2. profiles.card_on_projects：作者卡默认公开，成员在「我的」里可以关。和
--    is_public 分开：is_public 留给以后的公开卡片页，仍默认关闭。
-- 3. project_owner_cards()：访客读作者卡的唯一入口。只返回已批准项目的发起人、
--    没关掉作者卡的成员、只有卡片上本来就印着的字段；邮箱和学校域名不出去。
-- 4. pitch / pitch_en：一句话介绍，项目卡上只显示它。problem 变成选填的详细介绍，
--    只在详情页显示，上限从 280 放到 600。36 个字的规则（中文算 1，其他算半个）
--    在 src/lib/text-length.ts 里检查；这里只挡明显超长的。老项目 pitch 为空时，
--    卡片先显示 problem 的前两行。
-- 依赖 20261017000000_member_accounts.sql、20261017010000_member_cards.sql、
-- 20261024000000_bilingual_content.sql。

alter table projects
  add column owner_id uuid references profiles (id) on delete set null,
  add column pitch text check (char_length(pitch) between 1 and 72),
  add column pitch_en text check (char_length(pitch_en) between 1 and 108),
  alter column problem drop not null,
  drop constraint projects_problem_check,
  add constraint projects_problem_check check (char_length(problem) <= 600),
  drop constraint projects_problem_en_check,
  add constraint projects_problem_en_check check (char_length(problem_en) between 1 and 1800);

create index projects_owner_idx on projects (owner_id) where owner_id is not null;

-- 新投稿必须有一句话介绍；登录成员只能把自己写成发起人，访客的 owner_id 只能为空。
drop policy "public submits project drafts" on projects;
create policy "public submits project drafts" on projects
  for insert to anon, authenticated with check (
    review_status = 'pending'
    and pitch is not null
    and (owner_id is null or owner_id = (select auth.uid()))
    and name_en is null and problem_en is null and pitch_en is null
    and target_user_en is null and next_step_en is null and original_lang is null
  );

-- 作者卡默认公开 -------------------------------------------------------------
alter table profiles
  add column card_on_projects boolean not null default true;

grant update (card_on_projects) on profiles to authenticated;

create or replace function project_owner_cards(p_slug text default null)
returns table (
  slug text,
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
  stickers jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.slug, f.nickname, f.member_no, f.spark, f.major, f.school_degree,
    f.skills, f.building, f.looking_for,
    -- Same words as the seal on the card (sealLabel in src/lib/members.ts).
    case
      when f.school_verified_at is null then null
      when f.school_domain ~ '(^|\.)unsw\.edu\.au$' then 'UNSW'
      else 'STUDENT'
    end,
    c.material, c.tint, c.pattern, c.tagline, c.stickers
  from projects p
  join profiles f on f.id = p.owner_id
  left join member_cards c on c.user_id = f.id
  where p.review_status = 'approved'
    and f.card_on_projects
    and (p_slug is null or p.slug = p_slug);
$$;

revoke all on function project_owner_cards(text) from public;
grant execute on function project_owner_cards(text) to anon, authenticated;

-- 翻译队列带上一句话介绍：任何一段有中文没英文，项目就排进来 -------------------
create or replace view translation_queue with (security_invoker = true) as
select 'projects' as tbl, p.id, p.slug as project, p.review_status::text as review_status,
  jsonb_strip_nulls(jsonb_build_object(
    'name', p.name, 'pitch', p.pitch, 'problem', p.problem,
    'target_user', p.target_user, 'next_step', p.next_step
  )) as fields,
  p.created_at
from projects p
where p.review_status in ('pending', 'approved')
  and ((p.problem is not null and p.problem_en is null)
    or (p.pitch is not null and p.pitch_en is null))
union all
select 'project_updates', u.id, p.slug, u.review_status::text,
  jsonb_build_object('body', u.body), u.created_at
from project_updates u
join projects p on p.id = u.project_id and p.review_status = 'approved'
where u.review_status in ('pending', 'approved') and u.body_en is null
union all
select 'project_comments', c.id, p.slug, null::text,
  jsonb_build_object('body', c.body), c.created_at
from project_comments c
join projects p on p.id = c.project_id and p.review_status = 'approved'
where c.deleted_at is null and c.body_en is null;

revoke all on translation_queue from anon, authenticated;

notify pgrst, 'reload schema';
