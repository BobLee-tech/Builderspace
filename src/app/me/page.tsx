import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Arr } from "@/components/fx/arr";
import { PageHead } from "@/components/page-head";
import { T } from "@/components/t";
import {
  getCardDesign,
  getMyStars,
  getMyZid,
  getSession,
  surveyDone,
} from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { siteUrl } from "@/lib/site-url";
import {
  cardViewOf,
  isUnsw,
  LOOKING_LABEL,
  MEMBER_SKILL_LABEL,
  memberCode,
  mentionsUnsw,
  ordinal,
  SPARK_INFO,
  type Member,
} from "@/lib/members";
import type { StarredProject } from "@/lib/types";
import { logOut, toggleCardOnProjects, togglePublicCard } from "./actions";
import { CopyLink } from "./copy-link";
import { EmailChange } from "./email-change";
import { MeCard } from "./me-card";
import { SurveyForm } from "./survey-form";
import { ZidForm } from "./zid-form";
import "../members.css";

export const metadata: Metadata = {
  title: "我的卡片",
  robots: { index: false },
};

export default function MePage() {
  return (
    <section className="sec first">
      <div className="wrap">
        <Suspense fallback={<div className="join-wait" aria-busy />}>
          <Me />
        </Suspense>
      </div>
    </section>
  );
}

