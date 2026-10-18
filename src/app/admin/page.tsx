import type { Metadata } from "next";
import { SpecRow } from "@/components/spec-row";
import { T } from "@/components/t";
import { AdminForm } from "./admin-form";

export const metadata: Metadata = {
  title: "评论管理",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <section className="sec first">
      <div className="wrap admin-wrap">
        <p className="eyebrow mono">
          <T zh="评论管理 / Admin" en="Comment admin" />
        </p>
        <h1 className="h2">
          <T zh="管理员登录" en="Admin sign-in" />
        </h1>
        <SpecRow
          items={[
            {
              k: { zh: "作用", en: "What it does" },
              v: {
                zh: "这个浏览器里，每条评论旁出现「删除」",
                en: "A Delete button on every comment, in this browser",
              },
            },
            {
              k: { zh: "有效期", en: "Lasts" },
              v: { zh: "30 天", en: "30 days" },
            },
            {
              k: { zh: "公用电脑", en: "Shared computer" },
              v: { zh: "用完请退出", en: "Sign out when done" },
            },
          ]}
        />
        <AdminForm />
      </div>
    </section>
  );
}
