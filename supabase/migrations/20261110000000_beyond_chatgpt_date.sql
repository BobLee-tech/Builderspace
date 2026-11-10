-- Beyond ChatGPT 定档 ------------------------------------------------------
-- 11/13（周五）10:30–13:30，UNSW MCIC。悉尼 11 月是夏令时（AEDT，+11）。
-- 日期定了：改时间和地点，date_tbc 改回 false（见 20261106000000）。
-- 报名方式还没定，signup_url / registration_closes_at 保持为空。

update events set
  starts_at = '2026-11-13 10:30:00+11',
  ends_at = '2026-11-13 13:30:00+11',
  location = 'UNSW MCIC',
  summary = '语音说需求，看 Codex 现场改网页，再分组做一个能演示的改动。',
  date_tbc = false
where slug = 'beyond-chatgpt';
