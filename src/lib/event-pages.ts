// Short copy for event pages, keyed by event slug. The event row (title, the
// one-line summary, time, place, capacity, sign-up deadline) lives in
// Supabase; this is the extra detail ops would otherwise paste into a
// description field. An event without an entry still gets a plain page.
//
// Only what participants should see goes here: no staffing, KPIs or names of
// guests who haven't confirmed.

import type { SeatGroup, SiteEvent } from "./types";

type Bi = { zh: string; en: string };

/** Icons the page can draw next to a short line (Phosphor, see page.tsx). */
export type EventIcon =
  | "code"
  | "sparkle"
  | "people"
  | "laptop"
  | "github"
  | "snack"
  | "prompt"
  | "live"
  | "intent"
  | "download"
  | "clock"
  | "play"
  | "box"
  | "wrench"
  | "notes";

/**
 * Wording while the event has no date (events.date_tbc): the row's
 * starts_at only places it, so the page says this instead.
 */
export type EventTbc = {
  /** The date column on /events and the strip, e.g. 下周 / Next week. */
  short: Bi;
  /** The "When" cell, with a note under it. */
  when: Bi;
  whenNote: Bi;
  /** Stands in for the location while that isn't set either. */
  where?: Bi;
  /** What's settled (done) and what isn't, in the side card. */
  status: { done: boolean; label: Bi; value: Bi }[];
  /** The side card's heading; "Date TBC." by default. */
  heading?: Bi;
};

/** Someone on the page: the guest, a host, a club. */
export type EventPerson = { initial: string; name: string; role: Bi };

/** A short item: a title, one line under it, an optional mono marker. */
export type EventLine = { mark?: string; title: Bi; sub?: Bi };

/**
 * Blocks under the intro, in order. Each holds short lines only; the page
 * draws them in the site's black / white / chrome.
 */
export type EventSection =
  /** Parts of the programme, each led by someone. */
  | {
      kind: "parts";
      heading: Bi;
      parts: { title: Bi; who: EventPerson; items: EventLine[] }[];
    }
  /** Cards in a grid; a `maybe` card is drawn as not yet certain. */
  | {
      kind: "cards";
      heading: Bi;
      /** Columns at full width; fewer as the page narrows. */
      cols: 2 | 3 | 4;
      items: {
        mark?: string;
        label?: string;
        title: Bi;
        sub: Bi;
        maybe?: boolean;
      }[];
    }
  /** Terms and what each one does, one row each. */
  | { kind: "terms"; heading: Bi; items: { term: string; sub: Bi }[] }
  /** A rough run of the day, drawn to scale by minutes. */
  | {
      kind: "flow";
      heading: Bi;
      note?: Bi;
      steps: { label: Bi; minutes: number; hands?: boolean; rest?: boolean }[];
    }
  /** A numbered build path; `room` steps are drawn hollow. */
  | {
      kind: "steps";
      heading: Bi;
      legend: { robot: Bi; room: Bi; note?: Bi };
      steps: { title: Bi; sub: Bi; room?: boolean }[];
    }
  /** What gets built: one Collector drawn as parts, with the counts. */
  | {
      kind: "collector";
      heading: Bi;
      fleet: { count: number; spare?: number; label: Bi; sub: Bi }[];
      layers: { label: Bi; title: Bi; sub?: Bi }[];
    }
  /** Who can come: one big line, and the help on hand. */
  | {
      kind: "bar";
      heading: Bi;
      quote: Bi[];
      sub: Bi;
      help: { icon: EventIcon; title: Bi; sub: Bi; tbc?: boolean }[];
    }
  /** The guest and their record. */
  | {
      kind: "guest";
      heading: Bi;
      who: EventPerson;
      items: EventLine[];
      link?: { href: string; label: Bi };
    };

/** A page people open on the day, linked from the event page. */
export type EventTool = {
  href: string;
  /** The address as it's said out loud and printed on the slides. */
  short: string;
  icon: EventIcon;
  title: Bi;
  sub: Bi;
  /** Another site: opens in a new tab. */
  external?: boolean;
};

