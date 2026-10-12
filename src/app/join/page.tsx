import type { Metadata } from "next";
import { JoinForm } from "./join-form";
import { T } from "@/components/t";

export const metadata: Metadata = { title: "加入" };

export default function JoinPage() {
  return (
    <section className="sec first">
      <div className="wrap">
        <p className="eyebrow mono">
          <T zh="加入 / Join · 约 1 分钟" en="Join · about a minute" />
        </p>
        <h1 className="display page-title" style={{ marginBottom: 48 }}>
          <span className="line">
            <span>Start here.</span>
          </span>
        </h1>
        <div className="join-grid">
          <div className="facts">
            <div>
              <span className="mono mute">
                <T zh="谁可以加入" en="Who can join" />
              </span>
              <span>
                <T zh="UNSW 本科 / 硕士" en="UNSW undergrad / postgrad" />
              </span>
            </div>
            <div>
              <span className="mono mute">
                <T zh="我们不收" en="We never ask for" />
              </span>
              <span>
                <T zh="zID · 学生证" en="zID · student card" />
              </span>
            </div>
            <div>
              <span className="mono mute">
                <T zh="你的数据" en="Your data" />
              </span>
              <span>
                <T zh="可随时要求删除" en="Deleted on request" />
              </span>
            </div>
          </div>
          <JoinForm
            adminQr={
              process.env.NEXT_PUBLIC_ADMIN_WECHAT_QR || "/admin-wechat-qr.jpg"
            }
          />
        </div>
      </div>
    </section>
  );
}
