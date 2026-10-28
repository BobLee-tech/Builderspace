// What people take home from an event, keyed by event slug: the materials
// page at /learn/<slug>, linked from Resources and the event page.
// docs/event-materials.md is the checklist for adding one.
//
// The page is a tool, not a reading list: three paths (change my site, start
// from zero, I'm stuck) and a kit that turns a GitHub username into links and
// ready-to-send prompts. Copy stays short: one line per idea.
//
// Templates: "{u}" becomes the visitor's GitHub username (or "用户名" /
// "username" until they type one). In prompts, 【…】 (zh) and […] (en) mark
// what the visitor replaces; the page highlights them.

import type { Spark } from "./members";

type Bi = { zh: string; en: string };

/** The three ways in. */
export type MaterialPath = "edit" | "start" | "stuck";

/** Icons the kit can draw (Phosphor, see src/app/learn/[slug]/workbench.tsx). */
export type KitIcon = "globe" | "book" | "upload" | "gear" | "pulse";

export type StepAction =
  | { kind: "link"; label: Bi; href: string; solid?: boolean }
  | { kind: "copy"; label: Bi; text: "deploy" }
  | { kind: "go"; label: Bi; to: MaterialPath };

export type EventMaterials = {
  /** One short line: the Resources card and the page description. */
  lede: Bi;
  paths: {
    id: MaterialPath;
    spark: Spark;
    title: Bi;
    sub: Bi;
    head: Bi;
    note: Bi;
  }[];
  /** Links under the username, every href a template. */
  kit: { icon: KitIcon; title: Bi; sub: Bi; href: string }[];
  /** First message in a new chat when the day's chat is gone. */
  handoff: Bi;
  /** One change each; the push line is added by the page. */
  changes: { title: Bi; prompt: Bi }[];
  /** Ends every change and fix prompt. */
  push: Bi;
  steps: { title: Bi; sub?: Bi; subs?: Bi[]; actions?: StepAction[] }[];
  deployPrompt: Bi;
  stuck: {
    title: Bi;
    checks: Bi[];
    link?: { label: Bi; href: string };
    prompt: Bi;
  }[];
  /** The image people save to their phone. */
  poster: { steps: { title: Bi; sub: Bi }[]; tip: Bi };
};

const SITE = "https://{u}.github.io";
const REPO = "https://github.com/{u}/{u}.github.io";

