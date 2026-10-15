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

| 表                       | 公开可读           | 公开可写                                     |
| ------------------------ | ------------------ | -------------------------------------------- |
| `events`                 | `published = true` | —                                            |
| `projects`               | 审核通过的         | 只能投稿为 `pending`                         |
| `project_updates`        | 审核通过的         | 只能投稿为 `pending`                         |
| `tutorials`              | `published = true` | —                                            |
| `weekly_picks`           | `published = true` | —                                            |
| `join_submissions`       | —                  | 可提交，不可读回                             |
| `volunteer_applications` | —                  | 可提交，不可读回，运营列（状态、备注）不可写 |

## 运营怎么用（不用改代码）

在 Supabase 后台的 Table Editor 里直接编辑：

- **新增活动**：`events` 加一行，填好后勾选 `published`。报名链接用 Luma / Google Forms。
- **审核项目**：`projects` 里把 `review_status` 改成 `approved` 即公开。
- **记录进展**：`project_updates` 加一行（代码提交 / Demo / 更新帖），默认就是 `approved`。「双周活跃项目数」来自视图 `biweekly_active_projects`（目前只在后台看，首页不展示）。
- **审核进展**：发起人在项目页「提交进展」投稿的行是 `pending`，核对后改成 `approved` 才会上时间线并计入指标。
- **导出双周活跃项目数**：视图 `biweekly_active_projects_history`（每周一行），Export → CSV。视图 `project_activity` 列出每个项目最近一次进展，超过 14 天没动静的排在最前，用来回访；两个视图只在后台可见。
- **上线资源（工作坊资料）**：`tutorials` 加一行并勾选 `published`（工作坊后 48 小时内）。
- **每周精选**：`weekly_picks`，每条必须有来源链接和日期，只写摘要。
- **导出报名**：`join_submissions` 右上角 Export → CSV。成员要求删除数据时直接删对应行。
- **看意向成员和志愿者申请**：两张表都在 Table Editor 里。`join_submissions` 是官网「加入」提交的意向成员；`volunteer_applications` 是 `/volunteer` 提交的核心团队志愿者申请：必填的是微信昵称（`nickname`）、邮箱（`email`，用来开通内部协作系统的账号）和想申请的职位；学校与学位、每周投入、个人介绍、简历或作品链接是选填。2026-10-15 之前的申请没有邮箱，联系方式在 `contact`。志愿者申请的 `status` 是下拉框（new → contacted → interviewing → accepted / declined），跟进情况写在 `ops_notes`；这两列只有后台能改，访客提交的永远是 `new`。想要汇总数字，看视图 `join_interest_summary`。
- **投稿通知（企业微信群）**：新项目卡、待审核的进展、新志愿者申请会逐条推到运营群；每天悉尼时间早上 8–9 点再发一条汇总（过去 24 小时报名人数和各类待处理数）。消息里只有项目名、昵称和职位，不含联系方式和 zID。群机器人的 Webhook 地址存在 Supabase Vault 里（名为 `ops_webhook_url`，见迁移 `20261014020000` 开头的说明），不进仓库；没存时不发通知，也不影响提交。换 key：在群里删掉机器人重建，再用 `vault.update_secret` 更新。
- **渠道归因**：每个渠道发不同的加入链接，如 `/join?ref=xhs-w1`、`/join?ref=poster-qr`（也认 `utm_source`），记在 `join_submissions.channel`。只用小写字母、数字、`-`、`_`。

页面缓存几分钟，改完稍等即可看到。

## 页面

| 路径               | 内容                                               | PRD   |
| ------------------ | -------------------------------------------------- | ----- |
| `/`                | 社团介绍、粒子吉祥物、项目广场                     | P0    |
| `/events`          | 活动列表、往期、日历订阅                           | P0    |
| `/events.ics`      | ICS 订阅源（Google / Apple 日历）                  | P1    |
| `/projects`        | 项目广场，按状态和所缺角色筛选                     | P0    |
| `/projects/[slug]` | 项目卡详情 + 进展时间线                            | P0/P1 |
| `/projects/new`    | 项目卡投稿（人工审核后公开）                       | P0    |
| `/learn`           | 资源：工作坊资料 + 每周精选                        | P0/P1 |
| `/people`          | 成员：筹备团队按职能介绍（不写人名）               | —     |
| `/join`            | 加入表单，提交后显示管理员微信（入口在顶栏和首屏） | P0    |
| `/volunteer`       | 核心团队志愿者申请（入口在成员页和页脚）           | —     |

## 中英双语

页面上的文案两种语言都会渲染，`<html data-lang>` 决定显示哪一种（见 `src/components/t.tsx`），右上角「中 / EN」切换并记在浏览器里。页面因此仍是静态缓存的，切换语言不用刷新。

- 新文案用 `<T zh="…" en="…" />`；状态、角色等标签在 `src/lib/types.ts`，是 `{ zh, en }` 对象。
- 表单校验和提交提示写成 `"中文|English"`，用 `<Msg s={…} />` 渲染。
- 运营在 Supabase 里填的内容（活动标题、项目卡）按原样显示，不翻译。

## 防刷

- 表单带隐藏的蜜罐字段和填写用时检查（`src/lib/spam.ts`）。像机器人的提交照样显示“成功”，但不入库。
- 数据库触发器限制公开提交速度：加入表单每分钟 20 条，项目卡、进展和志愿者申请每分钟各 10 条（迁移 `20261012030000`、`20261014000000`）。超限时访客会看到“请一分钟后再试”（迁移 `20261014010000` 给节流单独的错误码）。运营在后台操作不受限。
- 没用验证码：多数验证码在国内打不开。

## 视觉效果

- 首页首屏：液态金属 + Bayer 1-bit 抖动（`src/components/hero-metal.tsx`），原生 WebGL，不依赖 three.js。
- 首页第二屏：1.76 万个取自 logo 的粒子吉祥物（`src/components/mascot-stage.tsx`），数据 `public/mascot-particles.json` 只在滚动到附近时才加载。
- 两者都在“减少动态效果”时静止，WebGL 不可用时退回静态图，并按帧率自动降分辨率。

## 合规提醒

- 附属 Arc 前不出现 UNSW / Arc logo，不写「官方」「首个」「唯一」。
- 赞助未确认不上页面；作品和照片公开前征得同意。
- 加入表单不收学生证。姓名和 zID 只在成员自愿勾选「支持社团申请」并单独同意后才收，
  仅用于提交给 Arc；不勾选时数据库约束保证这两列为空。
- 志愿者申请同样不收学生证和 zID；要留联系方式，勾选同意后才会保存，只用于联系和筛选，成员要求删除时直接删对应行。

## 目录

```
src/app/            路由（页面、表单 server actions、ICS 路由）
src/components/     共享组件（导航、项目卡、动效）
src/lib/            数据读取、表单校验、日期格式、ICS 生成
supabase/migrations 数据库结构与 RLS
public/             品牌资源（来自原型 assets/）
```
