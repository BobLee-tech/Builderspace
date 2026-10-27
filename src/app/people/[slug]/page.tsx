import type { Metadata } from "next";
import { Noto_Serif_SC } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { SampleNotice } from "@/components/sample-notice";
import { T } from "@/components/t";
import { getTeam } from "@/lib/data";
import {
  FOUNDER_PROFILES,
  founderTransition,
  type FounderProfile,
} from "@/lib/founder-profiles";
import { teamPhotoUrl, type TeamPerson } from "@/lib/team";
import { BackLink, ProfileKeys } from "./keys";
import "../people.css";

// The quote is set in a serif; only this page loads it.
const serif = Noto_Serif_SC({
  weight: "600",
  variable: "--f-serif",
  preload: false,
});

/** The founders that have a profile, in the order /people shows them. */
async function getFounders() {
  const team = await getTeam();
  return team.flatMap((p) => {
    const profile =
      p.team === "founder" && p.profileSlug && FOUNDER_PROFILES[p.profileSlug];
    return profile ? [{ person: p, slug: p.profileSlug!, profile }] : [];
  });
}

// Prerendered whole, like the event pages. Cache Components needs at least
// one param, hence the stand-in, which renders the 404.
export async function generateStaticParams() {
  const founders = await getFounders();
  return founders.length
    ? founders.map(({ slug }) => ({ slug }))
    : [{ slug: "__none__" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/people/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = (await getFounders()).find((f) => f.slug === slug);
  if (!found) return {};
  return {
    title: found.person.card.nickname,
    description: found.profile.headline.map((l) => l.zh).join("，"),
  };
}

export default async function ProfilePage({
  params,
}: PageProps<"/people/[slug]">) {
  const { slug } = await params;
  const founders = await getFounders();
  const i = founders.findIndex((f) => f.slug === slug);
  if (i < 0) notFound();
  const { person, profile } = founders[i];
  const n = founders.length;
  const prev = `/people/${founders[(i - 1 + n) % n].slug}`;
  const next = `/people/${founders[(i + 1) % n].slug}`;
  return (
    <section className={`sec first tm-pf-page ${serif.variable}`}>
      <div className="wrap">
        <ProfileKeys prev={prev} next={next} />
        <div className="tm-pf-bar">
          <BackLink />
          <span className="tm-pf-path mono">
            <span className="mute">~/builderspace/people/</span>
            <b>{slug}</b>
          </span>
          {n > 1 && (
            <nav className="tm-pf-nav" aria-label="Founders">
              <Link href={prev} replace scroll={false}>
                <span aria-hidden>←</span>
                <span className="sr-only">
                  <T zh="上一位" en="Previous" />
                </span>
              </Link>
              <span className="mono">
                {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
              <Link href={next} replace scroll={false}>
                <span aria-hidden>→</span>
                <span className="sr-only">
                  <T zh="下一位" en="Next" />
                </span>
              </Link>
            </nav>
          )}
        </div>
        <SampleNotice />
        <Profile slug={slug} person={person} profile={profile} />
      </div>
    </section>
  );
}

const Lines = ({ lines }: { lines: FounderProfile["headline"] }) =>
  lines.map((l, k) => (
    <span key={k} className={k ? "tm-ln next" : "tm-ln"}>
      <T {...l} />
    </span>
  ));

function Profile({
  slug,
  person: p,
  profile: f,
}: {
  slug: string;
  person: TeamPerson;
  profile: FounderProfile;
}) {
  const photo = p.portrait ?? p.avatar;
  const name = p.card.nickname;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const siteImage = f.site && base ? teamPhotoUrl(base, f.site.image) : null;
  return (
    <div className="tm-pf">
      <div className="tm-pf-photo-col">
        <ViewTransition
          name={founderTransition(slug)}
          share="morph"
          default="none"
        >
          <div className="tm-pf-photo tm-media">
            {photo ? (
              <Image
                className="tm-photo"
                src={photo}
                alt={p.title ? `${name}, ${p.title}` : name}
                fill
                sizes="(max-width: 900px) 100vw, 480px"
                priority
              />
            ) : (
              <span className="tm-mascot">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG art */}
                <img src={`/mascots/${p.card.spark}.svg`} alt="" />
              </span>
            )}
          </div>
        </ViewTransition>
        <p className="tm-pf-cap mono tm-rv">
          <span>
            <T {...f.focus} />
          </span>
          <span>BuilderSpace</span>
        </p>
      </div>

      <div className="tm-pf-body">
        <header className="tm-pf-head tm-rv">
          {p.title && <p className="mono mute">{p.title}</p>}
          <h1 className="tm-pf-name">{name}</h1>
          {f.cn && <p className="tm-pf-cn">{f.cn}</p>}
          <p className="tm-pf-headline">
            <Lines lines={f.headline} />
          </p>
        </header>

        <div className="tm-pf-links tm-rv">
          {f.site && (
            <a
              className="btn solid"
              href={f.site.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {f.site.domain} <span aria-hidden>↗</span>
            </a>
          )}
          {f.links.map((l) => (
            <a
              key={l.href}
              className="btn ghost"
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {l.label} <span aria-hidden>↗</span>
            </a>
          ))}
        </div>

        {f.quote && (
          <figure className="tm-pf-quote tm-rv">
            <span className="tm-pf-mark" aria-hidden>
              “
            </span>
            <blockquote>
              <Lines lines={f.quote.lines} />
            </blockquote>
            <figcaption className="mono">— {f.quote.by}</figcaption>
          </figure>
        )}

        <section className="tm-pf-sec tm-rv">
          <h2 className="mono">
            <T zh="经历" en="Background" />
          </h2>
          <dl className="tm-pf-facts">
            {f.facts.map((fact, k) => (
              <div key={k}>
                <dt>
                  <T {...fact.k} />
                </dt>
                <dd>
                  <Lines lines={fact.lines} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {f.wins.length > 0 && (
          <section className="tm-pf-sec tm-rv">
            <h2 className="mono">
              <T zh="拿过的奖和做过的东西" en="Prizes and projects" />
            </h2>
            <ul className="tm-pf-wins">
              {f.wins.map((w) => (
                <li key={w.title}>
                  <span className={w.gold ? "tm-pf-badge gold" : "tm-pf-badge"}>
                    {w.badge}
                  </span>
                  <b>{w.title}</b>
                  <span className="tm-pf-win-lines">
                    <Lines lines={w.lines} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {f.site && (
          <section className="tm-pf-sec tm-rv">
            <h2 className="mono">
              <T zh="个人网站" en="Personal site" />
            </h2>
            <a
              className="tm-pf-site"
              href={f.site.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span
                className="tm-pf-thumb"
                style={
                  siteImage
                    ? {
                        backgroundImage: `url(${siteImage})`,
                        backgroundPosition: f.site.focus ?? "center",
                      }
                    : undefined
                }
              />
              <span className="tm-pf-site-meta">
                <span className="tm-pf-domain mono">
                  <span>{f.site.domain}</span>
                  <span aria-hidden>↗</span>
                </span>
                <span className="tm-pf-site-title">
                  <T {...f.site.title} />
                </span>
                <span className="tm-pf-site-blurb">
                  <T {...f.site.blurb} />
                </span>
              </span>
            </a>
          </section>
        )}
      </div>
    </div>
  );
}
