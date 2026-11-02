# 社团邮箱：发信和收信

builderspace.dev 的邮件全部走 Resend（账号 lb15058460816，区域 Tokyo，Resend Forge）。DNS 在 Cloudflare。

## 地址

- **notify@builderspace.dev**：只发不收。会员登录的 6 位验证码（Supabase Auth 通过 Resend SMTP `smtp.resend.com:465` 发）和运营通知邮件（迁移 `20261015040000_ops_email.sql`，Vault 里的 `resend_api_key`、`ops_email_to`、`ops_email_from`）都从这里发。
- **hello@builderspace.dev**：社团对外邮箱，能收信。信在 Resend 后台的 Inboxes 里看和回：<https://resend.com/inboxes/hello@builderspace.dev>。

## 转发给 president

收到的信会自动复制一份，从 hello@ 发给几位 president。原件仍留在 Resend 收件箱。

- 流程：Resend 的 webhook（事件 `email.received`）调用 `/api/inbound-email`，再由 `src/lib/inbound-email.ts` 取信、发出副本。
- 副本标题前加 `[hello@]`，Reply-To 设成原发件人。直接回复会发给对方，但从你自己的邮箱发出。
- 想用 hello@ 的身份回信，还是要去 Resend 收件箱。
- 每封信占 1 封额度（收），每份副本按收件人数再占几封（发），和登录验证码共用免费版的每天 100 封。
- 所以 24 小时内只转发前 15 封（`HELLO_FORWARD_DAILY_CAP`），超出的只留在 Resend 收件箱。
- 不转发：发件人是 `@builderspace.dev` 的信，以及带 `X-BuilderSpace-Forwarded` 头、被转回来的副本。

设置（Vercel 环境变量填好后要重新部署）：

1. Resend → API Keys：新建一个 Full access 的 key（读收件要用），填到 Vercel 的 `RESEND_INBOUND_API_KEY`。
2. Resend → Webhooks：Add endpoint `https://www.builderspace.dev/api/inbound-email`，只勾 `email.received`。复制 Signing secret（`whsec_` 开头），填到 `RESEND_INBOUND_WEBHOOK_SECRET`。地址要带 www，根域名会 308 跳转。
3. Vercel：`HELLO_FORWARD_TO` 填 president 的邮箱，用逗号分隔。
4. 从 Gmail 给 hello@ 发一封测试信。几秒内应该收到 `[hello@]` 副本，Resend 的 webhook 页面能看到 200。

改收件人只需要改 `HELLO_FORWARD_TO`，然后重新部署。三个变量少一个，接口就回 503，信只留在收件箱里。

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
