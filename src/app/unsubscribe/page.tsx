import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { T } from "@/components/t";
import { isUnsubscribeKind } from "@/lib/notify";
import { peekUnsubscribe } from "@/lib/unsubscribe";
import { confirmUnsubscribe } from "./actions";
import "../members.css";

// Where the link at the bottom of an owner email lands: one project, one kind
// of mail, a button to turn it off. Nothing changes on just opening the page.

export const metadata: Metadata = {
  title: "退订邮件提醒",
  robots: { index: false },
};

export default function UnsubscribePage({
  searchParams,
}: PageProps<"/unsubscribe">) {
  return (
    <section className="sec first">
      <div className="wrap">
        <Suspense fallback={<div className="join-wait" aria-busy />}>
          <Unsubscribe searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

const KIND_LABEL = {
  comments: { zh: "评论提醒", en: "comment emails", title: "Comment emails" },
  stars: { zh: "Star 提醒", en: "star emails", title: "Star emails" },
} as const;

async function Unsubscribe({
  searchParams,
}: {
  searchParams: PageProps<"/unsubscribe">["searchParams"];
}) {
  const params = await searchParams;
  const t = typeof params.t === "string" ? params.t : "";
  const k = params.k;
  const target = isUnsubscribeKind(k) ? await peekUnsubscribe(t) : null;

  if (!target || !isUnsubscribeKind(k)) {
    return (
      <div className="box join-first">
        <p className="mono mute">
          <T zh="退订 / Unsubscribe" en="Unsubscribe" />
        </p>
        <h1 className="h2">
          <T zh="这个链接用不了。" en="This link doesn't work." />
        </h1>
        <p className="mute">
          <T
            zh="登录后在「我的卡片」里改提醒设置。"
            en="Sign in and change your emails on My card."
          />
        </p>
        <Link href="/me" className="btn solid">
          <T zh="去我的卡片" en="Go to My card" />
        </Link>
      </div>
    );
  }

  const label = KIND_LABEL[k];
  const off = params.done === "1" || target[k] === "off";
  return (
    <div className="box join-first">
      <p className="mono mute">
        <T zh="退订 / Unsubscribe" en="Unsubscribe" />
      </p>
      <h1 className="h2">
        {off ? (
          <T
            zh={`「${target.name}」的${label.zh}已关闭。`}
            en={`${label.title} for ${target.name} are off.`}
          />
        ) : (
          <T
            zh={`不再收「${target.name}」的${label.zh}？`}
            en={`Stop ${label.en} for ${target.name}?`}
          />
        )}
      </h1>
      <p className="mute">
        <T
          zh="其他项目和审核结果照常。"
          en="Your other projects and review results aren't affected."
        />
      </p>
      {!off && (
        <form action={confirmUnsubscribe}>
          <input type="hidden" name="t" value={t} />
          <input type="hidden" name="k" value={k} />
          <button type="submit" className="btn solid">
            <T zh="退订" en="Unsubscribe" />
          </button>
        </form>
      )}
      <Link href="/me" className="linkish">
        <T zh="在「我的卡片」里改全部设置" en="All settings on My card" /> →
      </Link>
    </div>
  );
}
