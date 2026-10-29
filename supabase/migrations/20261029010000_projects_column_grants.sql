-- projects 按列公开，owner_id 不再给访客读 -----------------------------------------
-- 20261012010000_api_grants.sql 给 anon / authenticated 的是整表 select，后来加的
-- owner_id（发起人登录账号的 uuid）也跟着公开了（issue #57 第 1 条）。Postgres 不能从
-- 整表授权里单独收回一列，所以先整表收回，再按列授权：除 owner_id 外的全部列。
-- 网站改读 20261029000000 加的 owner_linked；这份要等那份代码上线后再跑。
-- 作者卡照旧只走 project_owner_cards()，公开卡片走 public_cards()，两个都是 security
-- definer，不受影响。insert 不变：成员提交时照样写 owner_id，插入策略要求它等于
-- auth.uid()。hub_site_admin 的整表 select 不变，Hub 运营仍能看到 owner_id。
-- 以后给 projects 加列，要在新迁移里决定放不放进这份 select 授权，不放就读不到。
-- 依赖 20261029000000_projects_owner_linked.sql。

revoke select on projects from anon, authenticated;

grant select (
  id, slug, name, pitch, problem, target_user, status, needed_roles, next_step,
  contact, owner_name, owner_linked, repo_url, demo_url, review_status,
  created_at, updated_at,
  cover_path, cover_focus_x, cover_focus_y,
  video_path, video_poster_path, video_seconds,
  name_en, pitch_en, problem_en, target_user_en, next_step_en, original_lang,
  star_count
) on projects to anon, authenticated;

notify pgrst, 'reload schema';