async function Me() {
  const session = await getSession();
  if (!session?.member) redirect("/join");
  const m = session.member;
  const [done, design, zid, stars] = await Promise.all([
    surveyDone(),
    getCardDesign(),
    getMyZid(),
    getMyStars(),
  ]);
  const spark = SPARK_INFO[m.spark];
  // Joined before the zID was asked for: a UNSW email, or a school that says
  // UNSW under some other email (a hint only, so that one says "skip if not").
  const unswEmail = isUnsw(m.schoolDomain);
  const askZid =
    !zid && (unswEmail || (!m.schoolDomain && mentionsUnsw(m.schoolDegree)));

  return (
    <>
      <PageHead
        path="me"
        eyebrow={{ zh: "我的卡片 / My card", en: "My card" }}
        title={[`${m.nickname}’s`, "card."]}
        aside={[
          {
            k: { zh: "编号", en: "Number" },
            v: { zh: memberCode(m.memberNo), en: memberCode(m.memberNo) },
          },
          {
            k: { zh: "拼块", en: "Piece" },
            v: {
              zh: `${spark.name} · ${spark.role.zh}`,
              en: `${spark.name} · ${spark.role.en}`,
            },
          },
          {
            k: { zh: "身份", en: "Status" },
            v: m.verified
              ? { zh: "认证成员", en: "Verified member" }
              : { zh: "成员", en: "Member" },
          },
        ]}
      />

      <div className="join2 me-grid">
        <MeCard card={cardViewOf(m)} design={design} />
        <div className="me-side">
          <div className="row-actions">
            <Link href="/me/card" className="btn solid">
              <T zh="定制卡片" en="Customise your card" /> <Arr />
            </Link>
            <Link href="/welcome" className="btn ghost">
              <T zh="重看欢迎 · 加群二维码" en="Welcome again · group QR" />
            </Link>
          </div>
          <Details m={m} zid={zid} />
          <section className="me-settings" aria-label="设置 / Settings">
            <PublicCard on={m.isPublic} handle={m.handle} />
            <CardOnProjects on={m.cardOnProjects} />
            <EmailChange email={m.email} verified={m.verified} />
          </section>
          <MyStars stars={stars} />
          {askZid && <ZidForm unswEmail={unswEmail} />}
          {!done && <SurveyForm zid={zid} />}
          <form action={logOut}>
            <button type="submit" className="linkish">
              <T zh="退出登录" en="Sign out" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function Details({ m, zid }: { m: Member; zid: string | null }) {
  const spark = SPARK_INFO[m.spark];
  const rows: [React.ReactNode, React.ReactNode][] = [
    [
      <T key="k" zh="编号" en="Number" />,
      `${memberCode(m.memberNo)} · ${m.memberNo}${ordinal(m.memberNo)} Builder`,
    ],
    [
      <T key="k" zh="拼块" en="Piece" />,
      <>
        {spark.name} · {spark.zh} · <T {...spark.role} />
      </>,
    ],
    [<T key="k" zh="学校与学位" en="University" />, m.schoolDegree || "—"],
    [<T key="k" zh="专业" en="Major" />, m.major || "—"],
    [
      <T key="k" zh="技能" en="Skills" />,
      m.skills.length
        ? m.skills.map((s, i) => (
            <span key={s}>
              {i > 0 && "、"}
              <T {...MEMBER_SKILL_LABEL[s]} />
            </span>
          ))
        : "—",
    ],
    [<T key="k" zh="正在做" en="Building" />, m.building || "—"],
    [
      <T key="k" zh="在找" en="Looking for" />,
      m.lookingFor.length
        ? m.lookingFor.map((k, i) => (
            <span key={k}>
              {i > 0 && "、"}
              <T {...LOOKING_LABEL[k]} />
            </span>
          ))
        : "—",
    ],
    ...(zid
      ? [
          [
            <span key="k" style={{ textTransform: "none" }}>
              zID
            </span>,
            zid,
          ] as [React.ReactNode, React.ReactNode],
        ]
      : []),
    [
      <T key="k" zh="认证" en="Verified" />,
      m.verified ? (
        <span className="ok-text">
          ✓ {isUnsw(m.schoolDomain) ? "UNSW" : m.schoolDomain}
        </span>
      ) : (
        <T
          zh="未认证 · 换成学校邮箱就能认证"
          en="Not verified · switch to a school email to verify"
        />
      ),
    ],
  ];
  return (
    <div className="hud me-details">
      <dl>
        {rows.map(([k, v], i) => (
          <div key={i}>
            <dt className="mono mute">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mute small">
        <T zh="拼图徽章下一步上线。" en="Puzzle badges come next." />
      </p>
    </div>
  );
}

/** Your card at /m/<handle> and on the wall in /people, unless you turn it off. */
function PublicCard({ on, handle }: { on: boolean; handle: string }) {
  const path = `/m/${handle}`;
  return (
    <form action={togglePublicCard} className="me-set me-set-row">
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <div>
        <b>
          <T zh="公开我的卡片" en="Make my card public" />
        </b>
        <p className="mute small">
          {on ? (
            <CopyLink path={path} label={`${new URL(siteUrl).host}${path}`} />
          ) : (
            <T zh="关着：只有你能看到" en="Off: only you can see it" />
          )}
        </p>
      </div>
      <button
        type="submit"
        role="switch"
        aria-checked={on}
        className="switch"
        aria-label="公开我的卡片 / Make my card public"
      />
    </form>
  );
}

/** Projects you own show your card unless you turn it off here. */
function CardOnProjects({ on }: { on: boolean }) {
  return (
    <form action={toggleCardOnProjects} className="me-set me-set-row">
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <div>
        <b>
          <T zh="在项目页展示我的卡片" en="Show my card on my projects" />
        </b>
        <p className="mute small">
          {on ? (
            <T
              zh="只印卡面内容，不含邮箱"
              en="Only what the card prints, never your email"
            />
          ) : (
            <T
              zh="关着：项目页只显示昵称"
              en="Off: projects show your nickname only"
            />
          )}
        </p>
      </div>
      <button
        type="submit"
        role="switch"
        aria-checked={on}
        className="switch"
        aria-label="在项目页展示我的卡片 / Show my card on my projects"
      />
    </form>
  );
}

/** Projects this member starred, newest star first. */
function MyStars({ stars }: { stars: StarredProject[] }) {
  return (
    <section className="hud me-details me-stars">
      <h2 className="mono mute">
        <T zh="我 Star 的项目" en="Projects I starred" />
      </h2>
      {stars.length === 0 ? (
        <p className="mute small">
          <T
            zh="在项目页点 Star，会收在这里。"
            en="Star a project on its page and it shows up here."
          />{" "}
          <Link href="/projects" className="linkish">
            <T zh="去项目广场" en="Browse projects" /> →
          </Link>
        </p>
      ) : (
        <ul>
          {stars.map((s) => (
            <li key={s.slug}>
              <Link href={`/projects/${s.slug}`}>{s.name}</Link>
              <span className="mono mute">
                {s.ownerName} · {formatShortDate(s.starredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
