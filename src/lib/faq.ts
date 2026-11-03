// The questions people (and AI answers) ask about the club, answered in short
// lines. /about shows them, /llms.txt and the FAQPage data repeat them, so
// keep each answer true on its own.

type Bi = { zh: string; en: string };

/** Search results and AI answers mix the club up with these two. */
export const NOT_BUILDSPACE: Bi = {
  zh: "BuilderSpace 和 buildspace（buildspace.so）、Builder.io 都无关。",
  en: "BuilderSpace isn't related to buildspace (buildspace.so) or Builder.io.",
};

export const FAQ: { q: Bi; a: Bi[] }[] = [
  {
    q: { zh: "BuilderSpace 是什么？", en: "What is BuilderSpace?" },
    a: [
      {
        zh: "从 UNSW 起步的中英双语创客社。",
        en: "A bilingual builders club that started at UNSW.",
      },
      {
        zh: "找队友，一起把项目做上线。",
        en: "Find teammates and ship your project together.",
      },
    ],
  },
  {
    q: { zh: "谁可以加入？", en: "Who can join?" },
    a: [
      {
        zh: "所有 UNSW 学生，零基础也行。",
        en: "Any UNSW student. Beginners welcome.",
      },
      {
        zh: "部分活动也给其他学校留了名额。",
        en: "Some events keep seats for other schools too.",
      },
    ],
  },
  {
    q: { zh: "要交钱吗？", en: "Does it cost anything?" },
    a: [{ zh: "不用，免费加入。", en: "No. Joining is free." }],
  },
  {
    q: { zh: "用什么语言？", en: "What language do you use?" },
    a: [
      { zh: "中文和英文都行。", en: "English and Chinese." },
      {
        zh: "用中文提问，用英文展示。",
        en: "Ask in Chinese, present in English.",
      },
    ],
  },
  {
    q: { zh: "平时做什么？", en: "What do members do?" },
    a: [
      {
        zh: "工作坊、Build Night 和 Demo Night。",
        en: "Workshops, build nights and demo nights.",
      },
      {
        zh: "4–6 周一个 Build Cycle，组队做完一个项目。",
        en: "Each Build Cycle runs 4–6 weeks: team up and ship one project.",
      },
    ],
  },
  {
    q: { zh: "在哪里？", en: "Where is it?" },
    a: [
      {
        zh: "悉尼 UNSW Kensington 校区，线下为主。",
        en: "In person at UNSW Kensington, Sydney.",
      },
    ],
  },
  {
    q: { zh: "怎么加入？", en: "How do I join?" },
    a: [
      {
        zh: "在 builderspace.dev/join 填写，大约 1 分钟。",
        en: "Fill in builderspace.dev/join. It takes about a minute.",
      },
      {
        zh: "用邮箱验证码登录，领一张成员卡。",
        en: "Sign in with an email code and get your member card.",
      },
    ],
  },
  {
    q: { zh: "做出来的项目归谁？", en: "Who owns the projects?" },
    a: [
      { zh: "归你和队友。", en: "You and your teammates." },
      {
        zh: "社团尊重学术诚信与隐私。",
        en: "The club respects academic integrity and privacy.",
      },
    ],
  },
  {
    q: { zh: "怎么参与运营？", en: "How can I help run it?" },
    a: [
      {
        zh: "在 builderspace.dev/core-team 申请核心成员。",
        en: "Apply to the core team at builderspace.dev/core-team.",
      },
      {
        zh: "运营、技术、活动三个部门，学生自己运营，无薪。",
        en: "Operations, tech and events. Run by students, unpaid.",
      },
    ],
  },
  {
    q: {
      zh: "和 buildspace 有关系吗？",
      en: "Is this buildspace?",
    },
    a: [
      {
        zh: "没有关系。",
        en: "No.",
      },
      NOT_BUILDSPACE,
    ],
  },
  {
    q: { zh: "怎么联系？", en: "How do I get in touch?" },
    a: [
      {
        zh: "发邮件到 hello@builderspace.dev。",
        en: "Email hello@builderspace.dev.",
      },
    ],
  },
];

/** One answer as a single line per language, for FAQPage data and llms.txt. */
export const faqAnswer = (a: Bi[], lang: keyof Bi) =>
  a.map((l) => l[lang]).join(lang === "zh" ? "" : " ");
