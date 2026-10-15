import type { Metadata } from "next";
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
        <p className="lede">
          <T
            zh="输入管理员口令后，这个浏览器打开任意项目页，讨论区里每条评论旁都会出现「删除」。口令 30 天内有效，在公用电脑上用完请退出。"
            en="With the admin key, every comment on a project page shows a Delete button in this browser. It stays signed in for 30 days; sign out on shared computers."
          />
        </p>
        <AdminForm />
      </div>
    </section>
  );
}
