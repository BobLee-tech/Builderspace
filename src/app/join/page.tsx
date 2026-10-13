import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
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
              v: { zh: "UNSW 本科 / 硕士", en: "UNSW students" },
            },
            {
              k: { zh: "我们不收", en: "Never asked" },
              v: { zh: "zID · 学生证", en: "zID · student card" },
            },
            {
              k: { zh: "你的数据", en: "Your data" },
              v: { zh: "可随时删除", en: "Deleted on request" },
            },
          ]}
        />
        <JoinForm
          adminQr={
            process.env.NEXT_PUBLIC_ADMIN_WECHAT_QR || "/admin-wechat-qr.jpg"
          }
        />
      </div>
    </section>
  );
}
