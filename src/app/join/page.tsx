import type { Metadata } from "next";
import { biText, pageMeta } from "@/lib/seo";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHead } from "@/components/page-head";
import { SpecRow } from "@/components/spec-row";
import { getSession } from "@/lib/auth";
import { localPath } from "@/lib/forms";
import { JoinFlow } from "./join-flow";
import "../members.css";

export const metadata: Metadata = pageMeta("/join", {
  title: "加入 Join",
  description: biText(
    "免费加入 BuilderSpace，约 1 分钟，领一张自己的成员卡。",
    "Join BuilderSpace free in about a minute and get your own member card.",
  ),
});

export default function JoinPage({ searchParams }: PageProps<"/join">) {
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
                zh: "不收学生证 · zID 只给社团后台看 · 随时可删",
                en: "No student card · zID seen only by admins · delete anytime",
              },
            },
          ]}
        />
        <Suspense fallback={<div className="join-wait" aria-busy />}>
          <JoinGate searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

/**
 * Members who already have a card go straight to it, or back where they came
 * from. `?mode=login` (and /login) opens on sign-in.
 */
async function JoinGate({
  searchParams,
}: {
  searchParams: PageProps<"/join">["searchParams"];
}) {
  const session = await getSession();
  const params = await searchParams;
  if (session?.member) redirect(localPath(params.next) ?? "/me");
  return (
    <JoinFlow
      signedInEmail={session?.email ?? null}
      mode={params.mode === "login" ? "login" : "join"}
    />
  );
}
