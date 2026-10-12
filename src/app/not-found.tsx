import Link from "next/link";
import { T } from "@/components/t";

export default function NotFound() {
  return (
    <section className="sec first">
      <div className="wrap">
        <p className="eyebrow mono">404</p>
        <h1 className="display page-title">
          <span className="line">
            <span>Nothing here</span>
          </span>
          <span className="line">
            <span className="outline">yet.</span>
          </span>
        </h1>
        <Link href="/" className="btn ghost" style={{ marginTop: 32 }}>
          <T zh="回首页" en="Back home" /> <span className="arr">→</span>
        </Link>
      </div>
    </section>
  );
}
