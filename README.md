# BuilderSpace

一个从 UNSW 起步的中英双语创客社团的官网与项目广场。

**Bring an idea. Leave with something that works.**

- 交互原型（设计基准）：[BobLee-tech/builderspace-demo](https://github.com/BobLee-tech/builderspace-demo)
- 需求来源：PRD v0.5 第四节「官网与项目广场」

## 技术栈

Next.js 16（App Router，Cache Components）· Supabase（Postgres + RLS）· Vercel

沿用 CourseMate 熟悉的技术栈，但独立仓库、独立数据库，不共享任何数据。

## 本地开发

需要 Node 24+ 和 pnpm。

```bash
pnpm install
cp .env.example .env.local   # 不填 Supabase 也能跑，页面会显示示例数据
pnpm dev                     # http://localhost:3000
```

提交前跑一遍完整检查（CI 跑的也是它）：

```bash
pnpm check   # lint + typecheck + format + test + build
```

## 连接 Supabase

1. 新建一个 Supabase 项目（不要复用 CourseMate 的）。
2. 在 SQL Editor 里执行 `supabase/migrations/` 下的迁移文件，或用 Supabase CLI：`supabase db push`。
3. 把 Project URL 和 anon key 填进 `.env.local`（Vercel 上填到环境变量）。

网站只用 anon key，读写权限全部由 RLS 控制：

| 表                 | 公开可读           | 公开可写             |
| ------------------ | ------------------ | -------------------- |
| `events`           | `published = true` | —                    |
| `projects`         | 审核通过的         | 只能投稿为 `pending` |
| `project_updates`  | 审核通过的         | 只能投稿为 `pending` |
| `tutorials`        | `published = true` | —                    |
| `weekly_picks`     | `published = true` | —                    |
| `join_submissions` | —                  | 可提交，不可读回     |

## 运营怎么用（不用改代码）

在 Supabase 后台的 Table Editor 里直接编辑：

- **新增活动**：`events` 加一行，填好后勾选 `published`。报名链接用 Luma / Google Forms。
- **审核项目**：`projects` 里把 `review_status` 改成 `approved` 即公开。
- **记录进展**：`project_updates` 加一行（代码提交 / Demo / 更新帖），默认就是 `approved`。首页的「双周活跃项目数」来自视图 `biweekly_active_projects`。
- **审核进展**：发起人在项目页「提交进展」投稿的行是 `pending`，核对后改成 `approved` 才会上时间线并计入指标。
- **导出双周活跃项目数**：视图 `biweekly_active_projects_history`（每周一行），Export → CSV。视图 `project_activity` 列出每个项目最近一次进展，超过 14 天没动静的排在最前，用来回访；两个视图只在后台可见。
- **上线教程资料**：`tutorials` 加一行并勾选 `published`（工作坊后 48 小时内）。
- **每周精选**：`weekly_picks`，每条必须有来源链接和日期，只写摘要。
- **导出报名**：`join_submissions` 右上角 Export → CSV。成员要求删除数据时直接删对应行。
- **渠道归因**：每个渠道发不同的加入链接，如 `/join?ref=xhs-w1`、`/join?ref=poster-qr`（也认 `utm_source`），记在 `join_submissions.channel`。只用小写字母、数字、`-`、`_`。

页面缓存几分钟，改完稍等即可看到。

## 页面

| 路径               | 内容                                               | PRD   |
| ------------------ | -------------------------------------------------- | ----- |
| `/`                | 一句话定位、下一场活动倒计时、北极星指标、精选项目 | P0    |
| `/events`          | 活动列表、往期、日历订阅                           | P0    |
| `/events.ics`      | ICS 订阅源（Google / Apple 日历）                  | P1    |
| `/projects`        | 项目广场，按状态和所缺角色筛选                     | P0    |
| `/projects/[slug]` | 项目卡详情 + 进展时间线                            | P0/P1 |
| `/projects/new`    | 项目卡投稿（人工审核后公开）                       | P0    |
| `/learn`           | 教程资料 + 每周精选                                | P0/P1 |
| `/join`            | 加入表单，提交后显示管理员微信                     | P0    |

## 合规提醒

- 附属 Arc 前不出现 UNSW / Arc logo，不写「官方」「首个」「唯一」。
- 赞助未确认不上页面；作品和照片公开前征得同意。
- 加入表单不收 zID 和学生证。

## 目录

```
src/app/            路由（页面、表单 server actions、ICS 路由）
src/components/     共享组件（导航、项目卡、倒计时）
src/lib/            数据读取、表单校验、日期格式、ICS 生成
supabase/migrations 数据库结构与 RLS
public/             品牌资源（来自原型 assets/）
```
