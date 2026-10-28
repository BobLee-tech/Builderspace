// The founders' profile pages (/people/<slug>). Who is listed, their photos and
// their title come from team_members (ops edit those in Supabase); the words
// on the page are here, edited by hand, keyed by team_members.slug. Sources:
// each person's own site and LinkedIn. No contact details, no ages.
//
// Every point is one line: a fact's first line carries it, the lines after
// qualify it, so nothing wraps halfway through a thought on a wide screen.

/** Names the founder's photo on a card and on the profile, so it morphs between them. */
export const founderTransition = (slug: string) => `founder-${slug}`;

/** Set when a founder card opens a profile, so the profile's back goes back. */
export const FROM_PEOPLE = "bs-people-from";

type Text = { zh: string; en: string };
const t = (zh: string, en = zh): Text => ({ zh, en });

export type FounderProfile = {
  /** Chinese name under the name, when it differs from the display name. */
  cn?: string;
  /** What they look after, under their card on /people. */
  focus: Text;
  headline: Text[];
  quote?: { lines: Text[]; by: string };
  facts: { k: Text; lines: Text[] }[];
  wins: { badge: string; gold?: boolean; title: string; lines: Text[] }[];
  links: { label: string; href: string }[];
  site?: {
    href: string;
    domain: string;
    /** File in the team-photos bucket; the site's own preview image. */
    image: string;
    /** CSS background-position for the image in its frame. */
    focus?: string;
    title: Text;
    blurb: Text;
  };
};

