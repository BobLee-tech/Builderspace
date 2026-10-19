import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
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
        <VolunteerForm />
      </div>
    </section>
  );
}
