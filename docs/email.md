# 社团邮箱：发信和收信

builderspace.dev 的邮件全部走 Resend（账号 lb15058460816，区域 Tokyo，Resend Forge）。DNS 在 Cloudflare。

## 地址

- **notify@builderspace.dev**：只发不收。会员登录的 6 位验证码（Supabase Auth 通过 Resend SMTP `smtp.resend.com:465` 发）和运营通知邮件（迁移 `20261015040000_ops_email.sql`，Vault 里的 `resend_api_key`、`ops_email_to`、`ops_email_from`）都从这里发。
- **hello@builderspace.dev**：社团对外邮箱，能收信。信在 Resend 后台的 Inboxes 里看和回：<https://resend.com/inboxes/hello@builderspace.dev>。

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
