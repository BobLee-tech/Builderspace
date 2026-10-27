import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MeCard } from "@/app/me/me-card";
import { Arr } from "@/components/fx/arr";
import { PageHead } from "@/components/page-head";
import { pitchText, projectText } from "@/components/project-card";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { getCardDesign, getSession } from "@/lib/auth";
import { getProjects, getPublicCard } from "@/lib/data";
import { cardViewOf, memberCode, SPARK_INFO } from "@/lib/members";
import type { PublicCard } from "@/lib/types";
import "../../members.css";
import "../member-wall.css";

// A member's card on its own page, while they keep it public (on by default,
// a switch on /me). Shared by link only: search engines are asked to skip it.

export async function generateMetadata({
  params,
}: PageProps<"/m/[handle]">): Promise<Metadata> {
  const pub = await getPublicCard((await params).handle);
  return {
    title: pub
      ? `${pub.card.nickname} · ${memberCode(pub.card.memberNo!)}`
      : "成员卡片",
    robots: { index: false },
  };
}

export default function MemberPage({ params }: PageProps<"/m/[handle]">) {
  return (
    <section className="sec first">
      <div className="wrap">
        <Suspense fallback={<div className="join-wait" aria-busy />}>
          {params.then(({ handle }) => (
            <Member handle={handle} />
          ))}
        </Suspense>
      </div>
    </section>
  );
}

async function Member({ handle }: { handle: string }) {
  const pub = await getPublicCard(handle);
  if (pub) return <CardPage pub={pub} />;
  // Not public: its owner still sees it, with a note that nobody else can.
  const m = (await getSession())?.member;
  if (m?.handle !== handle.toLowerCase()) notFound();
  const own: PublicCard = {
    handle: m.handle,
    card: cardViewOf(m),
    design: await getCardDesign(),
    projects: [],
  };
  return <CardPage pub={own} hidden={!m.isPublic} />;
}

async function CardPage({
  pub,
  hidden,
}: {
  pub: PublicCard;
  hidden?: boolean;
}) {
  const { card } = pub;
  const spark = SPARK_INFO[card.spark];
  const projects = pub.projects.length
    ? (await getProjects()).filter((p) => pub.projects.includes(p.slug))
    : [];
  return (
    <>
      <Link href="/people#members" className="crumb mono">
        ← <T zh="成员" en="People" />
      </Link>
      <PageHead
        path={`m/${pub.handle}`}
        eyebrow={{ zh: "成员卡片 / Member card", en: "Member card" }}
        title={[`${card.nickname}’s`, "card."]}
        aside={[
          {
            k: { zh: "编号", en: "Number" },
            v: {
              zh: memberCode(card.memberNo!),
              en: memberCode(card.memberNo!),
            },
          },
          {
            k: { zh: "拼块", en: "Piece" },
            v: {
              zh: `${spark.name} · ${spark.role.zh}`,
              en: `${spark.name} · ${spark.role.en}`,
            },
          },
          {
            k: { zh: "身份", en: "Status" },
            v: card.seal
              ? { zh: `认证成员 · ${card.seal}`, en: `Verified · ${card.seal}` }
              : { zh: "成员", en: "Member" },
          },
        ]}
      />
      <SampleNotice />
      {hidden && (
        <p className="mw-note small" role="status">
          <T
            zh="你的卡片没公开，只有你能看到这页"
            en="Your card isn't public: only you can see this page"
          />{" "}
          ·{" "}
          <Link href="/me" className="linkish">
            <T zh="去「我的」打开" en="Turn it on in Me" />
          </Link>
        </p>
      )}
      <div className="join2 me-grid">
        <MeCard card={card} design={pub.design} />
        <div className="me-side">
          {projects.length > 0 && (
            <section className="hud me-details me-stars">
              <h2 className="mono mute">
                <T zh="在做的项目" en="Projects" />
              </h2>
              <ul>
                {projects.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/projects/${p.slug}`}>
                      <T {...projectText(p, "name")} />
                    </Link>
                    <span className="mute small mw-pitch">
                      <T {...pitchText(p)} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="mw-cta">
            <p className="mute small">
              <T zh="你也可以有一张" en="You can have one too" />
            </p>
            <div className="row-actions">
              <Link href="/join" className="btn solid primary sm">
                <T zh="加入 BuilderSpace" en="Join BuilderSpace" /> <Arr />
              </Link>
              <Link href="/people#members" className="btn ghost sm">
                <T zh="看看其他成员" en="Meet other members" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