export type EventPage = {
  /**
   * The English title: a small line under the Chinese one, and the title
   * itself when the site is in English.
   */
  display: string;
  /** The one-line summary in English (the Chinese one is the event row's). */
  summaryEn: string;
  /** What it costs, shown with the time and place; left out while unknown. */
  cost?: Bi;
  /** No charge to attend; the event's search data says so. */
  free: boolean;
  costNote?: Bi;
  /** A line under the location, e.g. the building. */
  whereNote?: Bi;
  /** A line under the seat count, e.g. how the seats are split. */
  seatsNote?: Bi;
  /** More cells beside when / where / cost / seats. */
  facts?: { icon: EventIcon; label: Bi; value: Bi; note?: Bi }[];
  /** One or two words each, shown as tags beside the cost. */
  highlights: Bi[];
  hosts: Bi;
  /** While events.date_tbc is on. */
  tbc?: EventTbc;
  /** Sign-up happens on another site (the row's signup_url): its name and a line. */
  signupVia?: { name: string; note: Bi };
  /** The event's poster, in public/events/<slug>/, beside the sign-up button. */
  poster?: { src: string; width: number; height: number; alt: string };
  /** Usernames the address bar in the hero types out, in turn. */
  handles?: string[];
  /** Short promises (three); under the address bar when there is one. */
  points?: { icon: EventIcon; title: Bi; sub: Bi }[];
  /** The heading over the promises; "You leave with" by default. */
  pointsHeading?: Bi;
  /** Blocks under the promises. */
  sections?: EventSection[];
  /** What to bring, a few words each. */
  bring?: { icon: EventIcon; label: Bi }[];
  /** Pages used on the day, at the top of the event page. */
  tools?: EventTool[];
  /** Ask for a GitHub username on sign-up (a build-along workshop). */
  asksGithub: boolean;
  /**
   * Seat groups that can sign up but aren't advertised: their seats sit on
   * top of the rest, and the head-counts on the site leave them out.
   */
  unlistedSeats?: SeatGroup[];
};

const putYourselfOnline: EventPage = {
  display: "Put yourself online.",
  summaryEn:
    "Bring a laptop, build a personal website with AI and publish it on GitHub Pages.",
  cost: { zh: "免费", en: "Free" },
  free: true,
  costNote: { zh: "有零食和水，不含午饭", en: "Snacks and water; no lunch" },
  highlights: [{ zh: "零基础", en: "No experience needed" }],
  hosts: {
    zh: "主办 BuilderSpace（UNSW）· 协办 悉大合作社团",
    en: "Hosted by BuilderSpace (UNSW) with a University of Sydney partner society",
  },
  handles: ["yuki", "alex-chen", "mia-design", "your-name"],
  points: [
    {
      icon: "code",
      title: { zh: "零基础", en: "Zero experience" },
      sub: { zh: "不用会写代码", en: "No coding needed" },
    },
    {
      icon: "sparkle",
      title: { zh: "AI 做网站", en: "Built with AI" },
      sub: { zh: "生成、修改、上线", en: "Generate, refine, ship" },
    },
    {
      icon: "people",
      title: { zh: "一桌新朋友", en: "New friends" },
      sub: { zh: "按主题坐，一起做", en: "Sit by topic, build together" },
    },
  ],
  bring: [
    { icon: "laptop", label: { zh: "电脑和充电器", en: "Laptop and charger" } },
    {
      icon: "github",
      label: {
        zh: "GitHub 账号（已验证邮箱）",
        en: "GitHub account (email verified)",
      },
    },
    {
      icon: "snack",
      label: { zh: "不含午饭，有零食和水", en: "No lunch; snacks and water" },
    },
  ],
  tools: [
    {
      href: "/prompt",
      short: "builderspace.dev/prompt",
      icon: "prompt",
      title: { zh: "提示词网站", en: "Prompt builder" },
      sub: {
        zh: "选风格、填信息，复制整段提示词发给 AI，拿到第一版网站。",
        en: "Pick a style, fill in your details and copy the whole prompt for the AI.",
      },
    },
    {
      href: "/live/put-yourself-online",
      short: "builderspace.dev/live",
      icon: "live",
      title: { zh: "现场页", en: "Live page" },
      sub: {
        zh: "签到、最爱的 AI、意向、交网址、秀、反馈：主持人切到哪一步，这一页就换到哪一步。",
        en: "Check-in, favourite AI, next steps, hand-in, show and feedback: it follows the host step by step.",
      },
    },
    {
      href: "/intent",
      short: "builderspace.dev/intent",
      icon: "intent",
      title: { zh: "意向收集", en: "What's next" },
      sub: {
        zh: "嘉宾分享后扫这个码，说说接下来想和我们做什么。现场开着的时候随时能填。",
        en: "After the guest's talk: tell us what you'd like to do next. Open any time during the event.",
      },
    },
    {
      href: "https://echoagent.dev/#download",
      short: "echoagent.dev",
      icon: "download",
      title: { zh: "下载 Echo Agent", en: "Download Echo Agent" },
      sub: {
        zh: "没有付费 AI 也能用它做网站。目前只有 Mac 版（macOS 15 以上，Apple 芯片）。",
        en: "Build your site without a paid AI. Mac only for now (macOS 15+, Apple silicon).",
      },
      external: true,
    },
  ],
  asksGithub: true,
  // USYD students sign up through the partner society; non-students still
  // can here, but the page only shows the 42 UNSW seats.
  unlistedSeats: ["external"],
};

