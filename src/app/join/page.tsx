import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHead } from "@/components/page-head";
import { SpecRow } from "@/components/spec-row";
import { getSession } from "@/lib/auth";
import { JoinFlow } from "./join-flow";
import "../members.css";

export const metadata: Metadata = { title: "加入" };

export default function JoinPage() {
  return (
    <section className="sec first">
      <div className="wrap">
        <PageHead
          path="join"
          eyebrow={{
            zh: "加入 / Join · 约 1 分钟",
            en: "Join · about a minute",
          }}
          title={["Start", "here."]}
          aside={[
            {
              k: { zh: "谁可以加入", en: "Who can join" },
              v: {
                zh: "所有人，推荐学校邮箱",
                en: "Anyone, school email best",
              },
            },
            {
              k: { zh: "费用", en: "Cost" },
              v: { zh: "免费", en: "Free" },
            },
            {
              k: { zh: "登录方式", en: "Sign-in" },
              v: { zh: "邮箱 6 位验证码", en: "6-digit email code" },
            },
          ]}
        />
        <SpecRow
          items={[
            {
              k: { zh: "加入即注册", en: "Join = sign up" },
              v: {
                zh: "领一张成员卡，按加入顺序编号",
                en: "Your own member card, numbered in join order",
              },
            },
            {
              k: { zh: "门槛", en: "Experience" },
              v: { zh: "零基础也行", en: "None needed" },
            },
            {
              k: { zh: "隐私", en: "Privacy" },
              v: {
                zh: "不收学生证 · zID 自愿 · 随时可删",
                en: "No student card · zID opt-in · delete anytime",
              },
            },
          ]}
        />
        <Suspense fallback={<div className="join-wait" aria-busy />}>
          <JoinGate />
        </Suspense>
      </div>
    </section>
  );
}

/** Members who already have a card go straight to it. */
async function JoinGate() {
  const session = await getSession();
  if (session?.member) redirect("/me");
  return <JoinFlow signedInEmail={session?.email ?? null} />;
}
