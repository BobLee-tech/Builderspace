import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Arr } from "@/components/fx/arr";
import { SpecRow } from "@/components/spec-row";
import { T } from "@/components/t";
import { getCardDesign, getSession } from "@/lib/auth";
import { cardViewOf } from "@/lib/members";
import { ProjectForm } from "./project-form";
import "../../members.css";

export const metadata: Metadata = { title: "提交项目卡" };

export default function NewProjectPage() {
  return (
    <section className="sec first">
      <div className="wrap">
        <Link href="/projects" className="crumb mono">
          ← <T zh="项目广场" en="Projects" />
        </Link>
        <h1 className="display page-title" style={{ margin: "32px 0 16px" }}>
          <span className="line">
            <span>Pitch it.</span>
          </span>
        </h1>
        <SpecRow
          items={[
            {
              k: { zh: "写清", en: "Describe" },
              v: {
                zh: "一句话介绍 · 目标用户 · 缺的角色",
                en: "One-line pitch · users · roles needed",
              },
            },
            {
              k: { zh: "代码", en: "Code" },
              v: { zh: "还没写也可以", en: "Not needed yet" },
            },
            {
              k: { zh: "公开", en: "Goes live" },
              v: { zh: "人工审核后", en: "After review" },
            },
            {
              k: { zh: "归属", en: "Ownership" },
              v: { zh: "项目归你和队友", en: "Yours and your team's" },
            },
          ]}
        />
        <Suspense fallback={<div className="join-wait" aria-busy />}>
          <SignedInForm />
        </Suspense>
      </div>
    </section>
  );
}

/** Members submit as the owner, with their card on the preview; others join first. */
async function SignedInForm() {
  const session = await getSession();
  const m = session?.member;
  if (!m) return <JoinFirst />;
  const design = await getCardDesign();
  return (
    <ProjectForm
      submitter={{
        owner: { card: cardViewOf(m), design },
        showsCard: m.cardOnProjects,
      }}
    />
  );
}

/** Every project carries its owner's member card, so submitting starts with joining. */
function JoinFirst() {
  return (
    <div className="box join-first">
      <p className="mono mute">
        <T zh="先加入 / Join first" en="Join first" />
      </p>
      <h2 className="h2">
        <T
          zh="项目卡会挂上你的成员卡。"
          en="Your project carries your member card."
        />
      </h2>
      <p className="mute">
        <T
          zh="加入大约 1 分钟：邮箱收验证码，填昵称和专业，选一只拼块伙伴。完成后会回到这里继续提交。已经是成员的，用同一个邮箱登录。"
          en="Joining takes about a minute: a code by email, your nickname and major, and a Spark. You come straight back here afterwards. Already a member? Sign in with the same email."
        />
      </p>
      <Link href="/join?next=/projects/new" className="btn solid">
        <T zh="加入或登录" en="Join or sign in" /> <Arr />
      </Link>
    </div>
  );
}