// 11/12 with ViberSpace (USYD): tickets on Humanitix, which has the details.
const aiStudyCareerTalk: EventPage = {
  display: "AI Study Session & Career Talk",
  summaryEn:
    "An engineer walks you through grad hiring, then AI turns a term of notes into one cheatsheet.",
  cost: { zh: "免费", en: "Free" },
  free: true,
  costNote: { zh: "在 Humanitix 领票", en: "Ticket on Humanitix" },
  whereNote: {
    zh: "Susan Wakil Health Building 四楼",
    en: "Level 4, Susan Wakil Health Building",
  },
  seatsNote: { zh: "先到先得", en: "First come, first served" },
  highlights: [
    { zh: "与 ViberSpace 联办", en: "With ViberSpace" },
    { zh: "带电脑", en: "Bring a laptop" },
  ],
  hosts: {
    zh: "主办 ViberSpace（悉大 Vibe Coding Club）× BuilderSpace（UNSW）",
    en: "Hosted by ViberSpace (USYD Vibe Coding Club) and BuilderSpace (UNSW)",
  },
  signupVia: {
    name: "Humanitix",
    note: {
      zh: "票务和最终时间地点以 Humanitix 为准",
      en: "Humanitix has the tickets and the final details",
    },
  },
  poster: {
    src: "/events/ai-study-career-talk/poster.jpg",
    width: 1280,
    height: 1707,
    alt: "Build your OFFER：AI 复习分享会 × 求职经验分享海报",
  },
  sections: [
    {
      kind: "parts",
      heading: { zh: "两段内容", en: "Two parts" },
      parts: [
        {
          title: { zh: "求职分享", en: "Career talk" },
          who: {
            initial: "L",
            name: "Luka",
            role: {
              zh: "软件工程师 · 近 2 年大厂经验",
              en: "Software engineer · ~2 years at a big tech firm",
            },
          },
          items: [
            {
              title: { zh: "校招通关地图", en: "The grad-hiring map" },
              sub: {
                zh: "秋招 / 春招节奏，笔试、测评、面试",
                en: "Autumn and spring rounds: tests, assessments, interviews",
              },
            },
            {
              title: {
                zh: "用 AI，不被 AI 用",
                en: "Use AI, don't get used by it",
              },
              sub: {
                zh: "AI 时代，工程师怎么找准位置",
                en: "Where an engineer stands now",
              },
            },
            {
              title: { zh: "内推 + 现场答疑", en: "Referrals + live Q&A" },
              sub: {
                zh: "开发岗，面向 CS / EE；国内校招为主，少量实习",
                en: "Dev roles for CS / EE; mostly China grad roles, some internships",
              },
            },
          ],
        },
        {
          title: { zh: "AI 复习工作坊", en: "AI study workshop" },
          who: {
            initial: "V",
            name: "ViberSpace",
            role: { zh: "悉大 Vibe Coding Club", en: "USYD Vibe Coding Club" },
          },
          items: [
            {
              title: { zh: "现场演示", en: "Live demo" },
              sub: {
                zh: "用 AI 把一学期课件压成一页 Cheatsheet",
                en: "AI squeezes a term of slides into one cheatsheet",
              },
            },
            {
              title: { zh: "一起复习", en: "Study together" },
              sub: {
                zh: "做你自己的那一页，有问题当场问",
                en: "Make your own page, ask as you go",
              },
            },
            {
              title: { zh: "带上", en: "Bring" },
              sub: {
                zh: "电脑、充电器，和这学期的课件笔记",
                en: "Laptop, charger and this term's notes",
              },
            },
          ],
        },
      ],
    },
  ],
  asksGithub: false,
};