export const FOUNDER_PROFILES: Record<string, FounderProfile> = {
  xin: {
    cn: "何昕",
    focus: t("内容 · 社群 · 校园联络", "Content · Community · Campus"),
    headline: [
      t(
        "负责社团的内容、社群和学校联络",
        "Runs the club’s content, community and campus relations",
      ),
    ],
    facts: [
      {
        k: t("在 BuilderSpace", "At BuilderSpace"),
        lines: [
          t("内容与社群运营", "Content and community"),
          t(
            "对接学校，带 O-Week 招新",
            "Works with the university; leads O-Week recruiting",
          ),
        ],
      },
      { k: t("学校", "Study"), lines: [t("UNSW Sydney")] },
    ],
    wins: [],
    links: [
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/xin-he-7a18a338b/",
      },
    ],
  },
  evan: {
    cn: "贾岱林",
    focus: t("方向 · 合作 · 对外", "Direction · Partners · Outreach"),
    headline: [
      t(
        "AI 产品经理 × 全栈 Agent 开发者",
        "AI product manager × full-stack agent builder",
      ),
      t(
        "喜欢把一件事从设计到上线自己做完",
        "Likes to own a thing from design to launch",
      ),
    ],
    quote: {
      lines: [
        t("宁可瞄得太高打偏，", "I’d rather aim too high and miss"),
        t("也不想瞄低了打中。", "than aim low and hit."),
      ],
      by: "Evan Jia",
    },
    facts: [
      {
        k: t("在 BuilderSpace", "At BuilderSpace"),
        lines: [
          t("定社团方向", "Sets the club’s direction"),
          t("对接 Arc 和合作方", "Works with Arc and partners"),
        ],
      },
      {
        k: t("现在", "Now"),
        lines: [
          t(
            "模思智能 MOSI · AI 产品经理实习",
            "AI product manager intern, MOSI",
          ),
          t(
            "做 MosMos 的语音 Agent，代码自己写完上线",
            "Builds the MosMos voice agent and ships the code himself",
          ),
        ],
      },
      {
        k: t("之前", "Before"),
        lines: [
          t(
            "17 岁在北京创立 Hypha，任 CEO",
            "Founded Hypha in Beijing at 17, as CEO",
          ),
          t(
            "带 7 人团队，核心产品单日营业额破 10 万元",
            "Led a team of seven past ¥100K in single-day revenue",
          ),
        ],
      },
      {
        k: t("学校", "Study"),
        lines: [
          t("UNSW 计算机科学", "Computer Science, UNSW"),
          t(
            "方向：机器学习、计算机视觉",
            "Machine learning and computer vision",
          ),
        ],
      },
    ],
    wins: [
      {
        badge: "Susquehanna Prize",
        gold: true,
        title: "Athena",
        lines: [
          t(
            "UNSW × Mistral AI × Atlassian 黑客松",
            "UNSW × Mistral AI × Atlassian hackathon",
          ),
          t(
            "24 小时做出主动追进度的 Agent",
            "A progress-chasing agent, built in 24 hours",
          ),
        ],
      },
      {
        badge: "Top 3",
        title: "Roundtable",
        lines: [
          t(
            "字节跳动飞书 AI 校园挑战赛 · Agent 赛道",
            "ByteDance Feishu AI Campus Challenge · Agent track",
          ),
          t(
            "开源的多 Agent 协作工作台",
            "An open-source multi-agent workbench",
          ),
        ],
      },
      {
        badge: "Finalist",
        title: "Akeso",
        lines: [t("ICON × Lyra Innovation Challenge")],
      },
      {
        badge: "156 ★",
        title: "Chiron Prompt",
        lines: [
          t(
            "开源的终端提示词增强 CLI",
            "An open-source prompt enhancer for the terminal",
          ),
        ],
      },
    ],
    links: [
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/evan-jia-152108369/",
      },
      { label: "GitHub", href: "https://github.com/EdwinjJ1" },
    ],
    site: {
      href: "https://evanlin.site/",
      domain: "evanlin.site",
      image: "56d488dcf430-site.webp",
      title: t("一张桌子，十个宇宙", "One desk, ten universes"),
      blurb: t(
        "可以点的 3D 工位，每个物件是一段经历",
        "A clickable 3D desk; every object opens a project",
      ),
    },
  },
  bob: {
    focus: t("官网 · 数据 · 技术", "Website · Data · Tech"),
    headline: [
      t("产品与全栈开发", "Product and full-stack developer"),
      t("社团官网 builderspace.dev 由他搭建", "Built builderspace.dev"),
    ],
    quote: {
      lines: [
        t(
          "时日见真，不辞委蛇。",
          "Time shows what is true; I don’t mind the winding road.",
        ),
      ],
      by: "Bob Lee",
    },
    facts: [
      {
        k: t("在 BuilderSpace", "At BuilderSpace"),
        lines: [
          t("负责官网和数据", "Runs the website and data"),
          t(
            "主持与 USYD Vibe Coding Society 合办的第一场 Workshop",
            "Hosted the first workshop co-run with USYD Vibe Coding Society",
          ),
        ],
      },
      {
        k: t("做过", "Built"),
        lines: [
          t("Adaptiq · AI 教学系统", "Adaptiq · an AI teaching system"),
          t("合伙人，负责产品与全栈", "Partner on product and full-stack"),
          t("已交付一家教育机构", "Delivered to an education provider"),
        ],
      },
      { k: t("学校", "Study"), lines: [t("UNSW Sydney")] },
    ],
    wins: [
      {
        badge: "Susquehanna Prize",
        gold: true,
        title: "Athena",
        lines: [
          t("和 Evan 同队", "Same team as Evan"),
          t("负责前端与全栈", "Frontend and full-stack"),
        ],
      },
      {
        badge: "Finalist",
        title: "Akeso",
        lines: [
          t("ICON UNSW × Lyra"),
          t("负责产品设计与后端", "Product design and backend"),
        ],
      },
      {
        badge: "Delivered",
        title: "Adaptiq",
        lines: [
          t(
            "AI 起草学情报告，老师定稿",
            "AI drafts the progress report; the teacher signs off",
          ),
          t("家长看得懂孩子的进步", "Parents can see the progress"),
        ],
      },
    ],
    links: [
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/bob-lee-433011356/",
      },
      { label: "GitHub", href: "https://github.com/BobLee-tech" },
    ],
    site: {
      href: "https://www.boblee.dev/",
      domain: "boblee.dev",
      image: "66030ecb7410-site.webp",
      focus: "center 28%",
      title: t("Oasis · Bob Lee 的小站", "Oasis · Bob Lee’s corner"),
      blurb: t(
        "记录学习、成长与微小美好的数字花园",
        "A quiet garden of learning, growing and small good things",
      ),
    },
  },
};
