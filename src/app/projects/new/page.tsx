import type { Metadata } from "next";
import Link from "next/link";
import { ProjectForm } from "./project-form";

export const metadata: Metadata = { title: "提交项目卡" };

export default function NewProjectPage() {
  return (
    <section className="sec first">
      <div className="wrap">
        <Link href="/projects" className="crumb mono">
          ← 项目广场
        </Link>
        <h1 className="display page-title" style={{ margin: "32px 0 16px" }}>
          <span className="line">
            <span>Pitch it.</span>
          </span>
        </h1>
        <p className="lede" style={{ marginBottom: 40 }}>
          写清楚问题、目标用户和缺的角色。人工审核后公开在项目广场；不需要已经写好代码。
        </p>
        <ProjectForm />
      </div>
    </section>
  );
}