// Next week; date and room still to be set. The programme follows the
// planning doc and is marked as a draft.
const beyondChatgpt: EventPage = {
  display: "Beyond ChatGPT",
  summaryEn:
    "Got something to make but not sure where to start? See how far AI can take it.",
  free: false,
  facts: [
    {
      icon: "clock",
      label: { zh: "时长", en: "Length" },
      value: { zh: "约 3 小时", en: "About 3 hours" },
    },
    {
      icon: "people",
      label: { zh: "适合", en: "For" },
      value: { zh: "对 AI 好奇的人", en: "Anyone curious about AI" },
      note: { zh: "经验不多也行", en: "Little experience is fine" },
    },
  ],
  highlights: [
    { zh: "动手", en: "Hands-on" },
    { zh: "约 3 小时", en: "About 3 hours" },
  ],
  hosts: {
    zh: "主办 BuilderSpace（UNSW）",
    en: "Hosted by BuilderSpace (UNSW)",
  },
  tbc: {
    heading: { zh: "下周见。", en: "See you next week." },
    short: { zh: "下周", en: "Next week" },
    when: { zh: "下周", en: "Next week" },
    whenNote: { zh: "具体时间规划中", en: "Exact time TBC" },
    where: { zh: "待定", en: "TBC" },
    status: [
      {
        done: true,
        label: { zh: "内容", en: "Content" },
        value: { zh: "讲义和四个 Demo", en: "Slides and four demos" },
      },
      {
        done: false,
        label: { zh: "日期", en: "Date" },
        value: { zh: "下周，待定", en: "Next week, TBC" },
      },
      {
        done: false,
        label: { zh: "地点", en: "Room" },
        value: { zh: "待定", en: "TBC" },
      },
      {
        done: false,
        label: { zh: "报名", en: "Sign-up" },
        value: { zh: "日期定了就开", en: "Opens with the date" },
      },
    ],
  },
  pointsHeading: { zh: "你会做什么", en: "What you'll do" },
  points: [
    {
      icon: "play",
      title: { zh: "看真实 Demo", en: "Real demos" },
      sub: {
        zh: "GitHub、Vercel、Gmail、定时任务，现场跑通",
        en: "GitHub, Vercel, Gmail and a daily job, run live",
      },
    },
    {
      icon: "people",
      title: { zh: "分组动手", en: "Build in teams" },
      sub: {
        zh: "每组一个能跑的环境，完成一个小挑战",
        en: "Each team gets a working setup and one challenge",
      },
    },
    {
      icon: "box",
      title: { zh: "带走成果", en: "Leave with proof" },
      sub: {
        zh: "截图、链接，或一个能复用的 Skill",
        en: "A screenshot, a link or a reusable Skill",
      },
    },
  ],
  sections: [
    {
      kind: "terms",
      heading: { zh: "概念", en: "Concepts" },
      items: [
        {
          term: "Agent",
          sub: {
            zh: "围绕目标规划、调工具、看结果，再接着做",
            en: "Plans toward a goal, calls tools, checks, keeps going",
          },
        },
        {
          term: "Harness",
          sub: {
            zh: "替 Agent 管上下文、文件、命令和权限",
            en: "Runs the context, files, commands and permissions",
          },
        },
        {
          term: "MCP",
          sub: {
            zh: "把外部数据和工具接进来",
            en: "Plugs in outside data and tools",
          },
        },
        {
          term: "Skill",
          sub: {
            zh: "把一次做成的方法，写成下次能复用的说明",
            en: "Turns a method that worked into one you can reuse",
          },
        },
        {
          term: "Plugin",
          sub: {
            zh: "把一组能力打包、分发、启用",
            en: "Packs a set of abilities to share and switch on",
          },
        },
      ],
    },
    {
      kind: "cards",
      heading: { zh: "分组", en: "Teams" },
      cols: 4,
      items: [
        {
          mark: "A",
          label: "Agent",
          title: { zh: "让 AI 改一个网站", en: "Have AI edit a website" },
          sub: {
            zh: "说清要改哪里，看它自己动手",
            en: "Say what to change, watch it work",
          },
        },
        {
          mark: "B",
          label: "MCP",
          title: {
            zh: "让 AI 查 GitHub 和网站",
            en: "Have AI check GitHub and the site",
          },
          sub: {
            zh: "它读真数据，你来定先做什么",
            en: "It reads real data, you pick what's first",
          },
        },
        {
          mark: "C",
          label: "Skill",
          title: { zh: "教 AI 一套做法", en: "Teach AI a routine" },
          sub: {
            zh: "写一次说明，下次直接用",
            en: "Write it down once, reuse it",
          },
        },
        {
          mark: "D",
          label: "Automation",
          title: { zh: "让 AI 定期帮你找活动", en: "Have AI look for events" },
          sub: {
            zh: "比如每周搜一次悉尼的 AI 比赛",
            en: "Say, Sydney AI hackathons every week",
          },
        },
      ],
    },
    {
      kind: "flow",
      heading: { zh: "流程", en: "Flow" },
      steps: [
        { label: { zh: "开场", en: "Intro" }, minutes: 10 },
        { label: { zh: "概念", en: "Concepts" }, minutes: 15 },
        { label: { zh: "四个 Demo", en: "4 demos" }, minutes: 30 },
        { label: { zh: "分组", en: "Teams" }, minutes: 15 },
        {
          label: { zh: "挑战 · 一轮", en: "Round 1" },
          minutes: 45,
          hands: true,
        },
        { label: { zh: "休息", en: "Break" }, minutes: 10, rest: true },
        {
          label: { zh: "挑战 · 二轮", en: "Round 2" },
          minutes: 30,
          hands: true,
        },
        { label: { zh: "展示", en: "Show" }, minutes: 20 },
        { label: { zh: "收尾", en: "Wrap" }, minutes: 5 },
      ],
    },
  ],
  bring: [
    { icon: "laptop", label: { zh: "电脑和充电器", en: "Laptop and charger" } },
    {
      icon: "sparkle",
      label: {
        zh: "一个想做的东西（没有也行）",
        en: "Something you want to make (optional)",
      },
    },
  ],
  asksGithub: false,
};

