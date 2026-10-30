-- projects.owner_linked：项目有没有挂到成员账号上 ---------------------------------
-- 网站只需要知道这一点（没挂的项目显示按名字生成的作者卡），不需要 owner_id 本身。
-- 由 owner_id 自动算出，谁都写不了。下一份 20261029010000_projects_column_grants.sql
-- 再把 owner_id 从访客能读的列里拿掉（issue #57 第 1 条）。
-- 分成两份是为了上线顺序：先跑这份 → 合并改读 owner_linked 的代码 → 再跑下一份。
-- 一次跑完的话，合并前线上代码还在读 owner_id，项目广场会报没有权限。

alter table projects
  add column owner_linked boolean generated always as (owner_id is not null) stored;

notify pgrst, 'reload schema';
