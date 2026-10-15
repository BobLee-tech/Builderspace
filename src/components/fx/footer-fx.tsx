"use client";

import { ArrowRight, ArrowUp } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { scrollToTop } from "@/lib/smooth-scroll";
import { NAV_LINKS, isActive } from "../nav-links";
import { T } from "../t";
import { hasFinePointer, prefersReducedMotion, rafThrottle } from "./motion";

// Every page hands you on to the next one.
const NEXT: Record<string, [string, string, string, string]> = {
  "/": [
    "/events",
    "Events",
    "活动 · 每周同一时间见",
    "Events · same time every week",
  ],
  "/events": [
    "/projects",
    "Projects",
    "项目广场 · 找队友，做东西",
    "Project plaza · find a team, ship a thing",
  ],
  "/projects": [
    "/learn",
    "Resources",
    "资源 · 用 AI 写，逐行读懂",
    "Resources · write with AI, read every line",
  ],
  "/learn": [
    "/people",
    "The builders",
    "成员 · 谁在做这件事",
    "People · who runs the club",
  ],
  "/people": [
    "/join",
    "Start here",
    "加入 · 大约 1 分钟",
    "Join · takes about a minute",
  ],
  "/join": [
    "/events",
    "See you there",
    "活动 · 先来一场 Build Night",
    "Events · come to a Build Night first",
  ],
  "/core-team": [
    "/people",
    "The builders",
    "回成员页 · 看看现在的团队",
    "People · meet the current team",
  ],
};
const BACK_TO_PLAZA: [string, string, string, string] = [
  "/projects",
  "Back to plaza",
  "回到项目广场 · 看看其他项目",
  "Project plaza · see what else is moving",
];

const pageIndex = (path: string) =>
  NAV_LINKS.findIndex(
    (l) => isActive(path, l.href) && (l.href !== "/" || path === "/"),
  );

/** Full-width band at the end of each page that links to the next one. */
export function FootNext() {
  const pathname = usePathname();
  const section = NAV_LINKS.map((l) => l.href)
    .filter((h) => h !== "/")
    .find((h) => pathname.startsWith(h));
  // Pages outside the nav (/join, /core-team) have their own entry.
  const [to, title, zh, en] =
    NEXT[pathname] ??
    (section === "/projects" ? BACK_TO_PLAZA : NEXT[section ?? "/"]) ??
    NEXT["/"];
  const a = pageIndex(pathname);
  const b = pageIndex(to);
  const pad = (n: number) => String(n + 1).padStart(2, "0");
  const band = useRef<HTMLAnchorElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);

  // Lift the title in as the band scrolls up. Runs only after this boundary
  // has hydrated, so the inline styles GSAP writes never reach hydration.
  useEffect(() => {
    const trigger = band.current;
    const target = titleRef.current;
    if (!trigger || !target) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const desk = matchMedia("(min-width: 761px)");
    let revision = 0,
      timer = 0;
    let revert = () => {};
    let refresh = () => {};
    const setup = () => {
      const run = ++revision;
      revert();
      revert = refresh = () => {};
      if (reduce.matches || !desk.matches || !hasFinePointer()) return;
      void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
        ([{ gsap }, { ScrollTrigger }]) => {
          if (run !== revision) return;
          gsap.registerPlugin(ScrollTrigger);
          const ctx = gsap.context(() => {
            gsap.from(target, {
              yPercent: 35,
              opacity: 0.2,
              ease: "none",
              scrollTrigger: {
                trigger,
                start: "top bottom",
                end: "top 55%",
                scrub: 0.6,
              },
            });
          });
          revert = () => ctx.revert();
          refresh = () => ScrollTrigger.refresh();
        },
      );
    };
    // Content streamed into the page moves the band; re-measure once it settles.
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => refresh(), 120);
    });
    ro.observe(document.body);
    reduce.addEventListener("change", setup);
    desk.addEventListener("change", setup);
    setup();
    return () => {
      revision++;
      clearTimeout(timer);
      ro.disconnect();
      reduce.removeEventListener("change", setup);
      desk.removeEventListener("change", setup);
      revert();
    };
  }, [to]);

  return (
    <Link
      ref={band}
      href={to}
      className="foot-next"
      onPointerEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--from",
          e.clientY - r.top < r.height / 2 ? "0%" : "100%",
        );
      }}
    >
      <div className="wrap fn-in">
        <div className="fn-meta mono mute">
          <span>
            <T zh="下一页 / Next" en="Next page" />
          </span>
          <span>{a >= 0 ? `${pad(a)} → ${pad(b)}` : `→ ${pad(b)}`}</span>
        </div>
        <div className="fn-row">
          <span className="fn-title" ref={titleRef}>
            <span className="fn-roll">
              <span>{title}</span>
              <span aria-hidden>{title}</span>
            </span>
          </span>
          <span className="fn-go" aria-hidden>
            <ArrowRight weight="light" size="1em" />
          </span>
        </div>
        <span className="fn-sub">
          <T zh={zh} en={en} />
        </span>
      </div>
    </Link>
  );
}