const putYourselfOnline: EventMaterials = {
  lede: {
    zh: "改网站、从零开始、卡住了，都在这。",
    en: "Change your site, start from zero, or get unstuck.",
  },
  paths: [
    {
      id: "edit",
      spark: "momo",
      title: { zh: "我想改网站", en: "Change my site" },
      sub: { zh: "加经历、换颜色", en: "New role, new colour" },
      head: {
        zh: "一次改一处，复制一条发给 AI",
        en: "One change at a time. Copy one, send it to your AI.",
      },
      note: { zh: "【】里换成你的内容", en: "Replace what's in [ ]" },
    },
    {
      id: "start",
      spark: "vivi",
      title: { zh: "我从零开始", en: "Start from zero" },
      sub: { zh: "五步，跟着点", en: "Five steps, click along" },
      head: { zh: "跟着点，做完一步勾一步", en: "Click along, tick as you go" },
      note: { zh: "进度存在这台电脑上", en: "Saved on this device" },
    },
    {
      id: "stuck",
      spark: "geo",
      title: { zh: "我卡住了", en: "I'm stuck" },
      sub: { zh: "按问题找答案", en: "Find your problem" },
      head: { zh: "遇到的是哪一个？", en: "Which one is it?" },
      note: { zh: "点开看怎么查", en: "Open one to see what to check" },
    },
  ],
  kit: [
    {
      icon: "globe",
      title: { zh: "我的网站", en: "My site" },
      sub: { zh: "{u}.github.io", en: "{u}.github.io" },
      href: SITE,
    },
    {
      icon: "book",
      title: { zh: "我的仓库", en: "My repo" },
      sub: { zh: "每一版都在这", en: "Every version lives here" },
      href: REPO,
    },
    {
      icon: "upload",
      title: { zh: "上传 index.html", en: "Upload index.html" },
      sub: { zh: "AI 推不上去时", en: "When the AI can't push" },
      href: `${REPO}/upload/main`,
    },
    {
      icon: "gear",
      title: { zh: "Pages 设置", en: "Pages settings" },
      sub: { zh: "网址打不开时", en: "When the address won't open" },
      href: `${REPO}/settings/pages`,
    },
    {
      icon: "pulse",
      title: { zh: "上线进度", en: "Deploys" },
      sub: { zh: "改了没变化时", en: "When a change doesn't show" },
      href: `${REPO}/actions`,
    },
  ],
  handoff: {
    zh: `这是我的个人网站：${REPO}\n先读一下 index.html，记住现在的样子。\n接下来我一次提一个修改，每次改完都推送到 main 分支。`,
    en: `This is my personal site: ${REPO}\nRead index.html first so you know how it looks now.\nI'll ask for one change at a time. Push each one to main.`,
  },
  changes: [
    {
      title: { zh: "加一段经历", en: "Add a role" },
      prompt: {
        zh: "在「经历」里加一条：【公司 / 职位 / 时间 / 做了什么】。保持现在的风格，只改这一处。",
        en: "Add one entry under Experience: [company / role / dates / what you did]. Keep the current style and change nothing else.",
      },
    },
    {
      title: { zh: "加一个项目", en: "Add a project" },
      prompt: {
        zh: "加一个项目：【名字】，【一句话介绍】，链接【网址，没有就不放按钮】。",
        en: "Add a project: [name], [one-line description], link [URL, or no button if there isn't one].",
      },
    },
    {
      title: { zh: "换配色", en: "New colour" },
      prompt: {
        zh: "把主色换成【颜色，比如深绿】。其他都不变。",
        en: "Change the main colour to [a colour, e.g. deep green]. Leave everything else.",
      },
    },
    {
      title: { zh: "加中英切换", en: "Add 中 / EN" },
      prompt: {
        zh: "加一个「中 / EN」切换。英文是现在内容的翻译，中文不改。",
        en: "Add a 中 / EN switch. The Chinese is a translation of what's there now; keep the English as it is.",
      },
    },
    {
      title: { zh: "手机上排版乱", en: "Broken on phones" },
      prompt: {
        zh: "手机上（宽 375px）【哪里】乱了。修好，不能左右滑，电脑上不变。",
        en: "On a phone (375px wide), [which part] breaks. Fix it with no sideways scrolling, and leave the desktop as it is.",
      },
    },
    {
      title: { zh: "加联系方式", en: "Add contacts" },
      prompt: {
        zh: "在页尾加联系方式：【邮箱 / 领英 / 小红书】。只放我写的。",
        en: "Add contacts at the bottom: [email / LinkedIn / Instagram]. Only the ones I give you.",
      },
    },
  ],
  push: { zh: "改完推送到 main 分支。", en: "Push to main when you're done." },
  steps: [
    {
      title: { zh: "想清楚", en: "Decide" },
      sub: {
        zh: "给谁看？放哪三样？想要什么感觉？",
        en: "Who's it for? Which three things? What feel?",
      },
    },
    {
      title: { zh: "注册 GitHub", en: "Sign up to GitHub" },
      sub: {
        zh: "用户名就是你以后的网址。注册好填到 kit 里。",
        en: "Your username becomes your address. Put it in the kit.",
      },
      actions: [
        {
          kind: "link",
          label: { zh: "去注册", en: "Sign up" },
          href: "https://github.com/signup",
        },
      ],
    },
    {
      title: { zh: "生成第一版", en: "First version" },
      sub: {
        zh: "挑一个喜欢的网站当参考，填信息，复制给 AI。",
        en: "Pick a site to follow, fill in your details, paste it to an AI.",
      },
      actions: [
        {
          kind: "link",
          label: { zh: "打开提示词工具", en: "Open the prompt tool" },
          href: "/prompt",
          solid: true,
        },
      ],
    },
    {
      title: { zh: "放上网", en: "Put it online" },
      subs: [
        {
          zh: "建一个空仓库，名字已经帮你填好",
          en: "Make an empty repo; the name is filled in",
        },
        {
          zh: "把部署提示词和你的 HTML 发给 AI",
          en: "Send the deploy prompt and your HTML to the AI",
        },
        {
          zh: "推不上去，就自己上传 index.html",
          en: "If it can't push, upload index.html yourself",
        },
      ],
      actions: [
        {
          kind: "link",
          label: { zh: "新建仓库", en: "New repo" },
          href: "https://github.com/new?name={u}.github.io",
        },
        {
          kind: "copy",
          label: { zh: "复制部署提示词", en: "Copy the deploy prompt" },
          text: "deploy",
        },
        {
          kind: "link",
          label: { zh: "上传文件", en: "Upload" },
          href: `${REPO}/upload/main`,
        },
      ],
    },
    {
      title: { zh: "打开看看", en: "Open it" },
      sub: {
        zh: "电脑和手机都打开一次。最多等 10 分钟。",
        en: "Check it on a laptop and a phone. Allow up to 10 minutes.",
      },
      actions: [
        {
          kind: "link",
          label: { zh: "打开我的网站", en: "Open my site" },
          href: SITE,
          solid: true,
        },
        {
          kind: "go",
          label: { zh: "打不开？", en: "Won't open?" },
          to: "stuck",
        },
      ],
    },
  ],
  deployPrompt: {
    zh: `请帮我把一个个人网站部署到 GitHub Pages。
仓库：{u}/{u}.github.io（你已有这个仓库的推送权限）

1. 把文末的整段 HTML 原样保存为 index.html，已有就覆盖。
2. 提交并推送到 main。只能推新分支就开 PR，告诉我在哪点 Merge。
3. 确认 Pages 从 main 的 /(root) 发布。没权限改设置，就告诉我在 Settings → Pages 点哪里。
4. 告诉我网址 https://{u}.github.io/，提醒我最多等 10 分钟。

HTML 如下：
【把改好的整段代码贴在这里】`,
    en: `Please deploy a personal website to GitHub Pages for me.
Repo: {u}/{u}.github.io (you can push to it)

1. Save the HTML at the end, exactly as it is, as index.html, replacing any existing one.
2. Commit and push to main. If you can only push a new branch, open a PR and tell me where to click Merge.
3. Make sure Pages publishes from main, /(root). If you can't change settings, tell me where to click in Settings → Pages.
4. Give me the address https://{u}.github.io/ and remind me it can take up to 10 minutes.

The HTML:
[paste your whole page here]`,
  },
  stuck: [
    {
      title: { zh: "网址打开是 404", en: "The address shows 404" },
      checks: [
        {
          zh: "仓库名和用户名完全一样吗？",
          en: "Does the repo name match your username exactly?",
        },
        { zh: "Pages 打开了吗？", en: "Is Pages turned on?" },
        { zh: "等 10 分钟再刷新", en: "Wait 10 minutes, then refresh" },
      ],
      link: {
        label: { zh: "Pages 设置", en: "Pages settings" },
        href: `${REPO}/settings/pages`,
      },
      prompt: {
        zh: "我的网址 https://{u}.github.io 打开是 404。请检查仓库根目录有没有 index.html，Pages 是不是从 main 的 /(root) 发布，告诉我哪里不对。",
        en: "My address https://{u}.github.io shows a 404. Check that index.html is in the repo root and that Pages publishes from main, /(root), and tell me what's wrong.",
      },
    },
    {
      title: { zh: "AI 说没有权限推送", en: "The AI says it can't push" },
      checks: [
        {
          zh: "给 GitHub App 写入权限",
          en: "Give the GitHub App write access",
        },
        {
          zh: "只授权「用户名.github.io」这一个仓库",
          en: "Allow only the username.github.io repo",
        },
        { zh: "还不行，就自己上传", en: "Still stuck? Upload it yourself" },
      ],
      link: {
        label: { zh: "上传文件", en: "Upload" },
        href: `${REPO}/upload/main`,
      },
      prompt: {
        zh: "你推送不到 {u}/{u}.github.io。请告诉我在 GitHub 里点哪里给你写入权限，三步以内。",
        en: "You can't push to {u}/{u}.github.io. Tell me where to click in GitHub to give you write access, in three steps or fewer.",
      },
    },
    {
      title: { zh: "改了，网站没变化", en: "I changed it, nothing happened" },
      checks: [
        { zh: "看上线进度是不是绿的", en: "Check the deploy is green" },
        { zh: "强制刷新：⌘ + Shift + R", en: "Hard refresh: ⌘ + Shift + R" },
        { zh: "最多等 10 分钟", en: "Allow up to 10 minutes" },
      ],
      link: {
        label: { zh: "上线进度", en: "Deploys" },
        href: `${REPO}/actions`,
      },
      prompt: {
        zh: "我改了网站，但 https://{u}.github.io 没变化。请确认改动已经推送到 main，并告诉我上线进度在哪看。",
        en: "I changed my site but https://{u}.github.io looks the same. Make sure the change is pushed to main and tell me where to see the deploy.",
      },
    },
    {
      title: { zh: "手机上要左右滑", en: "It scrolls sideways on phones" },
      checks: [
        { zh: "多半是某个元素太宽", en: "Something is usually too wide" },
        { zh: "把这条发给 AI", en: "Send this to the AI" },
      ],
      prompt: {
        zh: "手机上（宽 375px）页面能左右滑。找出太宽的元素并修好，电脑上不变。",
        en: "On a phone (375px wide) the page scrolls sideways. Find what's too wide and fix it, leaving the desktop as it is.",
      },
    },
    {
      title: { zh: "AI 编了我没有的经历", en: "The AI made things up" },
      checks: [
        {
          zh: "别手动删，让 AI 自己清",
          en: "Don't delete by hand; have the AI clean it up",
        },
        {
          zh: "以后提示词里写明「只用我给的信息」",
          en: 'Next time, say "only use what I give you"',
        },
      ],
      prompt: {
        zh: "删掉所有我没提供的经历、数字和链接，只留我给过的信息。",
        en: "Remove every role, number and link I didn't give you. Keep only what I provided.",
      },
    },
  ],
  poster: {
    steps: [
      {
        title: { zh: "想清楚", en: "Decide" },
        sub: { zh: "给谁看，放哪三样", en: "who it's for, three things" },
      },
      {
        title: { zh: "生成", en: "Generate" },
        sub: { zh: "挑风格，复制给 AI", en: "pick a style, paste to AI" },
      },
      {
        title: { zh: "改", en: "Refine" },
        sub: { zh: "一次一处，坏了就回退", en: "one change at a time" },
      },
      {
        title: { zh: "上线", en: "Deploy" },
        sub: { zh: "部署提示词，让 AI 推", en: "send the deploy prompt" },
      },
      {
        title: { zh: "更新", en: "Update" },
        sub: { zh: "同一个对话，改完再推", en: "same chat, push again" },
      },
    ],
    tip: {
      zh: "打不开？等 10 分钟，再看仓库名对不对。",
      en: "Won't open? Wait 10 minutes, then check the repo name.",
    },
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

/** Puts a username into a template; before one is typed, a stand-in. */
export function fillUser(template: string, user: string, lang: "zh" | "en") {
  return template.replaceAll(
    "{u}",
    user || (lang === "zh" ? "用户名" : "username"),
  );
}

/** The parts of a prompt the visitor replaces: 【…】 and […]. */
export const PLACEHOLDER = /(【[^】]*】|\[[^\]\n]*\])/;
