import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
import { T } from "@/components/t";
import { JoinForm } from "./join-form";

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
              v: { zh: "所有 UNSW 学生", en: "Any UNSW student" },
            },
            {
              k: { zh: "费用", en: "Cost" },
              v: { zh: "免费", en: "Free" },
            },
            {
              k: { zh: "工作语言", en: "Languages" },
              v: { zh: "English + 中文", en: "English + 中文" },
            },
          ]}
        />
        <p className="lede" style={{ marginBottom: 32 }}>
          <T
            zh="零基础也行。我们不收学生证；zID 只在你自愿登记支持社团申请时填写。你的数据可随时要求删除。"
            en="Beginners welcome. We never ask for your student card, and your zID only if you opt in to back our club application. Your data is deleted on request."
          />
        </p>
        <JoinForm
          adminQr={
            process.env.NEXT_PUBLIC_ADMIN_WECHAT_QR || "/admin-wechat-qr.jpg"
          }
        />
      </div>
    </section>
  );
}
