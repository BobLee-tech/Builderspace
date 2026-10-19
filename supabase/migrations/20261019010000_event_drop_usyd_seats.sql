-- 首场 Workshop 不再收悉大报名，改收校外成员 ---------------------------------------
-- 悉大合作社团有自己的报名入口。官网这场 UNSW 30 个名额照旧，原来悉大的 10 个
-- 名额给校外成员；其他学校学生这场不开放。
-- 之前已经报上的悉大记录不动，运营在后台照常能看到。

update events
set seat_quotas = '{"unsw": 30, "external": 10}', capacity = 40
where slug = 'put-yourself-online';
