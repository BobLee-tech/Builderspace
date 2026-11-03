import type { Metadata } from "next";
import Link from "next/link";
import { Arr } from "@/components/fx/arr";
import { JsonLd } from "@/components/json-ld";
import { PageHead } from "@/components/page-head";
import { T } from "@/components/t";
import { FAQ, faqAnswer } from "@/lib/faq";
import { biText, breadcrumbLd, pageMeta } from "@/lib/seo";
import "./about.css";

export const metadata: Metadata = pageMeta("/about", {
  title: "关于 About",
  description: biText(
    "BuilderSpace 是什么、谁能加入、要不要钱、在哪里、怎么加入。",
    "What BuilderSpace is, who can join, what it costs, where it meets and how to join.",
  ),
});

// The answers search and AI tools quote, one short line each; the same list
// feeds /llms.txt and the FAQPage data below.
export default function AboutPage() {
  return (
    <section className="sec first">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map(({ q, a }) => ({
            "@type": "Question",
            name: `${q.zh} ${q.en}`,
            acceptedAnswer: {
              "@type": "Answer",
              text: biText(faqAnswer(a, "zh"), faqAnswer(a, "en")),
            },
          })),
        }}
      />
      <JsonLd data={breadcrumbLd([{ name: "关于 About", path: "/about" }])} />
      <div className="wrap">
        <PageHead
          path="about"
          eyebrow={{ zh: "关于 / About", en: "About" }}
          title={["Good", "questions."]}
          aside={[
            {
              k: { zh: "费用", en: "Cost" },
              v: { zh: "免费", en: "Free" },
            },
            {
              k: { zh: "语言", en: "Languages" },
              v: { zh: "中文 + English", en: "English + 中文" },
            },
            {
              k: { zh: "地点", en: "Where" },
              v: { zh: "悉尼 · UNSW", en: "Sydney · UNSW" },
            },
          ]}
        />
        <ol className="faq">
          {FAQ.map(({ q, a }, i) => (
            <li key={q.en}>
              <span className="faq-n mono mute">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="faq-q">
                <T {...q} />
              </h2>
              <div className="faq-a">
                {a.map((line) => (
                  <p key={line.en}>
                    <T {...line} />
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className="faq-cta">
          <Link href="/join" className="btn solid primary">
            <T zh="加入 BuilderSpace" en="Join BuilderSpace" />
            <Arr />
          </Link>
          <Link href="/events" className="btn ghost">
            <T zh="看活动" en="See events" />
          </Link>
        </div>
      </div>
    </section>
  );
}
