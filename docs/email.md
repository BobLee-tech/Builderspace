# 社团邮箱：发信和收信

builderspace.dev 的邮件全部走 Resend（账号 lb15058460816，区域 Tokyo，Resend Forge）。DNS 在 Cloudflare。

## 地址

- **notify@builderspace.dev**：只发不收。会员登录的 6 位验证码（Supabase Auth 通过 Resend SMTP `smtp.resend.com:465` 发）、运营通知邮件（迁移 `20261015040000_ops_email.sql`，Vault 里的 `resend_api_key`、`ops_email_to`、`ops_email_from`）和发起人的项目提醒（见下面）都从这里发。
- **hello@builderspace.dev**：社团对外邮箱，能收信。信在 Resend 后台的 Inboxes 里看和回：<https://resend.com/inboxes/hello@builderspace.dev>。

## 发起人的项目提醒

迁移 `20261101000000_owner_notify.sql`。项目有人评论、有人 Star、审核通过或退回时，写信给发起人的登录邮箱：

- 发起人在提交表单和「我的卡片」里选：评论即时 / 每日汇总 / 不提醒，Star 每周汇总 / 只在里程碑 / 不提醒。审核结果总是发。
- 触发器把事件写进 `owner_outbox`，pg_cron 每 5 分钟跑 `owner_notify_run()` 合并发送。每日、每周两封按悉尼时间早上 9 点。
- 每封信底部有退订链接（`/unsubscribe`），只退这一个项目的这一类；信头的 List-Unsubscribe 指向 `/unsubscribe/one-click`。
- 回信到 hello@。
- 查发出去的：`owner_email_log`；还没发的：`owner_outbox` 里 `sent_at` 为空的行。

### 额度

Resend 是免费套餐：每天 100 封、每月 3000 封，验证码、运营通知、提醒、Hub 共用（2026-11-01 查过，API key 有 supabase-auth、BuilderSpace、Hub、CourseMate 四把，都在同一个账号）。

- 提醒信 24 小时内全站最多 40 封，给验证码留余量。改上限：`select vault.create_secret('60', 'owner_email_daily_cap');`
- 每人 24 小时内最多 6 封。
- 超了不丢，下一轮再发。
- 活动当天报名和验证码多，平时一天个位数。量起来以后升级 Resend Pro（每月 5 万封、没有每日上限）就不用卡这个数。

## DNS 记录（Cloudflare，全部 DNS only）

| 类型  | 名称                | 内容                                      | 用途                          |
| ----- | ------------------- | ----------------------------------------- | ----------------------------- |
| MX    | `@`                 | `receive-apne1.forge.rmta.net`，优先级 10 | 收信，把根域名的信交给 Resend |
| CNAME | `send`              | `send.forge.rmta.net`                     | 发信 SPF                      |
| CNAME | `rsend`             | `rsend-apne1.forge.rmta.net`              | 发信 SPF                      |
| TXT   | `resend._domainkey` | DKIM 公钥（Resend 后台可见）              | 发信签名                      |
| TXT   | `_dmarc`            | `v=DMARC1; p=none;`                       | DMARC，只监控不拦截           |

收信是 2026-10-27 才打开的：在 Resend 的域名页打开 Enable Receiving，再用 Auto configure 授权 Cloudflare 加上 MX。在那之前根域名没有 MX，发给 hello@ 的信都会被退回。

## 注意

- 根域名只能有一组 MX。以后如果想改用 Cloudflare Email Routing、Google Workspace 之类收信，要先删掉指向 Resend 的 MX，hello@ 收件箱就收不到信了。
- Cloudflare 会提示根域名缺 SPF，可以不管：发信用的是 `send.` 子域，那里已经有 SPF。
- 改完 DNS 后，用 `dig +short MX builderspace.dev @1.1.1.1` 确认生效，再从外部邮箱（比如 Gmail）给 hello@ 发一封测试信，看 Resend 收件箱有没有收到。
