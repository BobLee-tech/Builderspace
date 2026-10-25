# BuilderSpace

**Bring an idea. Make it work.**

BuilderSpace 是一个从 UNSW 起步的中英双语创客社团。这个仓库是社团的官网，活动报名、项目广场、会员卡，还有活动现场大家扫码打开的那个页面，都在这里。

我们想做的事很简单：你有个点子，我们帮你找到一起做的人。从“要不试试？”到“它真的跑起来了”，中间通常还隔着几杯咖啡和几轮 debug，这段路我们陪你一起走。

## 五个吉祥物

网站整体是黑、白加一点金属色，彩色只留给这五位：

- 🩷 **Vivi（知微）**，探索者，口头禅是 _What if…?_
- 💛 **Lumi（灵犀）**，灵感家，口头禅是 _I've got an idea!_
- 💙 **Geo（格物）**，研究者，口头禅是 _Let's figure it out._
- 💚 **Momo（青禾）**，实践家，口头禅是 _Let's build it!_
- 💜 **Kiko（同舟）**，协作者，口头禅是 _Together, we can!_

加入的时候挑一只，它会出现在你的会员卡上。挑哪只都行，不考核。

## 技术栈

Next.js 16、Supabase、Vercel。首页那块会流动的液态金属，还有一万七千多个粒子拼成的吉祥物，都是直接用 WebGL 写的。

## 本地运行

需要 Node 24+ 和 pnpm。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

没配 Supabase 也能跑，页面会显示示例数据。提交前跑一遍 `pnpm check`，CI 跑的也是它，本地先过一遍能省不少来回。

审核、评论管理、邮件通知、合规要求这些运营和维护说明，都在 [docs/ops.md](docs/ops.md)。

---

Built by builders, for builders. 有想法就带过来。
