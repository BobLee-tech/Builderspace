import type { Metadata } from "next";
import Link from "next/link";
import { NAV_TRANSITION } from "@/components/nav-links";
import { PageTransition } from "@/components/page-transition";
import { ProjectForm } from "./project-form";
import { T } from "@/components/t";

export const metadata: Metadata = { title: "提交项目卡" };

export default function NewProjectPage() {
  return (
    <PageTransition>
      <section className="sec first">
        <div className="wrap">
          <Link
            transitionTypes={NAV_TRANSITION}
            href="/projects"
            className="crumb mono"
          >
            ← <T zh="项目广场" en="Projects" />
          </Link>
          <h1 className="display page-title" style={{ margin: "32px 0 16px" }}>
            <span className="line">
              <span>Pitch it.</span>
            </span>
          </h1>
          <p className="lede" style={{ marginBottom: 40 }}>
            <T
              zh="写清楚问题、目标用户和缺的角色。人工审核后公开，不需要已经写好代码。项目归你和队友所有。"
              en="Describe the problem, who it is for and the roles you need. It goes live after review, no code required. The project stays yours."
            />
          </p>
          <ProjectForm />
        </div>
      </section>
    </PageTransition>
  );
}
