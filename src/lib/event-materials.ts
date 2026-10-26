// What people take home from an event, keyed by event slug: the materials
// page at /learn/<slug>, linked from Resources and the event page.
// docs/event-materials.md is the checklist for adding one.
//
// Copy stays short: one line per idea, never a paragraph. The download is a
// zip built from this file by scripts/pack-materials.mjs; the test checks it
// still matches. No imports, so the script can load this file directly.

type Bi = { zh: string; en: string };

/** Icons the page can draw (Phosphor, see src/app/learn/[slug]/page.tsx). */
export type MaterialIcon =
  | "calendar"
  | "pin"
  | "link"
  | "sparkle"
  | "prompt"
  | "list"
  | "code"
  | "lifebuoy"
  | "github"
  | "download";

/** A page or repo people used on the day. */
export type MaterialTool = {
  href: string;
  short: string;
  icon: MaterialIcon;
  title: Bi;
  sub: Bi;
  external?: boolean;
};

export type EventMaterials = {
  /** One short line under the title. */
  lede: Bi;
  /** The two cells beside time and place. */
  facts: { icon: MaterialIcon; k: Bi; v: Bi; sub?: Bi }[];
  /** What's in the pack, listed on the card beside the intro. */
  pack: { icon: MaterialIcon; title: Bi; meta: Bi; href: string }[];
  /** The zip under public/events/<slug>/. */
  zip: string;
  tools: MaterialTool[];
  steps: { title: Bi; sub: Bi }[];
  /** Index of the step that opens to show the deploy prompt. */
  deployStep: number;
  deployPrompt: Bi;
  /** If the push fails: one line under the prompt. */
  fallback: Bi;
};

const DEPLOY_ZH = `请帮我把一个个人网站部署到 GitHub Pages。
仓库：<用户名>/<用户名>.github.io（你已有这个仓库的推送权限）

请按顺序做：
1. 把文末的整段 HTML 原样保存为仓库根目录的 index.html，已有就覆盖；不要改动任何内容。
2. 提交（提交信息写 Deploy personal site）并推送到 main 分支。如果只能推到新分支，就开一个合并到 main 的 Pull Request，并告诉我在哪里点 Merge。
3. 确认 GitHub Pages 从 main 分支的 /(root) 发布。如果你没有权限改仓库设置，用三步以内告诉我在 Settings → Pages 里点哪里。
4. 最后告诉我网址 https://<用户名>.github.io/，并提醒我最多等 10 分钟生效。

HTML 如下：
<把改好的整段代码贴在这里>`;

const DEPLOY_EN = `Please deploy a personal website to GitHub Pages for me.
Repo: <username>/<username>.github.io (you can push to it)

In this order:
1. Save the HTML at the end, exactly as it is, as index.html in the repo root, replacing any existing one. Don't change anything in it.
2. Commit it (message: Deploy personal site) and push to main. If you can only push to a new branch, open a pull request into main and tell me where to click Merge.
3. Make sure GitHub Pages publishes from main, /(root). If you can't change repo settings, tell me in three steps or fewer where to click in Settings → Pages.
4. Finally, give me the address https://<username>.github.io/ and remind me it can take up to 10 minutes.

The HTML:
<paste your whole page here>`;

