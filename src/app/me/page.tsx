import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHead } from "@/components/page-head";
import { T } from "@/components/t";
import { getSession, surveyDone } from "@/lib/auth";
import {
  isUnsw,
  LOOKING_LABEL,
  MEMBER_SKILL_LABEL,
  memberCode,
  ordinal,
  sealLabel,
  SPARK_INFO,
  type Member,
} from "@/lib/members";
import { logOut } from "./actions";
import { MeCard } from "./me-card";
import { SurveyForm } from "./survey-form";
import "../members.css";

export const metadata: Metadata = {
  title: "我的卡片",
  robots: { index: false },
};

export default function MePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  return (
    <section className="sec first">
      <div className="wrap">
        <Suspense fallback={<div className="join-wait" aria-busy />}>
          <Me searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Me({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await getSession();
  if (!session?.member) redirect("/join");
  const m = session.member;
  const [{ welcome }, done] = await Promise.all([searchParams, surveyDone()]);
  const spark = SPARK_INFO[m.spark];
  const adminQr =
    process.env.NEXT_PUBLIC_ADMIN_WECHAT_QR || "/admin-wechat-qr.jpg";

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

      {welcome && (
        <div className="me-welcome hud">
          <p className="mono mute">Welcome to BuilderSpace</p>
          <h2 className="me-welcome-line">
            {m.nickname}, you are the{" "}
            <b>
              {m.memberNo}
              <sup>{ordinal(m.memberNo)}</sup> Builder!
            </b>
          </h2>
          <p className="mute">
            <T
              zh={`你是第 ${m.memberNo} 位 Builder。最后一步：扫码加管理员微信，备注「BuilderSpace + ${m.nickname}」，拉你进群。`}
              en={`You're Builder No. ${m.memberNo}. Last step: scan to add the admin on WeChat with the note "BuilderSpace + ${m.nickname}" and you'll be added to the group.`}
            />
          </p>
          <div className="me-qr">
            {/* eslint-disable-next-line @next/next/no-img-element -- ops-supplied QR, any host */}
            <img src={adminQr} alt="Admin WeChat QR / 管理员微信二维码" />
          </div>
        </div>
      )}

      <div className="join2 me-grid">
        <MeCard
          card={{
            nickname: m.nickname,
            schoolDegree: m.schoolDegree,
            major: m.major,
            skills: m.skills,
            spark: m.spark,
            memberNo: m.memberNo,
            seal: m.verified ? sealLabel(m.schoolDomain) : null,
            building: m.building,
            lookingFor: m.lookingFor,
          }}
        />
        <div className="me-side">
          <Details m={m} />
          {!done && <SurveyForm />}
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

function Details({ m }: { m: Member }) {
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
    [<T key="k" zh="登录邮箱" en="Email" />, m.email],
    [
      <T key="k" zh="认证" en="Verified" />,
      m.verified ? (
        <span className="ok-text">
          ✓ {isUnsw(m.schoolDomain) ? "UNSW" : m.schoolDomain}
        </span>
      ) : (
        <T
          zh="未认证 · 用学校邮箱登录的成员是认证成员"
          en="Not verified · members who sign in with a school email are verified"
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
        <T
          zh="卡片工坊（换材质、贴贴纸）和拼图徽章下一步上线。"
          en="The card studio (materials, stickers) and puzzle badges come next."
        />
      </p>
    </div>
  );
}
