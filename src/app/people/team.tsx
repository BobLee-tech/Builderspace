"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  ViewTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { prefersReducedMotion } from "@/components/fx/motion";
import { T } from "@/components/t";
import {
  MATERIAL_LABEL,
  PATTERN_LABEL,
  shownDesign,
  TINT_INFO,
} from "@/lib/card-design";
import {
  FOUNDER_PROFILES,
  FROM_PEOPLE,
  founderTransition,
} from "@/lib/founder-profiles";
import { memberCode, type Spark } from "@/lib/members";
import {
  CORE_TEAM_FLOOR,
  pageCount,
  pageRange,
  pageSlots,
  roughly,
  TEAM_DEPARTMENTS,
  type CoreTeam,
  type TeamPerson,
} from "@/lib/team";
import { POSITION_LABEL } from "@/lib/types";
import { levelCard, MemberCard, setCardLight } from "../join/member-card";

type Gsap = typeof import("gsap").gsap;
let gsapLoad: Promise<Gsap> | null = null;
const loadGsap = () => (gsapLoad ??= import("gsap").then((m) => m.gsap));

const GLYPH: Record<CoreTeam, string> = {
  ops: "[OPS]",
  tech: "</>",
  events: "→ EVT",
};
/** Seconds a page of cards stays before it turns. */
const PAGE_SECONDS = 6;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "github.com/kai" → "GitHub": the link's site, named the way people say it. */
function linkLabel(url: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const known: Record<string, string> = {
    "github.com": "GitHub",
    "linkedin.com": "LinkedIn",
    "instagram.com": "Instagram",
    "x.com": "X",
    "behance.net": "Behance",
    "dribbble.com": "Dribbble",
  };
  return known[host] ?? host;
}

/** Stand-in for a missing photo: the person's mascot, grey until hovered. */
function Mascot({ spark }: { spark: Spark }) {
  return (
    <span className="tm-mascot">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG art */}
      <img src={`/mascots/${spark}.svg`} alt="" />
    </span>
  );
}

type Open = (p: TeamPerson, from: Element | null | undefined) => void;

/**
 * The founders and the core team. Core members show the member card they
 * designed; clicking one lifts it out of the grid into an enlarged view.
 */
export function Team({ people }: { people: TeamPerson[] }) {
  const founders = people.filter((p) => p.team === "founder");
  const core = people.filter((p) => p.team !== "founder");
  const [zoom, setZoom] = useState<{
    list: TeamPerson[];
    i: number;
    from: DOMRect | null;
  } | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const listFor = (p: TeamPerson) =>
    p.team === "founder" ? founders : core.filter((x) => x.team === p.team);

  const open: Open = (p, from) => {
    const list = listFor(p);
    opener.current = document.activeElement as HTMLElement | null;
    setZoom({
      list,
      i: list.indexOf(p),
      from: from?.getBoundingClientRect() ?? null,
    });
  };

  // /people?m=handle opens that person's card, so a card can be shared.
  useEffect(() => {
    void loadGsap();
    const slug = new URLSearchParams(location.search).get("m");
    const p = slug ? people.find((x) => x.slug === slug) : undefined;
    if (!p) return;
    const list =
      p.team === "founder"
        ? people.filter((x) => x.team === "founder")
        : people.filter((x) => x.team === p.team);
    // Opening from the address is a one-off on load, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZoom({ list, i: list.indexOf(p), from: null });
  }, [people]);

  const lifted = zoom ? zoom.list[zoom.i].id : null;

  return (
    <div className="tm">
      {founders.length > 0 && (
        <>
          <div className="tm-sub mono">
            <h2>
              <T zh="创始团队" en="Founding team" />
            </h2>
            <span className="tm-rule" aria-hidden />
            {founders.length > 1 && (
              <span className="tm-swipe" aria-hidden>
                <T zh="左右滑动" en="Swipe" /> ⇢
              </span>
            )}
            <span className="tm-n">{pad2(founders.length)}</span>
          </div>
          <Founders people={founders} />
        </>
      )}

      <div className="tm-sub mono">
        <h2>
          <T zh="核心成员" en="Core team" />
        </h2>
        <span className="tm-rule" aria-hidden />
        <span className="tm-n">
          {roughly(Math.max(core.length, CORE_TEAM_FLOOR))}
        </span>
      </div>
      <div className="tm-depts">
        {TEAM_DEPARTMENTS.map((d) => {
          const team = core.filter((p) => p.team === d.key);
          return (
            <section
              className="tm-dept"
              key={d.key}
              aria-labelledby={`tm-${d.key}`}
            >
              <header className="tm-dept-head">
                <span className="tm-glyph" aria-hidden>
                  {GLYPH[d.key]}
                </span>
                <h3 id={`tm-${d.key}`}>
                  <T {...d.name} />{" "}
                  <span className="mono mute">{pad2(team.length)}</span>
                </h3>
                <ul>
                  {d.positions.map((k) => (
                    <li key={k}>
                      <T {...POSITION_LABEL[k]} />
                    </li>
                  ))}
                </ul>
              </header>
              <Pager
                key={team.map((p) => p.id).join()}
                people={team}
                dept={d.name}
                lifted={lifted}
                frozen={zoom !== null}
                onOpen={open}
              />
            </section>
          );
        })}
      </div>

      {zoom && (
        <Zoom
          list={zoom.list}
          i={zoom.i}
          from={zoom.from}
          onStep={(d) =>
            setZoom(
              (z) =>
                z && { ...z, i: (z.i + d + z.list.length) % z.list.length },
            )
          }
          onClosed={(landedOn) => {
            setZoom(null);
            // Focus goes back to the card that was put back, or to whatever opened it.
            const tile = landedOn
              ? document.querySelector<HTMLElement>(
                  `[data-tm-id="${CSS.escape(landedOn)}"] .tm-open`,
                )
              : null;
            (tile ?? opener.current)?.focus({ preventScroll: true });
          }}
        />
      )}
    </div>
  );
}

