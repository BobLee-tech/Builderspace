-- 成员页的加入人数 ---------------------------------------------------------
-- member_count()：公开的加入人数，只有一个数字，不含任何个人信息。数的是加入
-- 登记（join_submissions）的条数，老表单时期加入、还没开通账号的成员也算。
-- 成员页按十位向下取整显示成「70+」，这个函数没跑之前页面上先不显示人数。

create or replace function member_count() returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from join_submissions;
$$;

revoke all on function member_count() from public;
grant execute on function member_count() to anon, authenticated;
