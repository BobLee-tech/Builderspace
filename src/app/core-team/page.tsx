import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
import { SpecRow } from "@/components/spec-row";
import { DEPARTMENTS, VOLUNTEER_POSITIONS } from "@/lib/types";
import { VolunteerForm } from "./volunteer-form";

export const metadata: Metadata = { title: "核心成员申请" };

export default function VolunteerPage() {
  return (
    <section className="sec first">
      <div className="wrap">
        <PageHead
          path="core-team"
          eyebrow={{
            zh: "核心成员 / Core team · 约 2 分钟",
            en: "Core team · about two minutes",
          }}
          title={["Help us", "build."]}
          aside={[
            {
              k: { zh: "部门", en: "Departments" },
              v: {
                zh: `${DEPARTMENTS.length} 个`,
                en: `${DEPARTMENTS.length}`,
              },
            },
            {
              k: { zh: "职位", en: "Positions" },
              v: {
                zh: `${VOLUNTEER_POSITIONS.length} 个`,
                en: `${VOLUNTEER_POSITIONS.length}`,
              },
            },
            {
              k: { zh: "形式", en: "Format" },
              v: { zh: "无薪", en: "Unpaid" },
            },
          ]}
        />
        <SpecRow
          items={[
            {
              k: { zh: "报酬", en: "Pay" },
              v: {
                zh: "无工资 · 可开参与证明",
                en: "Unpaid · certificate available",
              },
            },
            {
              k: { zh: "经验", en: "Experience" },
              v: {
                zh: "不要求 · 职位可多选",
                en: "Not required · one role or several",
              },
            },
            {
              k: { zh: "隐私", en: "Privacy" },
              v: {
                zh: "不收学生证和 zID · 邮箱只用于联系和开通内部账号",
                en: "No student card or zID · email only to reach you and set up your workspace account",
              },
            },
          ]}
        />
        <VolunteerForm />
      </div>
    </section>
  );
}
