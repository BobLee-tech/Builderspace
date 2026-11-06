-- 11 月的三场活动，以及「时间待定」的活动 ------------------------------------
-- 1. events 加 date_tbc：日期还没定的活动也能先上官网。starts_at / ends_at
--    这时只是占位（大概在哪一周），用来排序和放进 8 周时间条；官网显示
--    src/lib/event-pages.ts 里写的「下周 · 时间规划中」这类说法，不倒计时，
--    不进日历订阅，也不写进搜索引擎的活动数据。日期定了：改 starts_at /
--    ends_at（需要时改 location），再把 date_tbc 改回 false。
-- 2. 三场活动：
--    · ai-study-career-talk：11/12 与 ViberSpace（悉大）联办，在 Humanitix 报名，
--      官网不收报名；名额约 40（悉大 30、UNSW 10）。
--    · beyond-chatgpt：下周，时间地点待定。
--    · the-collectors：和机器人艺术家 Josh Whitkin 一起搭装置，暂定 11 月中旬，
--      两场 × 10 人，日期待定，日期定了再开官网报名。

alter table events
  add column date_tbc boolean not null default false;

comment on column events.date_tbc is
  '日期未定：starts_at / ends_at 只是占位，官网显示「待定」，不进日历订阅。';

-- 悉尼 11 月是夏令时（AEDT，+11）。
insert into events (
  slug, title, kind, starts_at, ends_at, location, summary, signup_url,
  capacity, seat_quotas, published, registration_closes_at, date_tbc
) values
(
  'ai-study-career-talk',
  'AI 复习分享会 × 求职经验分享',
  'workshop',
  '2026-11-12 14:15:00+11',
  '2026-11-12 16:15:00+11',
  'USYD CreateSpace, Room 417',
  '一线工程师拆解校招，再现场用 AI 把一学期压成一页 Cheatsheet。',
  'https://events.humanitix.com/ai-study-session-and-career-talk',
  40,
  '{"unsw": 10, "usyd": 30}',
  true,
  null,
  false
),
(
  'beyond-chatgpt',
  'Beyond ChatGPT',
  'workshop',
  '2026-11-15 10:00:00+11',
  '2026-11-15 13:00:00+11',
  '待定',
  '有想做的东西，不知道怎么开始？看 AI 能帮你推进到哪一步。',
  null,
  null,
  null,
  true,
  null,
  true
),
(
  'the-collectors',
  '一起造机器人',
  'workshop',
  '2026-11-16 10:00:00+11',
  '2026-11-16 17:00:00+11',
  'UNSW Makerspace',
  '跟机器人艺术家 Josh Whitkin，把一件装置的机器人亲手装起来。',
  null,
  20,
  null,
  true,
  null,
  true
)
on conflict (slug) do update set
  title = excluded.title,
  kind = excluded.kind,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  location = excluded.location,
  summary = excluded.summary,
  signup_url = excluded.signup_url,
  capacity = excluded.capacity,
  seat_quotas = excluded.seat_quotas,
  published = excluded.published,
  registration_closes_at = excluded.registration_closes_at,
  date_tbc = excluded.date_tbc;
