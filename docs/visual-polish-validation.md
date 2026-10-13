# 首页与全站视觉升级验收

基准：用户指定的 `http://localhost:5392/polish-demo.html` 默认“优化后”视图。
按五阶段落实，保留 HeroMetal 的读数、纵向视差、CSS 滚动入场、缓存数据读取和示例提示。
未接入演示的虚构项目、人数或耗时。`src/app/prototype.css` 未导入、未提交。

## 提交与检查

| 阶段             | 提交             | 验证                                                         |
| ---------------- | ---------------- | ------------------------------------------------------------ |
| 1 · 动画稳定性   | `798898f`        | `pnpm check`，新增弹簧、共享循环与字幕接缝测试               |
| 2 · 背景与质感   | `a3f7147`        | `pnpm check`，首屏背景暂停、Phosphor Light 图标              |
| 3 · 页尾         | `a53d2a1`        | `pnpm check`，1280 / 805 / 390px 布局，Build Night 时间待定  |
| 4 · 首页大字     | `bce64a9`        | `pnpm check`，服务端字母结构、手机四行、构建状态、金属高度图 |
| 5 · Lenis + GSAP | 见本文件所在提交 | `pnpm check`，路由往返、语言切换、原生滚动互斥、资源清理     |

32 项单元测试通过。每阶段的检查包含 ESLint、Next 类型生成、TypeScript、Prettier、Vitest、生产构建。

## 实际验证范围

- Chromium：桌面、390px 手机布局、桌面四列与两档窄屏页尾；无横向溢出。
- 首页 → 活动 → 首页：背景和 works 各只有一个 ShaderMount 画布，控制台无警告或错误。
- 中 / EN：标题拆字重新建立，不影响内容或导航。
- Lenis：桌面开启时 `scroll-behavior: auto`；窄屏保留原生滚动。
- Lighthouse 的 WebGL 禁用模式：普通铬色标题可读，背景隐藏，保留品牌静态图。
- Lighthouse 的减少动态效果模式：静态金属与纹理，CLS 为 0。
- Safari：可访问结构和路由往返已检查；原生截图通道返回黑色画面，视觉验收未确认。
- Firefox、iOS Safari、Android Chrome：本机没有对应测试环境，仍需真机/对应浏览器验收。

首屏只初始化 HeroMetal、works、全站背景三个 WebGL 上下文；旧吉祥物 canvas 是服务端占位，进入该区块才初始化。保留旧粒子吉祥物区，舞台交接时背景在 Hero 占据大半屏 **或 works 仍可见** 时停止动画，避免四个 WebGL 渲染器同时运行。

## Lighthouse 移动端

Lighthouse 13.5.0，本机生产构建，默认移动设备和模拟网络/CPU，单次结果；不是部署环境或真实手机测量。
基线为升级前提交 `70ba114` 的隔离构建，四项字体和 Next 版本一致。

| 版本/模式             | Performance | LCP   | CLS    | TBT |
| --------------------- | ----------- | ----- | ------ | --- |
| 升级前                | 60          | 8.49s | 0.0078 | 0ms |
| 升级后                | 61          | 7.67s | 0.0086 | 0ms |
| 升级后 · 禁用 WebGL   | 61          | 8.12s | 0.0086 | 0ms |
| 升级后 · 减少动态效果 | 61          | 7.66s | 0      | 0ms |

LCP 记录指向服务端输出的 works 文本容器。CLS 低于 0.05；LCP 仍偏高，不宣称达到良好的真实手机体验。
完整 JSON 存在本次机器的 `/tmp/builderspace-*-lighthouse.json`、`/tmp/builderspace-webgl-fallback.json` 和 `/tmp/builderspace-reduced-motion.json`。

复跑示例（需 Chrome 和 Lighthouse CLI）：

```bash
pnpm build
pnpm start --port 3000
pnpm dlx lighthouse http://localhost:3000/ --only-categories=performance \
  --chrome-flags='--headless --disable-gpu' --output=json --output-path=/tmp/polish-lighthouse.json
```

禁用 WebGL 使用 `--headless --disable-webgl --disable-webgl2`；减少动态效果使用 `--headless --force-prefers-reduced-motion`。

## 包体积与生命周期

四个第三方动效库均为精确版本、动态 import；触控/窄屏不请求 GSAP、ScrollTrigger、SplitText 或 Lenis。动态库分块合计约 **62.6 KiB gzip / 57.6 KiB Brotli**；不包含新增胶水代码及图标，故“全部新增 JS 不超过 60KB”的严格预算尚未达标。

新建 ShaderMount 在卸载/Activity 隐藏时 dispose 并释放自身 WebGL 上下文。异步加载有取消标记，防止隐藏后创建资源。GSAP 还原 context 与 SplitText，Lenis 移除 ticker/监听器并 destroy；待执行的节流 RAF、定时器和共享帧循环订阅均取消。离屏/后台的 ASCII 与字幕不继续跑帧。

`public/works-metal.png` 为离线资产，运行时没有字形采样或 Poisson 解算。生成命令与编码约定见 `scripts/generate-works-metal.py`；需要 Pillow 与 NumPy。
