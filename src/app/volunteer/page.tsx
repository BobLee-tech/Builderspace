import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
import { T } from "@/components/t";
import { DEPARTMENTS, VOLUNTEER_POSITIONS } from "@/lib/types";
import { VolunteerForm } from "./volunteer-form";

export const metadata: Metadata = { title: "志愿者申请" };

export default function VolunteerPage() {
  return (
    <section className="sec first">
      <div className="wrap">
        <PageHead
          path="volunteer"
          eyebrow={{
            zh: "志愿者 / Volunteer · 约 2 分钟",
            en: "Volunteer · about two minutes",
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
              v: { zh: "志愿参与", en: "Volunteer" },
            },
          ]}
        />
        <p className="lede" style={{ marginBottom: 32 }}>
          <T
            zh="志愿参与，没有工资，可以提供参与证明。没有相关经验也可以申请；可以只选一个职位，也可以跨几个。我们不收学生证和 zID，邮箱只用来联系你和开通内部协作系统的账号。"
            en="Volunteer and unpaid; a certificate of participation is available. No experience needed. Pick one position or several. We never ask for your student card or zID, and your email is only used to reach you and to open your account on our internal workspace."
          />
        </p>
        <VolunteerForm />
      </div>
    </section>
  );
}
