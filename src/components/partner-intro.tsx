"use client";

import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  X,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Arr, Hud } from "@/components/fx/arr";
import { prefersReducedMotion } from "@/components/fx/motion";
import { T } from "@/components/t";
import { formatIsoDay } from "@/lib/format";
import type { PartnerIntro } from "@/lib/partners";
import { getSmoothScroller } from "@/lib/smooth-scroll";

type Bi = { zh: string; en: string };

/** A partner with an intro to show, as the server hands it over. */
export type PartnerView = {
  slug: string;
  name: string;
  logo: string;
  tint: string;
  role: Bi;
  since: string;
  url?: string;
  intro: PartnerIntro;
  /** Not confirmed by the partner yet: only `pnpm dev` gets here. */
  draft: boolean;
  /** Their events, in date order. */
  events: {
    slug: string;
    title: Bi;
    startsAt: string;
    came: number | null;
    seats: number | null;
    did: Bi | null;
  }[];
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const day = (iso: string) => formatIsoDay(iso).replaceAll("-", ".");

/**
 * The partner intro: opens over the page from anything with
 * `data-partner="<slug>"` (the home wall, "Supported by"), steps through
 * `partners` with the arrows, and puts ?p=<slug> in the address so it can be
 * shared, the way ?m= does on /people.
 */
export function PartnerIntros({ partners }: { partners: PartnerView[] }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const from = useRef<HTMLElement | null>(null);
  const closing = useRef(false);
  const [cur, setCur] = useState<number | null>(null);
  const [dir, setDir] = useState(0);
  const [out, setOut] = useState(false);
  // When it opened: decides which events are still to come.
  const [now, setNow] = useState(0);

  const address = useCallback((slug: string | null) => {
    const url = new URL(location.href);
    if (slug) url.searchParams.set("p", slug);
    else url.searchParams.delete("p");
    history.replaceState(history.state, "", url);
  }, []);

  const open = useCallback(
    (i: number, el: HTMLElement | null) => {
      from.current = el;
      closing.current = false;
      setOut(false);
      setDir(0);
      setNow(Date.now());
      setCur(i);
      address(partners[i].slug);
    },
    [partners, address],
  );

  const step = useCallback(
    (d: 1 | -1) => {
      if (cur === null || partners.length < 2 || closing.current) return;
      const i = (cur + d + partners.length) % partners.length;
      setDir(d);
      setCur(i);
      address(partners[i].slug);
    },
    [cur, partners, address],
  );

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const done = () => {
      dlg.current?.close();
      setCur(null);
      setOut(false);
      address(null);
      from.current?.focus({ preventScroll: true });
    };
    if (prefersReducedMotion()) return done();
    setOut(true);
    setTimeout(done, 230);
  }, [address]);

  // Any tile or chip for one of these partners opens it; so does ?p=<slug>.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest<HTMLElement>("[data-partner]");
      if (!el) return;
      const i = partners.findIndex((p) => p.slug === el.dataset.partner);
      if (i < 0) return;
      e.preventDefault();
      open(i, el);
    };
    document.addEventListener("click", onClick);
    const want = new URL(location.href).searchParams.get("p");
    const i = partners.findIndex((p) => p.slug === want);
    const raf = i >= 0 ? requestAnimationFrame(() => open(i, null)) : 0;
    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
    };
  }, [partners, open]);

  const isOpen = cur !== null;
  useEffect(() => {
    const d = dlg.current;
    if (!isOpen || !d) return;
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    d.querySelector<HTMLElement>(".pi-x")?.focus({ preventScroll: true });
    // The page behind stays put while it's open.
    const lenis = getSmoothScroller();
    lenis?.stop();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    // The logo lifts out of the tile and lands on the plate.
    const src = from.current?.querySelector("img");
    const dst = d.querySelector<HTMLElement>(".pi-plate img");
    if (src && dst && !prefersReducedMotion()) {
      const a = src.getBoundingClientRect();
      const b = dst.getBoundingClientRect();
      dst.animate(
        [
          {
            transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`,
          },
          { transform: "none" },
        ],
        { duration: 650, easing: "cubic-bezier(0.2, 0.7, 0.1, 1)" },
      );
    }
    return () => {
      root.style.overflow = overflow;
      lenis?.start();
    };
  }, [isOpen]);

  const p = cur === null ? null : partners[cur];
  const next = cur === null ? null : partners[(cur + 1) % partners.length];

  return (
    <dialog
      ref={dlg}
      className={out ? "pi out" : "pi"}
      aria-labelledby="pi-name"
      data-lenis-prevent
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
    >
      {p && cur !== null && (
        <div
          className="pi-sheet hud"
          style={{ "--tint": p.tint } as CSSProperties}
        >
          <Hud />
          <div className="pi-top mono">
            <span className="mute pi-where tnum">
              {pad2(cur + 1)} / {pad2(partners.length)}
            </span>
            {partners.length > 1 && (
              <>
                <button
                  type="button"
                  className="pi-round"
                  onClick={() => step(-1)}
                  aria-label="上一位 / Previous"
                >
                  <CaretLeft weight="light" size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  className="pi-round"
                  onClick={() => step(1)}
                  aria-label="下一位 / Next"
                >
                  <CaretRight weight="light" size={15} aria-hidden />
                </button>
              </>
            )}
            <button
              type="button"
              className="pi-round pi-x"
              onClick={close}
              aria-label="关闭 / Close"
            >
              <X weight="light" size={16} aria-hidden />
            </button>
          </div>
          <Detail
            key={p.slug}
            p={p}
            now={now}
            dir={dir}
            next={partners.length > 1 ? next : null}
            onNext={() => step(1)}
          />
        </div>
      )}
    </dialog>
  );
}

function Detail({
  p,
  now,
  dir,
  next,
  onNext,
}: {
  p: PartnerView;
  now: number;
  dir: number;
  next: PartnerView | null;
  onNext: () => void;
}) {
  const it = p.intro;
  const held = p.events.filter((e) => Date.parse(e.startsAt) <= now);
  const soon = p.events.length - held.length;
  const counts = held.map((e) => e.came).filter((n) => n !== null);
  const reached = counts.length ? counts.reduce((a, b) => a + b, 0) : null;
  const link = p.url
    ? { url: p.url, label: { zh: "官网", en: "Website" } }
    : it.page;
  const cls = dir ? `pi-body swap${dir < 0 ? " l" : ""}` : "pi-body";
  const d = (n: number) => ({ "--d": n }) as CSSProperties;

  return (
    <div className={cls}>
      <div className="pi-hero">
        <div className="pi-plate rise" style={d(0)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- the partner's own logo */}
          <img src={p.logo} alt="" />
        </div>
        <div className="pi-id">
          <span className="pi-kind mono mute rise" style={d(1)}>
            <T {...it.kind} /> · <T {...it.base} />
          </span>
          <h2 id="pi-name" className="rise" style={d(2)}>
            {p.name}
          </h2>
          <p className="pi-line rise" style={d(3)}>
            <T {...it.line} />
          </p>
          {link && (
            <span className="rise" style={d(4)}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn ghost sm"
              >
                <T {...link.label} />
                <Arr diag />
              </a>
            </span>
          )}
        </div>
      </div>

      <ul className="pi-stats rise" style={d(5)}>
        <li>
          <b className="txt">
            <T {...p.role} />
          </b>
          <span className="mono">
            <T zh="角色" en="Role" />
          </span>
        </li>
        <li>
          <b className="txt">{p.since}</b>
          <span className="mono">
            <T zh="合作起始" en="Partner since" />
          </span>
        </li>
        <li>
          <b>
            {pad2(held.length)}
            {soon > 0 && <sup>+{soon}</sup>}
          </b>
          <span className="mono">
            {soon > 0 ? (
              <T
                zh={`办过的活动 · ${soon} 场将至`}
                en={`Events run · ${soon} coming`}
              />
            ) : (
              <T zh="一起办的活动" en="Events together" />
            )}
          </span>
        </li>
        <li>
          <b>{reached ?? "—"}</b>
          <span className="mono">
            <T zh="到场人次" en="People reached" />
          </span>
        </li>
      </ul>

      <div className="pi-cols">
        <div className="pi-col">
          <section className="rise" style={d(6)}>
            <h3 className="pi-label mono">
              <b>01</b>
              <T zh="关于" en="About" />
            </h3>
            <ul className="pi-about">
              {it.about.map((a) => (
                <li key={a.en}>
                  <T {...a} />
                </li>
              ))}
            </ul>
          </section>
          <section className="rise" style={d(7)}>
            <h3 className="pi-label mono">
              <b>02</b>
              <T zh="为成员带来" en="For members" />
            </h3>
            <ul className="pi-gave">
              {it.gave.map((g) => (
                <li key={g.en}>
                  <T {...g} />
                </li>
              ))}
            </ul>
          </section>
          {it.quote && (
            <figure className="pi-quote rise" style={d(8)}>
              <blockquote>
                “<T {...it.quote.text} />”
              </blockquote>
              <figcaption className="mute">
                — {p.name} · <T {...it.quote.by} />
              </figcaption>
            </figure>
          )}
        </div>
        <section className="pi-col rise" style={d(7)}>
          <h3 className="pi-label mono">
            <b>03</b>
            <T zh="合作记录" en="Together" />
          </h3>
          <ol className="pi-log">
            {[...p.events].reverse().map((e) => {
              const up = Date.parse(e.startsAt) > now;
              return (
                <li key={e.slug} className={up ? "up" : undefined}>
                  <span className="pi-day mono mute tnum">
                    {day(e.startsAt)}
                  </span>
                  <i aria-hidden />
                  <span>
                    <Link href={`/events/${e.slug}`}>
                      <T {...e.title} />
                    </Link>
                    {up && (
                      <span className="pi-soon mono">
                        <T zh="即将" en="Soon" />
                      </span>
                    )}
                    <span className="pi-did mute">
                      {e.did && (
                        <>
                          <T {...e.did} />
                          {(up ? e.seats : e.came) !== null && " · "}
                        </>
                      )}
                      {up
                        ? e.seats !== null && (
                            <T
                              zh={`${e.seats} 个名额`}
                              en={`${e.seats} seats`}
                            />
                          )
                        : e.came !== null && (
                            <T zh={`${e.came} 人到场`} en={`${e.came} came`} />
                          )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <div className="pi-perf" aria-hidden />
      <div className="pi-foot">
        {p.draft ? (
          <span className="pi-ok draft mute">
            <T
              zh={`草稿 · 待 ${p.name} 确认后上线`}
              en={`Draft · goes live once ${p.name} confirms`}
            />
          </span>
        ) : (
          <span className="pi-ok mute">
            <T
              zh={`介绍经 ${p.name} 确认 · ${it.confirmed?.replaceAll("-", ".")}`}
              en={`Confirmed by ${p.name} · ${it.confirmed?.replaceAll("-", ".")}`}
            />
          </span>
        )}
        {next && next.slug !== p.slug && (
          <button type="button" className="pi-next" onClick={onNext}>
            <span className="mono mute">
              <T zh="下一位" en="Next" />
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element -- the partner's own logo */}
            <img src={next.logo} alt={next.name} />
            <ArrowRight weight="light" size={16} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