// A build party for Josh Whitkin's robotic installation. Josh says mid-
// November; whether the build is paid, later paid roles and the engineer's
// name aren't settled, so they stay off the page.
const theCollectors: EventPage = {
  display: "Build The Collectors.",
  summaryEn:
    "Assemble the robots of an art installation with robotic artist Josh Whitkin.",
  free: false,
  seatsNote: { zh: "两场，每场 10 人", en: "Two parties of 10" },
  facts: [
    {
      icon: "clock",
      label: { zh: "投入", en: "Time" },
      value: { zh: "两天 × 7 小时", en: "2 days × 7 hours" },
      note: { zh: "一场两天，两天都来", en: "Each party runs two days" },
    },
  ],
  highlights: [
    { zh: "Build Party", en: "Build party" },
    { zh: "零基础可", en: "No experience needed" },
  ],
  hosts: {
    zh: "主办 BuilderSpace（UNSW）· 嘉宾 Dr Josh Whitkin",
    en: "Hosted by BuilderSpace (UNSW) with Dr Josh Whitkin",
  },
  tbc: {
    short: { zh: "11 月中", en: "Mid-Nov" },
    when: { zh: "11 月中旬", en: "Mid-November" },
    whenNote: { zh: "暂定，具体日期待定", en: "Tentative; dates TBC" },
    status: [
      {
        done: true,
        label: { zh: "地点", en: "Place" },
        value: { zh: "UNSW Makerspace", en: "UNSW Makerspace" },
      },
      {
        done: true,
        label: { zh: "带队", en: "Lead" },
        value: { zh: "Dr Josh Whitkin", en: "Dr Josh Whitkin" },
      },
      {
        done: false,
        label: { zh: "日期", en: "Dates" },
        value: { zh: "11 月中旬，待定", en: "Mid-Nov, TBC" },
      },
      {
        done: false,
        label: { zh: "报名", en: "Sign-up" },
        value: { zh: "日期定了就在这里开", en: "Opens here with the dates" },
      },
    ],
  },
  sections: [
    {
      kind: "collector",
      heading: { zh: "要造什么", en: "What we're building" },
      fleet: [
        {
          count: 6,
          spare: 2,
          label: { zh: "台 Collector 机器人", en: "Collector robots" },
          sub: { zh: "6 台上场，2 台备用", en: "6 running, 2 spare" },
        },
        {
          count: 6,
          label: { zh: "台房间摄像头", en: "Room cameras" },
          sub: { zh: "装在展厅四周", en: "Around the room" },
        },
        {
          count: 5,
          spare: 2,
          label: { zh: "个手持信标", en: "Handheld beacons" },
          sub: { zh: "看时间决定", en: "If time allows" },
        },
      ],
      layers: [
        {
          label: { zh: "外皮", en: "Skin" },
          title: { zh: "羊毛毡", en: "Felted wool" },
        },
        {
          label: { zh: "身体", en: "Body" },
          title: {
            zh: "骨骼、关节、舵机、LED、羽毛",
            en: "Bones, hinges, servos, LEDs, feathers",
          },
          sub: {
            zh: "每台 4 个舵机：3 个关节，1 朵花",
            en: "Four servos each: three hinges, one flower",
          },
        },
        {
          label: { zh: "底座", en: "Base" },
          title: {
            zh: "泡沫板、控制器、电源、线材",
            en: "Foamcore, controller, power, wiring",
          },
        },
      ],
    },
    {
      kind: "cards",
      heading: { zh: "会用到的技术", en: "What you'll handle" },
      cols: 3,
      items: [
        {
          label: "Servo",
          title: { zh: "Feetech 舵机", en: "Feetech servos" },
          sub: {
            zh: "编号、对中，装进关节",
            en: "Set IDs, centre, fit in hinges",
          },
        },
        {
          label: "Print",
          title: { zh: "3D 打印零件", en: "3D-printed parts" },
          sub: {
            zh: "骨骼和关节，打孔、上螺丝",
            en: "Bones and hinges; drill, screw",
          },
        },
        {
          label: "Light",
          title: { zh: "LED 灯带", en: "LED strips" },
          sub: {
            zh: "走 12 V 线束，接进控制盒",
            en: "12 V harness into the controller",
          },
        },
        {
          label: "Tracking",
          title: { zh: "红外动作捕捉", en: "Infrared motion capture" },
          sub: { zh: "整套装置的追踪部分", en: "The installation's tracking" },
        },
        {
          label: "Camera",
          title: { zh: "摄像头", en: "Cameras" },
          sub: {
            zh: "房间里的和机器人鼻子上的",
            en: "In the room and on each nose",
          },
        },
        {
          label: "Beacon",
          title: { zh: "手持信标", en: "Handheld beacons" },
          sub: { zh: "看时间决定做不做", en: "Built if time allows" },
          maybe: true,
        },
      ],
    },
    {
      kind: "steps",
      heading: { zh: "搭建流程", en: "Build steps" },
      legend: {
        robot: { zh: "装一台机器人", en: "One robot" },
        room: { zh: "装房间里的部分", en: "The room around it" },
      },
      steps: [
        {
          title: { zh: "打印骨骼和关节", en: "Print bones and hinges" },
          sub: { zh: "PLA / ABS / PETG", en: "PLA, ABS or PETG" },
        },
        {
          title: { zh: "舵机编号、对中", en: "Set up the servos" },
          sub: { zh: "编号、画中线、贴标签", en: "ID, centre mark, label" },
        },
        {
          title: { zh: "装关节", en: "Build the hinges" },
          sub: { zh: "一个关节一个舵机", en: "One servo per hinge" },
        },
        {
          title: { zh: "身体：骨骼 + 关节", en: "Body: bones + hinges" },
          sub: { zh: "一节一节装上立柱", en: "Stack them up the column" },
        },
        {
          title: { zh: "装花", en: "The flower" },
          sub: { zh: "顶上第四个舵机", en: "The fourth servo, on top" },
        },
        {
          title: { zh: "控制盒与接线", en: "Controller and wiring" },
          sub: { zh: "电源、主控、走线", en: "Power, controller, cables" },
        },
        {
          title: { zh: "LED 灯带", en: "LED strips" },
          sub: { zh: "接 12 V 线束", en: "On a 12 V harness" },
        },
        {
          title: { zh: "整台测试", en: "Test the Collector" },
          sub: { zh: "每个关节动一遍", en: "Run every joint" },
        },
        {
          title: { zh: "底座", en: "The base" },
          sub: { zh: "泡沫板底座", en: "Foamcore base" },
        },
        {
          title: { zh: "房间摄像头", en: "Room cameras" },
          sub: { zh: "装在房间里", en: "Mounted around the room" },
          room: true,
        },
        {
          title: { zh: "鼻子摄像头", en: "Nose camera" },
          sub: { zh: "装在机器人上", en: "On the robot" },
          room: true,
        },
        {
          title: { zh: "手持信标", en: "Handheld beacons" },
          sub: { zh: "看时间决定做不做", en: "If time allows" },
          room: true,
        },
      ],
    },
    {
      kind: "bar",
      heading: { zh: "门槛", en: "Who can come" },
      quote: [
        { zh: "会拼 IKEA 家具，", en: "If you can build" },
        { zh: "玩过 Lego Technic，", en: "IKEA furniture or Lego Technic," },
        { zh: "就够了。", en: "you can build this." },
      ],
      sub: {
        zh: "不用会写代码，也不用懂电子。",
        en: "No coding or electronics needed.",
      },
      help: [
        {
          icon: "wrench",
          title: {
            zh: "工具和说明都备好",
            en: "Tools and instructions provided",
          },
          sub: {
            zh: "每一步都有图解手册",
            en: "Every step has an illustrated guide",
          },
        },
        {
          icon: "people",
          title: { zh: "艺术家本人带", en: "Led by the artist" },
          sub: {
            zh: "Dr Josh Whitkin 全程指导",
            en: "Dr Josh Whitkin guides the build",
          },
        },
        {
          icon: "sparkle",
          title: { zh: "机电工程师协助", en: "A mechatronics engineer" },
          sub: {
            zh: "计划另请一位，人选待定",
            en: "Planned; not yet confirmed",
          },
          tbc: true,
        },
      ],
    },
    {
      kind: "guest",
      heading: { zh: "嘉宾", en: "Guest" },
      who: {
        initial: "J",
        name: "Dr Josh Whitkin",
        role: {
          zh: "机器人艺术家 · 交互设计博士",
          en: "Robotic artist · PhD in interaction design",
        },
      },
      items: [
        {
          mark: "30y",
          title: {
            zh: "数字艺术、游戏、产品设计",
            en: "Digital art, games, product design",
          },
        },
        {
          mark: "50+",
          title: {
            zh: "商业游戏与数字产品",
            en: "Commercial games and products",
          },
          sub: {
            zh: "Hasbro · NVIDIA · EA · Sony · Autodesk",
            en: "Hasbro · NVIDIA · EA · Sony · Autodesk",
          },
        },
        {
          mark: "Work",
          title: { zh: "The Algorithm", en: "The Algorithm" },
          sub: {
            zh: "互动装置：观众用推杆和算法较劲",
            en: "An installation where people fight the feed with sliders",
          },
        },
      ],
      link: {
        href: "https://thealgorithmartwork.com/",
        label: { zh: "看 The Algorithm", en: "See The Algorithm" },
      },
    },
  ],
  asksGithub: false,
};