/**
 * The founders in one row; on a phone a swipe row that opens on the middle
 * one, with dashes under it. Each card links to that founder's profile.
 */
function Founders({ people }: { people: TeamPerson[] }) {
  const middle = Math.floor((people.length - 1) / 2);
  const row = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(middle);
  // scrollLeft that puts card k in the middle of the row
  const centre = (k: number) => {
    const el = row.current;
    const card = el?.children[k];
    if (!el || !card) return 0;
    const r = card.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return r.left - box.left + el.scrollLeft - (el.clientWidth - r.width) / 2;
  };
  // Before paint, so a phone never shows the row jump from the first card.
  useLayoutEffect(() => {
    const el = row.current;
    if (el && el.scrollWidth > el.clientWidth + 1)
      el.scrollLeft = centre(middle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);
  return (
    <>
      <div
        className="tm-fd-grid"
        ref={row}
        onScroll={() => {
          const el = row.current;
          if (!el || people.length < 2) return;
          const span = centre(1) - centre(0);
          setAt(Math.round((el.scrollLeft - centre(0)) / span));
        }}
      >
        {people.map((p, i) => (
          <Founder key={p.id} person={p} priority={i === middle} />
        ))}
      </div>
      {people.length > 1 && (
        <div className="tm-fd-dots">
          {people.map((p, k) => (
            <button
              key={p.id}
              type="button"
              aria-label={p.card.nickname}
              aria-current={k === at}
              onClick={() =>
                row.current?.scrollTo({
                  left: centre(k),
                  behavior: prefersReducedMotion() ? "auto" : "smooth",
                })
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function Founder({
  person: p,
  priority,
}: {
  person: TeamPerson;
  priority: boolean;
}) {
  const profile = p.profileSlug ? FOUNDER_PROFILES[p.profileSlug] : undefined;
  const photo = p.portrait ?? p.avatar;
  const name = p.card.nickname;
  const body = (
    <>
      <ViewTransition
        name={founderTransition(p.profileSlug ?? p.id)}
        share="morph"
        default="none"
      >
        <div className="tm-media">
          {photo ? (
            <Image
              className="tm-photo"
              src={photo}
              alt={p.title ? `${name}, ${p.title}` : name}
              fill
              sizes="(max-width: 640px) 80vw, (max-width: 1240px) 32vw, 400px"
              priority={priority}
            />
          ) : (
            <Mascot spark={p.card.spark} />
          )}
          <i className="tm-fade" aria-hidden />
          <div className="tm-cap">
            {p.title && <p className="mono tm-role">{p.title}</p>}
            <h3 className={name.length > 9 ? "tm-name long" : "tm-name"}>
              {name}
            </h3>
          </div>
        </div>
      </ViewTransition>
      <div className="tm-below">
        {profile ? (
          <p className="tm-focus">
            <T {...profile.focus} />
          </p>
        ) : (
          p.bio && (
            <p className="tm-focus tm-bio">
              <T zh={p.bio} en={p.bioEn ?? p.bio} />
            </p>
          )
        )}
        {profile && (
          <span className="tm-more mono" aria-hidden>
            <T zh="看介绍" en="Profile" /> <span>→</span>
          </span>
        )}
      </div>
    </>
  );
  return profile ? (
    <Link
      href={`/people/${p.profileSlug}`}
      className="tm-fd tm-lift"
      onClick={() => {
        try {
          sessionStorage.setItem(FROM_PEOPLE, "1");
        } catch {}
      }}
    >
      {body}
    </Link>
  ) : (
    <article className="tm-fd tm-lift">{body}</article>
  );
}

/** One member's card in the grid; the light follows the pointer. */
function CardTile({
  person: p,
  lifted,
  onOpen,
}: {
  person: TeamPerson;
  lifted: boolean;
  onOpen: Open;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const col = () => wrap.current?.querySelector<HTMLElement>(".mc-col") ?? null;
  const move = (e: ReactPointerEvent) => {
    const c = col();
    const stage = c?.querySelector(".mc-stage");
    if (!c || !stage || e.pointerType !== "mouse" || prefersReducedMotion())
      return;
    const r = stage.getBoundingClientRect();
    c.querySelector(".mc-tilt")?.classList.add("tracking");
    setCardLight(
      c,
      (e.clientX - r.left) / r.width,
      (e.clientY - r.top) / r.height,
      0.5,
    );
  };
  const pos = p.position && POSITION_LABEL[p.position];
  return (
    <div
      className={lifted ? "tm-card lifted" : "tm-card"}
      data-tm-id={p.id}
      ref={wrap}
      onPointerMove={move}
      onPointerLeave={() => {
        const c = col();
        if (c) levelCard(c);
      }}
    >
      <MemberCard card={p.card} design={p.design} flipped={false} still />
      <span className="tm-card-cap">
        <span className="tm-av">
          {p.avatar ? (
            <Image src={p.avatar} alt="" width={44} height={44} />
          ) : (
            <Mascot spark={p.card.spark} />
          )}
        </span>
        {pos && (
          <span className="tm-pos">
            <T {...pos} />
          </span>
        )}
        <span className="tm-go mono" aria-hidden>
          <T zh="看卡" en="View" /> ↗
        </span>
      </span>
      <button
        type="button"
        className="tm-open"
        onClick={() => onOpen(p, wrap.current?.querySelector(".mc-stage"))}
      >
        <span className="sr-only">
          {p.card.nickname}
          {pos && (
            <>
              {" · "}
              <T {...pos} />
            </>
          )}
          {" · "}
          <T zh="打开成员卡" en="open member card" />
        </span>
      </button>
    </div>
  );
}

type PagerControls = {
  go: (d: 1 | -1) => void;
  hold: (reason: string) => void;
  release: (reason: string) => void;
  pause: (paused: boolean) => void;
};

/**
 * A department's cards: six cells, the last one the "join" card. A team that
 * doesn't fit turns a page every few seconds, each card flipping over to the
 * next person in a wave; pointer, focus, scrolling away, the pause button and
 * an open card all hold it.
 */
function Pager({
  people,
  dept,
  lifted,
  frozen,
  onOpen,
}: {
  people: TeamPerson[];
  dept: { zh: string; en: string };
  lifted: string | null;
  frozen: boolean;
  onOpen: Open;
}) {
  const n = people.length;
  const pages = pageCount(n);
  const [page, setPage] = useState(0);
  const [slots, setSlots] = useState(() => pageSlots(n, 0));
  const [auto, setAuto] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const cells = useRef<(HTMLDivElement | null)[]>([]);
  const dashes = useRef<(HTMLElement | null)[]>([]);
  const ctl = useRef<PagerControls | null>(null);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (pages < 2) return;
    let gsap: Gsap | null = null;
    let alive = true;
    let current = 0;
    let busy = false;
    let isPaused = false;
    let timer: ReturnType<Gsap["to"]> | null = null;
    const holds = new Set<string>();
    const autoplay = !prefersReducedMotion();
    // Known only in the browser; the server renders the grid without it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuto(autoplay);

    const drive = () => {
      const on = autoplay && !isPaused && holds.size === 0;
      setPlaying(on);
      if (timer) {
        if (on) timer.resume();
        else timer.pause();
      }
    };
    const restart = () => {
      timer?.kill();
      timer = null;
      if (!gsap) return;
      dashes.current.forEach(
        (d, k) => d && gsap!.set(d, { scaleX: k < current ? 1 : 0 }),
      );
      const dash = dashes.current[current];
      if (!dash) return;
      if (!autoplay) {
        gsap.set(dash, { scaleX: 1 });
        return;
      }
      // The current dash fills up until the page turns.
      timer = gsap.fromTo(
        dash,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: PAGE_SECONDS,
          ease: "none",
          onComplete: () => go(1),
        },
      );
      drive();
    };
    const go = (d: 1 | -1) => {
      if (busy) return;
      current = (current + d + pages) % pages;
      const next = pageSlots(n, current);
      setPage(current);
      restart();
      if (!gsap || prefersReducedMotion()) {
        setSlots(next);
        return;
      }
      busy = true;
      const order = next.map((_, k) => k);
      if (d < 0) order.reverse();
      const tl = gsap.timeline({ onComplete: () => void (busy = false) });
      order.forEach((k, j) => {
        const el = cells.current[k];
        if (!el) return;
        const at = j * 0.09;
        // Each card turns away, becomes the next person and turns back with a
        // small overshoot.
        tl.to(
          el,
          { rotateY: d > 0 ? -90 : 90, duration: 0.26, ease: "power2.in" },
          at,
        )
          .call(
            () => setSlots((s) => s.map((v, m) => (m === k ? next[k] : v))),
            undefined,
            at + 0.26,
          )
          .fromTo(
            el,
            { rotateY: d > 0 ? 90 : -90 },
            { rotateY: 0, duration: 0.6, ease: "back.out(1.4)" },
            at + 0.26,
          );
      });
    };
    ctl.current = {
      go,
      hold: (r) => {
        holds.add(r);
        drive();
      },
      release: (r) => {
        holds.delete(r);
        drive();
      },
      pause: (v) => {
        isPaused = v;
        drive();
      },
    };
    void loadGsap().then((g) => {
      if (!alive) return;
      gsap = g;
      restart();
    });
    const io = new IntersectionObserver(([e]) =>
      e.isIntersecting ? ctl.current?.release("off") : ctl.current?.hold("off"),
    );
    if (root.current) io.observe(root.current);
    return () => {
      alive = false;
      io.disconnect();
      timer?.kill();
      ctl.current = null;
    };
  }, [n, pages]);

  // An open card holds every department where it is.
  useEffect(() => {
    if (frozen) ctl.current?.hold("zoom");
    else ctl.current?.release("zoom");
  }, [frozen]);

  const [first, last] = pageRange(n, page);
  const paging = pages > 1;

  return (
    <div
      className="tm-pager"
      ref={root}
      onPointerEnter={(e) =>
        e.pointerType === "mouse" && ctl.current?.hold("hover")
      }
      onPointerLeave={(e) =>
        e.pointerType === "mouse" && ctl.current?.release("hover")
      }
      onFocus={() => ctl.current?.hold("focus")}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget))
          ctl.current?.release("focus");
      }}
      onKeyDown={(e) => {
        if (!paging || (e.key !== "ArrowLeft" && e.key !== "ArrowRight"))
          return;
        e.preventDefault();
        ctl.current?.go(e.key === "ArrowRight" ? 1 : -1);
      }}
    >
      <div
        className="tm-grid"
        onPointerDown={(e) => {
          if (paging) swipe.current = { x: e.clientX, moved: false };
        }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s || Math.abs(e.clientX - s.x) < 40) return;
          s.moved = true;
          swipe.current = s;
          ctl.current?.go(e.clientX < s.x ? 1 : -1);
        }}
        onClickCapture={(e) => {
          // A swipe ends on a card; don't let it open that card too.
          if (swipe.current?.moved) {
            e.preventDefault();
            e.stopPropagation();
            swipe.current = null;
          }
        }}
      >
        {slots.map((idx, k) => (
          <div
            className="tm-cell"
            key={k}
            ref={(el) => {
              cells.current[k] = el;
            }}
          >
            <CardTile
              person={people[idx]}
              lifted={people[idx].id === lifted}
              onOpen={onOpen}
            />
          </div>
        ))}
        <Link href="/core-team" className="tm-card tm-join">
          <span className="tm-slotwrap">
            <span className="tm-slot">
              <span className="mono">BS-····</span>
              <b aria-hidden>+</b>
              <span className="mono">
                <T zh="这里可以是你的卡" en="Your card here" />
              </span>
            </span>
          </span>
          <span className="tm-card-cap">
            <span className="tm-pos">
              <T zh={`申请加入${dept.zh}`} en={`Join ${dept.en}`} />
            </span>
          </span>
        </Link>
      </div>

      {paging && (
        <div className="tm-foot">
          <span className="tm-pages" aria-hidden>
            {Array.from({ length: pages }, (_, k) => (
              <i key={k} className={k === page ? "on" : undefined}>
                <b
                  ref={(el) => {
                    dashes.current[k] = el;
                  }}
                />
              </i>
            ))}
          </span>
          <span className="tm-meta mono">
            <span className="tm-idx">
              {pad2(first)}–{pad2(last)} / {pad2(n)}
            </span>
            {auto && (
              <span className={playing ? "tm-state on" : "tm-state"}>
                {playing ? (
                  <T zh="自动" en="Auto" />
                ) : (
                  <T zh="已停" en="Paused" />
                )}
              </span>
            )}
          </span>
          <span className="tm-btns">
            <button type="button" onClick={() => ctl.current?.go(-1)}>
              <span aria-hidden>←</span>
              <span className="sr-only">
                <T zh="上一页" en="Previous page" />
              </span>
            </button>
            <button type="button" onClick={() => ctl.current?.go(1)}>
              <span aria-hidden>→</span>
              <span className="sr-only">
                <T zh="下一页" en="Next page" />
              </span>
            </button>
            {auto && (
              <button
                type="button"
                aria-pressed={paused}
                onClick={() => {
                  setPaused(!paused);
                  ctl.current?.pause(!paused);
                }}
              >
                <svg viewBox="0 0 10 10" aria-hidden>
                  {paused ? (
                    <path d="M2.2 1 9 5 2.2 9z" />
                  ) : (
                    <>
                      <rect x="1.5" y="1" width="2.5" height="8" />
                      <rect x="6" y="1" width="2.5" height="8" />
                    </>
                  )}
                </svg>
                <span className="sr-only">
                  <T zh="暂停自动翻页" en="Pause page turning" />
                </span>
              </button>
            )}
          </span>
          <ul className="sr-only">
            {people.map((p) => (
              <li key={p.id}>
                {p.card.nickname}
                {p.position && (
                  <>
                    {" · "}
                    <T {...POSITION_LABEL[p.position]} />
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * The enlarged card. It flies in from where it sat in the grid (or rises in),
 * tilts with the pointer, turns over to the builder profile, steps through the
 * department with ← →, and flies back to its place on close.
 */
function Zoom({
  list,
  i,
  from,
  onStep,
  onClosed,
}: {
  list: TeamPerson[];
  i: number;
  from: DOMRect | null;
  onStep: (d: 1 | -1) => void;
  onClosed: (landedOn: string | null) => void;
}) {
  const p = list[i];
  const dlg = useRef<HTMLDialogElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  // Stepping can be cut short by closing; closing can't be interrupted.
  const stepping = useRef(false);
  const closing = useRef(false);
  const start = useRef({ from });
  const [flipped, setFlipped] = useState(false);
  const [shine, setShine] = useState(true);
  const [ready, setReady] = useState(false);

  const stage = () =>
    card.current?.querySelector<HTMLElement>(".mc-stage") ?? null;

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    d.showModal();
    let alive = true;
    void loadGsap().then((gsap) => {
      const el = card.current?.querySelector<HTMLElement>(".mc-stage");
      if (!alive || !el || !info.current) return;
      const quick = prefersReducedMotion();
      const to = el.getBoundingClientRect();
      const src = start.current.from;
      setReady(true);
      gsap.fromTo(
        bg.current,
        { opacity: 0 },
        { opacity: 1, duration: quick ? 0 : 0.45, ease: "power2.out" },
      );
      if (src && !quick) {
        // Lifts out of the grid and flies to the middle, growing as it goes.
        gsap.fromTo(
          el,
          {
            x: src.left - to.left,
            y: src.top - to.top,
            scale: src.width / to.width,
            transformOrigin: "0 0",
          },
          {
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: "expo.out",
            clearProps: "transform",
          },
        );
      } else {
        gsap.fromTo(
          el,
          { y: 36, scale: 0.92, opacity: 0 },
          {
            y: 0,
            scale: 1,
            opacity: 1,
            duration: quick ? 0 : 0.7,
            ease: "expo.out",
            clearProps: "transform,opacity",
          },
        );
      }
      gsap.fromTo(
        info.current.children,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.05,
          delay: quick ? 0 : 0.25,
          ease: "power3.out",
          clearProps: "opacity,transform",
        },
      );
    });
    const t = window.setTimeout(() => setShine(false), 1400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  // The address follows the card, so it can be copied and shared.
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("m", p.slug);
    history.replaceState(history.state, "", url);
  }, [p.slug]);

  const step = (d: 1 | -1) => {
    const el = card.current;
    if (stepping.current || closing.current || list.length < 2 || !el) return;
    stepping.current = true;
    void loadGsap().then((gsap) => {
      const quick = prefersReducedMotion();
      // Out one side, the next card in from the other, like dealing.
      gsap.to(el, {
        x: -80 * d,
        rotateY: -28 * d,
        opacity: 0,
        duration: quick ? 0 : 0.24,
        ease: "power2.in",
        onComplete: () => {
          setFlipped(false);
          onStep(d);
          requestAnimationFrame(() => {
            if (closing.current) return;
            gsap.fromTo(
              el,
              { x: 80 * d, rotateY: 28 * d, opacity: 0 },
              {
                x: 0,
                rotateY: 0,
                opacity: 1,
                duration: quick ? 0 : 0.65,
                ease: "expo.out",
                clearProps: "transform,opacity",
                onComplete: () => void (stepping.current = false),
              },
            );
            if (info.current)
              gsap.fromTo(
                info.current.children,
                { opacity: 0, y: 8 },
                {
                  opacity: 1,
                  y: 0,
                  duration: quick ? 0 : 0.4,
                  stagger: 0.03,
                  clearProps: "opacity,transform",
                },
              );
          });
        },
      });
    });
  };

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setFlipped(false);
    void loadGsap().then((gsap) => {
      if (stepping.current && card.current) {
        gsap.killTweensOf(card.current);
        gsap.set(card.current, { clearProps: "transform,opacity" });
        stepping.current = false;
      }
      const el = stage();
      const quick = prefersReducedMotion();
      // Back to this person's place in the grid if it's on screen; otherwise
      // it shrinks away where it is.
      const target = document
        .querySelector(`[data-tm-id="${CSS.escape(p.id)}"] .mc-stage`)
        ?.getBoundingClientRect();
      const onScreen = Boolean(
        target &&
        target.width > 0 &&
        target.bottom > 0 &&
        target.top < innerHeight,
      );
      const done = () => {
        dlg.current?.close();
        const url = new URL(location.href);
        url.searchParams.delete("m");
        history.replaceState(history.state, "", url);
        onClosed(onScreen ? p.id : null);
      };
      if (!el) return done();
      const at = el.getBoundingClientRect();
      const tl = gsap.timeline({ onComplete: done });
      if (info.current)
        tl.to(
          info.current.children,
          { opacity: 0, y: 10, duration: quick ? 0 : 0.2, stagger: 0.02 },
          0,
        );
      tl.to(bg.current, { opacity: 0, duration: quick ? 0 : 0.45 }, 0.1);
      if (target && onScreen && !quick) {
        tl.to(
          el,
          {
            x: target.left - at.left,
            y: target.top - at.top,
            scale: target.width / at.width,
            transformOrigin: "0 0",
            duration: 0.6,
            ease: "power3.inOut",
          },
          0,
        );
      } else {
        tl.to(
          el,
          {
            y: 24,
            scale: 0.94,
            opacity: 0,
            duration: quick ? 0 : 0.35,
            ease: "power2.in",
          },
          0,
        );
      }
    });
  };

  const design = shownDesign(p.design, Boolean(p.card.seal));
  const tint = TINT_INFO[design.tint].label;
  const looks = (lang: "zh" | "en") =>
    [
      MATERIAL_LABEL[design.material][lang],
      tint[lang],
      PATTERN_LABEL[design.pattern][lang],
    ].join(" · ");
  const n = design.stickers.length;
  const dept =
    p.team === "founder"
      ? { zh: "创始团队", en: "Founding team" }
      : TEAM_DEPARTMENTS.find((d) => d.key === p.team)!.name;
  const role = p.position
    ? POSITION_LABEL[p.position]
    : p.title
      ? { zh: p.title, en: p.title }
      : null;
  const photo = p.avatar ?? p.portrait;

  return (
    <dialog
      ref={dlg}
      className={ready ? "tm-zoom ready" : "tm-zoom"}
      aria-labelledby="tm-zname"
      data-lenis-prevent
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        const t = e.target as Element;
        if (
          t === e.currentTarget ||
          t.classList.contains("tm-zbg") ||
          t.classList.contains("tm-zin")
        )
          close();
      }}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        step(e.key === "ArrowRight" ? 1 : -1);
      }}
    >
      <div className="tm-zbg" ref={bg} />
      <button type="button" className="tm-zx" onClick={close}>
        <span aria-hidden>×</span>
        <span className="sr-only">
          <T zh="关闭" en="Close" />
        </span>
      </button>
      <div className="tm-zin">
        <div className="tm-zcard" ref={card}>
          <MemberCard
            key={p.id}
            card={p.card}
            design={p.design}
            flipped={flipped}
            className={shine ? "shine" : undefined}
          />
        </div>
        <div className="tm-zinfo" ref={info}>
          <p className="mono mute">
            <T {...dept} />
            {role && (
              <>
                {" · "}
                <T {...role} />
              </>
            )}
          </p>
          <div className="tm-zwho">
            <div className="tm-media tm-lift">
              {photo ? (
                <Image
                  className="tm-photo"
                  src={photo}
                  alt=""
                  fill
                  sizes="84px"
                />
              ) : (
                <Mascot spark={p.card.spark} />
              )}
              <i className="tm-fade" aria-hidden />
            </div>
            <div>
              <h2 className="tm-zname" id="tm-zname">
                {p.card.nickname}
              </h2>
              <p className="mono mute">
                {p.card.memberNo !== null
                  ? memberCode(p.card.memberNo)
                  : "BS-····"}
                {p.card.seal && ` · ✓ ${p.card.seal}`}
              </p>
            </div>
          </div>
          {p.bio && (
            <p className="tm-zbio">
              <T zh={p.bio} en={p.bioEn ?? p.bio} />
            </p>
          )}
          <dl className="tm-zfacts">
            <div>
              <dt className="mono mute">
                <T zh="卡面" en="Card" />
              </dt>
              <dd>
                <T
                  zh={`${looks("zh")} · ${n} 张贴纸`}
                  en={`${looks("en")} · ${n} sticker${n === 1 ? "" : "s"}`}
                />
              </dd>
            </div>
            {p.card.building && (
              <div>
                <dt className="mono mute">
                  <T zh="正在做" en="Building" />
                </dt>
                <dd>{p.card.building}</dd>
              </div>
            )}
            {p.link && (
              <div>
                <dt className="mono mute">
                  <T zh="链接" en="Link" />
                </dt>
                <dd>
                  <a href={p.link} target="_blank" rel="noopener noreferrer">
                    {linkLabel(p.link)} ↗
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <div className="tm-zact">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setFlipped((f) => !f)}
            >
              {flipped ? (
                <T zh="翻回正面" en="Show front" />
              ) : (
                <T zh="翻到背面" en="Turn over" />
              )}
            </button>
            {list.length > 1 && (
              <span className="tm-znav">
                <button type="button" onClick={() => step(-1)}>
                  <span aria-hidden>←</span>
                  <span className="sr-only">
                    <T zh="上一位" en="Previous" />
                  </span>
                </button>
                <span className="mono">
                  {pad2(i + 1)} / {pad2(list.length)}
                </span>
                <button type="button" onClick={() => step(1)}>
                  <span aria-hidden>→</span>
                  <span className="sr-only">
                    <T zh="下一位" en="Next" />
                  </span>
                </button>
              </span>
            )}
          </div>
          <p className="mono tm-zhint">
            <T
              zh="移动鼠标看卡面光泽 · ← → 换人 · Esc 关闭"
              en="Move the pointer to tilt · ← → next · Esc to close"
            />
          </p>
        </div>
      </div>
    </dialog>
  );
}
