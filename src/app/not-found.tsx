import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { PageHead } from "@/components/page-head";
import { T } from "@/components/t";

export default function NotFound() {
  return (
    <section className="sec first">
      <div className="wrap">
        <PageHead
          path="404"
          eyebrow={{ zh: "404 · 页面不存在", en: "404 · Not found" }}
          title={["Nothing here", "yet."]}
        />
        <Link href="/" className="btn ghost" style={{ marginTop: 8 }}>
          <T zh="回首页" en="Back home" /> <Arr />
        </Link>
      </div>
    </section>
  );
}
