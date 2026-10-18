import type { Metadata } from "next";
import Link from "next/link";
import { SpecRow } from "@/components/spec-row";
import { ProjectForm } from "./project-form";
import { T } from "@/components/t";

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
                zh: "问题 · 目标用户 · 缺的角色",
                en: "Problem · users · roles needed",
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
        <ProjectForm />
      </div>
    </section>
  );
}