const CH = ".,-~:;=!*#$@";
const TORUS_J = Array.from({ length: 90 }, (_, i) => [
  Math.cos(i * 0.07),
  Math.sin(i * 0.07),
]);
const TORUS_I = Array.from({ length: 314 }, (_, i) => [
  Math.cos(i * 0.02),
  Math.sin(i * 0.02),
]);

function torus(A: number, B: number, w: number, h: number) {
  const out = new Array<string>(w * h).fill(" ");
  const z = new Array<number>(w * h).fill(0);
  const cA = Math.cos(A),
    sA = Math.sin(A),
    cB = Math.cos(B),
    sB = Math.sin(B);
  for (const [ct, st] of TORUS_J) {
    for (const [cp, sp] of TORUS_I) {
      const hh = ct + 2;
      const D = 1 / (sp * hh * sA + st * cA + 5);
      const t = sp * hh * cA - st * sA;
      const x = 0 | (w / 2 + w * 0.38 * D * (cp * hh * cB - t * sB));
      const y = 0 | (h / 2 + h * 0.75 * D * (cp * hh * sB + t * cB));
      const o = x + w * y;
      const N =
        0 |
        (8 *
          ((st * sA - sp * ct * cA) * cB -
            sp * ct * sA -
            st * cA -
            cp * ct * sB));
      if (y >= 0 && y < h && x >= 0 && x < w && D > z[o]) {
        z[o] = D;
        out[o] = CH[N > 0 ? N : 0];
      }
    }
  }
  let s = "";
  for (let k = 0; k < h; k++) s += out.slice(k * w, k * w + w).join("") + "\n";
  return s;
}

/** The classic spinning ASCII donut, only animated while on screen. */
export function AsciiTorus() {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let A = 1,
      B = 1,
      raf = 0,
      visible = false,
      last = 0;
    el.textContent = torus(A, B, 64, 30);
    if (prefersReducedMotion()) return;
    const paint = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      if (now - last >= 1000 / 30) {
        const dt = Math.min(0.1, (now - last) / 1000 || 1 / 30);
        A += dt;
        B += dt * 0.6;
        el.textContent = torus(A, B, 64, 30);
        last = now;
      }
      raf = requestAnimationFrame(paint);
    };
    const start = () => {
      if (!visible || document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(paint);
      }
    };
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      start();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", start);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", start);
    };
  }, []);

  return <pre className="ascii" ref={ref} aria-hidden />;
}

const RING = 2 * Math.PI * 20;

/** Back-to-top button whose ring fills with scroll progress. */
export function ToTop() {
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const update = rafThrottle(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const k = max > 0 ? Math.min(1, scrollY / max) : 0;
      ring.current?.style.setProperty(
        "stroke-dashoffset",
        String(RING * (1 - k)),
      );
    });
    addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      update.cancel();
      removeEventListener("scroll", update);
    };
  }, []);

  return (
    <button
      className="totop"
      type="button"
      aria-label="Back to top / 回到顶部"
      onClick={() => {
        if (!scrollToTop())
          scrollTo({
            top: 0,
            behavior: prefersReducedMotion() ? "auto" : "smooth",
          });
      }}
    >
      <svg viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r="20" className="tt-bg" />
        <circle
          cx="22"
          cy="22"
          r="20"
          className="tt-fg"
          ref={ring}
          style={{ strokeDasharray: RING, strokeDashoffset: RING }}
        />
      </svg>
      <span aria-hidden>
        <ArrowUp weight="light" size={18} />
      </span>
    </button>
  );
}
