import type { Metadata } from "next";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "加入" };

export default function JoinPage() {
  return (
    <section className="sec first">
      <div className="wrap">
        <p className="eyebrow mono">加入 / Join · 约 1 分钟</p>
        <h1 className="display page-title" style={{ marginBottom: 48 }}>
          <span className="line">
            <span>Start here.</span>
          </span>
        </h1>
        <div className="join-grid">
          <div className="facts">
            <div>
              <span className="mono mute">谁可以加入</span>
              <span>UNSW 本科 / 硕士</span>
            </div>
            <div>
              <span className="mono mute">我们不收</span>
              <span>zID · 学生证</span>
            </div>
            <div>
              <span className="mono mute">你的数据</span>
              <span>可随时要求删除</span>
            </div>
          </div>
          <JoinForm adminQr={process.env.NEXT_PUBLIC_ADMIN_WECHAT_QR ?? null} />
        </div>
      </div>
    </section>
  );
}
