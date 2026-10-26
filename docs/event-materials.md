# 资料包：每场活动结束后怎么放上官网

活动结束后，资源页 `/learn` 出现一张资料包卡片，点进去是 `/learn/<slug>`：当天用到的工具、做法的几步、能复制的提示词、成果墙，还有一个打包下载。活动页的结束卡片和活动列表也会链过去。

- 数据：`src/lib/event-materials.ts`，按活动 slug 分段
- 下载包：`public/events/<slug>/` 下的 zip，由 `node scripts/pack-materials.mjs` 从上面的数据生成
- 页面：`src/app/learn/[slug]/page.tsx`
- 成果墙沿用 `src/lib/event-results.ts`（见 `docs/event-results.md`）

## 步骤

1. **活动后 24 小时内**：在 `event-materials.ts` 里给这场加一段：一句话导语、两格信息、工具、几步做法、提示词。文字一句一件事，不写成段的话。
2. **打包**：跑 `node scripts/pack-materials.mjs`，zip 会写进 `public/events/<slug>/`。改了文字就重跑，测试会检查 zip 和数据一致。
3. **讲义**：要放讲义，先出公开版：插画写上作者，去掉嘉宾联系方式、兑换码这类只在现场给的东西，PDF 压到 10 MB 以内。
4. **发版**：跑 `pnpm check`，本地看一眼中英两种语言，开 PR。目标是活动后 48 小时内上线。

办活动用的方案、主持稿、嘉宾方案不放进资料包。
