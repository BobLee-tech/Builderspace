-- 提交项目卡必须先加入 + 线上老项目的一句话介绍 ------------------------------------
-- 1. 只有登录成员能提交项目卡，发起人就是本人，这样每个新项目都挂着作者卡。访客的
--    insert 权限收回。封面和视频上传的规则不动（提交表单本来只给成员看）。
-- 2. 2026-10-25 线上 8 个项目的一句话介绍，按 PR #59 里的建议稿。只填还空着的
--    pitch，运营之后改过的不会被覆盖。三条原文写的是「想找人试用」，在「下一步」
--    还空着时挪过去；Moori 的原文本来就是一句话，直接当一句话介绍。英文 pitch_en
--    一起写上，运营可以按 docs/translation.md 再看一遍。
-- 依赖 20261026000000_project_owners_and_pitch.sql。

drop policy "public submits project drafts" on projects;
create policy "members submit project drafts" on projects
  for insert to authenticated with check (
    review_status = 'pending'
    and pitch is not null
    and owner_id = (select auth.uid())
    and name_en is null and problem_en is null and pitch_en is null
    and target_user_en is null and next_step_en is null and original_lang is null
  );

revoke insert on projects from anon;

-- 线上项目的一句话介绍 ---------------------------------------------------------
update projects set
  pitch = $$桌面宠物，随时看 Claude 和 Codex 还剩多少额度$$,
  pitch_en = $$A desktop pet that shows how much Claude and Codex quota you have left$$
where slug = 'claude-codex-6e4750' and pitch is null;

update projects set
  pitch = $$给正在找工作的同学用的求职助手$$,
  pitch_en = $$A job-hunting assistant for students looking for work$$
where slug = 'offerfox-f442f7' and pitch is null;

update projects set
  pitch = $$按你的口味和互动率，从 B 站挑一期下饭的视频$$,
  pitch_en = $$Picks a Bilibili video for your meal, by taste and engagement, not views$$
where slug = 'project-074718' and pitch is null;

update projects set
  pitch = $$给 Windows 每块屏幕单独设壁纸，插拔显示器也不乱$$,
  pitch_en = $$A separate wallpaper for each Windows monitor that survives replugging$$
where slug = 'syncwallpaper-daece6' and pitch is null;

update projects set
  pitch = $$在电脑上离线实时转录和翻译，支持中英日韩等语言$$,
  pitch_en = $$Offline live transcription and translation on your laptop, in many languages$$
where slug = 'project-0c8b5a' and pitch is null;

update projects set
  pitch = $$说一句话，它就能看懂屏幕、操作你的应用$$,
  pitch_en = $$Say one sentence and it reads your screen and works your apps$$
where slug = 'echoagent-3a8786' and pitch is null;

update projects set
  pitch = $$在 Windows 上查看 Codex 和 Claude 的用量$$,
  pitch_en = $$See your Codex and Claude usage on Windows$$
where slug = 'ai-usage-monitor-public-4e918f' and pitch is null;

-- 原文是在找人试用：挪到「下一步」，项目介绍里不再重复。
update projects set
  next_step = problem,
  next_step_en = problem_en,
  problem = null,
  problem_en = null
where slug in ('claude-codex-6e4750', 'offerfox-f442f7', 'ai-usage-monitor-public-4e918f')
  and next_step is null and problem is not null;

-- Moori 的原文本来就是一句话。
update projects set
  pitch = problem,
  pitch_en = case when char_length(problem_en) <= 108 then problem_en end,
  problem = null,
  problem_en = null
where slug = 'moori-26492c' and pitch is null and char_length(problem) <= 72;

notify pgrst, 'reload schema';