const PAGES: Record<string, EventPage> = {
  "put-yourself-online": putYourselfOnline,
  "ai-study-career-talk": aiStudyCareerTalk,
  "beyond-chatgpt": beyondChatgpt,
  "the-collectors": theCollectors,
};

export function getEventPage(slug: string): EventPage | null {
  return PAGES[slug] ?? null;
}

/** For a TBC event without its own wording, or once its placeholder passed. */
const PLAIN_TBC: EventTbc = {
  short: { zh: "待定", en: "TBC" },
  when: { zh: "待定", en: "TBC" },
  whenNote: { zh: "日期定了就公布", en: "Date to be announced" },
  status: [],
};

/**
 * The "TBC" wording while the date isn't set: the page's own, until the
 * placeholder date passes (it may say "下周"), then the plain one.
 */
export function eventTbc(event: SiteEvent): EventTbc | null {
  if (!event.dateTbc) return null;
  const own = PAGES[event.slug]?.tbc;
  if (!own) return PLAIN_TBC;
  return event.tbcLapsed ? { ...PLAIN_TBC, where: own.where } : own;
}

/**
 * Where the event is, in both languages: the row's location, or the page's
 * stand-in while the event is still being placed.
 */
export function eventWhere(event: SiteEvent): Bi {
  const tbc = event.dateTbc ? PAGES[event.slug]?.tbc?.where : undefined;
  return tbc ?? { zh: event.location, en: event.location };
}

/**
 * An event's title and summary in both languages. English comes from the
 * event page; an event without one shows its Chinese row in both.
 */
export function eventCopy(event: {
  slug: string;
  title: string;
  summary: string | null;
}) {
  const page = PAGES[event.slug];
  return {
    title: { zh: event.title, en: page?.display ?? event.title },
    summary:
      event.summary === null
        ? null
        : { zh: event.summary, en: page?.summaryEn ?? event.summary },
  };
}
