import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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

/** A signed-in member submits as the owner, with their card on the preview. */
async function SignedInForm() {
  const session = await getSession();
  const m = session?.member;
  if (!m) return <ProjectForm submitter={null} />;
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