const putYourselfOnline: EventMaterials = {
  lede: {
    zh: "用 AI 做一个自己的网站，3 小时上线。",
    en: "Build your own site with AI, live in three hours.",
  },
  facts: [
    {
      icon: "sparkle",
      k: { zh: "用到", en: "Tools" },
      v: { zh: "AI + GitHub", en: "AI + GitHub" },
      sub: { zh: "都是免费的", en: "All free" },
    },
    {
      icon: "link",
      k: { zh: "带走", en: "You get" },
      v: { zh: "一个网址", en: "Your own address" },
      sub: { zh: "用户名.github.io", en: "username.github.io" },
    },
  ],
  pack: [
    {
      icon: "list",
      title: { zh: "做网站的五步", en: "Five steps" },
      meta: { zh: "1 页", en: "1 page" },
      href: "#steps",
    },
    {
      icon: "code",
      title: { zh: "部署提示词", en: "Deploy prompt" },
      meta: { zh: "复制就能用", en: "Copy and paste" },
      href: "#deploy",
    },
    {
      icon: "lifebuoy",
      title: { zh: "卡住了怎么办", en: "If you get stuck" },
      meta: { zh: "保底方案", en: "Plan B" },
      href: "#deploy",
    },
  ],
  zip: "/events/put-yourself-online/workshop01-materials.zip",
  tools: [
    {
      href: "/prompt",
      short: "builderspace.dev/prompt",
      icon: "prompt",
      title: { zh: "提示词工具", en: "Prompt tool" },
      sub: {
        zh: "挑风格，填信息，复制给 AI。",
        en: "Pick a style, fill in, paste to an AI.",
      },
    },
    {
      href: "https://github.com/EdwinjJ1/personal-website",
      short: "EdwinjJ1/personal-website",
      icon: "github",
      title: { zh: "示例仓库", en: "Example repo" },
      sub: {
        zh: "第一个风格的源码，开源。",
        en: "The code behind the first style. Open source.",
      },
      external: true,
    },
    {
      href: "https://echoagent.dev/#download",
      short: "echoagent.dev",
      icon: "download",
      title: { zh: "Echo Agent", en: "Echo Agent" },
      sub: {
        zh: "没有付费 AI 也能用。Mac 版。",
        en: "No paid AI needed. Mac only.",
      },
      external: true,
    },
  ],
  steps: [
    {
      title: { zh: "想清楚", en: "Decide" },
      sub: {
        zh: "给谁看，放哪三样，想要什么感觉。",
        en: "Who it's for, three things to show, the feel you want.",
      },
    },
    {
      title: { zh: "生成第一版", en: "First version" },
      sub: {
        zh: "挑一个参考网站，填上信息，复制给 AI。",
        en: "Pick a site to follow, fill in your details, paste it to an AI.",
      },
    },
    {
      title: { zh: "一次改一处", en: "One change at a time" },
      sub: {
        zh: "说清哪里不对、想怎么改。改坏了就回上一版。",
        en: "Say what's off and how to fix it. Broke it? Go back a version.",
      },
    },
    {
      title: { zh: "放上网", en: "Put it online" },
      sub: {
        zh: "建「用户名.github.io」仓库，让 AI 推上去。",
        en: "Make a username.github.io repo and let the AI push to it.",
      },
    },
    {
      title: { zh: "以后接着改", en: "Keep it going" },
      sub: {
        zh: "回到同一个对话，改完再推一次，网址不变。",
        en: "Same chat, change it, push again. Same address.",
      },
    },
  ],
  deployStep: 3,
  deployPrompt: { zh: DEPLOY_ZH, en: DEPLOY_EN },
  fallback: {
    zh: "推不上去：仓库页 Upload files 传 index.html，再到 Settings → Pages 打开。",
    en: "Can't push? Upload index.html on the repo page, then turn on Settings → Pages.",
  },
};

const MATERIALS: Record<string, EventMaterials> = {
  "put-yourself-online": putYourselfOnline,
};

export function getEventMaterials(slug: string): EventMaterials | null {
  return MATERIALS[slug] ?? null;
}

/** Every event with materials, for the routes and the checks. */
export const allEventMaterials = () => Object.entries(MATERIALS);

/** The files in the zip, name and text, in both languages. */
export function packFiles(m: EventMaterials) {
  const steps = (l: "zh" | "en") =>
    m.steps
      .map(
        (s, i) =>
          `${i + 1}. ${s.title[l]}${l === "zh" ? "：" : ": "}${s.sub[l]}`,
      )
      .join("\n");
  return [
    {
      name: "five-steps.md",
      text: `# 做网站的五步\n\n${steps("zh")}\n\n${m.fallback.zh}\n\n# Five steps\n\n${steps("en")}\n\n${m.fallback.en}\n`,
    },
    { name: "deploy-prompt-zh.txt", text: `${m.deployPrompt.zh}\n` },
    { name: "deploy-prompt-en.txt", text: `${m.deployPrompt.en}\n` },
    {
      name: "links.md",
      text: `${m.tools.map((t) => `- ${t.title.zh} / ${t.title.en}: ${t.href.startsWith("/") ? `https://www.builderspace.dev${t.href}` : t.href}`).join("\n")}\n`,
    },
  ];
}
