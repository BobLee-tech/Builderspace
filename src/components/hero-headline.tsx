"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import {
  frameLoop,
  hasFinePointer,
  prefersReducedMotion,
  rafThrottle,
  scrambleFrame,
  spring,
} from "./fx/motion";
import { WorksMetal } from "./works-metal";

const TITLE = "Bring an idea.";
const lineStyle = (i: number) => ({ "--i": i }) as CSSProperties;

/** Complete accessible text and split glyphs are prerendered, before JS runs. */
export function HeroHeadline({
  meta,
  children,
}: {
  meta: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = ref.current,
      hero = stage?.closest<HTMLElement>(".hero");
    const h1 = stage?.querySelector<HTMLElement>(".h1x");
    if (!stage || !hero || !h1) return;
    let cancelled = false,
      stop: (() => void) | null = null,
      decodeRaf = 0,
      decodeId = 0;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!cancelled) fn();
      }, ms);
      timers.add(id);
    };
    const chars = [...h1.querySelectorAll<HTMLElement>(".char")];
    const finals = chars.map((c) => c.textContent ?? "");
    const weights = chars.map(() => spring(170, 26));
    const l2 = h1.querySelector<HTMLElement>(".l2 .fx")!;
    const chromes = [...h1.querySelectorAll<HTMLElement>(".chrome2")];
    // Critically damped and about twice as quick as before (~0.4s), so the
    // headline answers the pointer instead of trailing it.
    const tiltX = spring(180, 27),
      tiltY = spring(180, 27),
      radius = spring(200, 28);
    const hud = hero.querySelector<HTMLElement>(".headline-hud")!;
    const hx = hud.querySelector<HTMLElement>(".hud-x")!,
      hy = hud.querySelector<HTMLElement>(".hud-y")!,
      hc = hud.querySelector<HTMLElement>(".hud-c")!;
    const desk = matchMedia("(min-width: 761px)");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let enabled = desk.matches && hasFinePointer() && !reduce.matches;
    type Box = { x: number; y: number; w: number; h: number };
    const box = (el: HTMLElement): Box => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + scrollX,
        y: r.top + scrollY,
        w: r.width,
        h: r.height,
      };
    };
    let geo: {
      hero: Box;
      h1: Box;
      l2: Box;
      chromes: Box[];
      chars: number[][];
    } | null = null;
    const measure = () => {
      if (cancelled) return;
      geo = {
        hero: box(hero),
        h1: box(h1),
        l2: box(l2),
        chromes: chromes.map(box),
        chars: chars.map((c) => {
          const b = box(c);
          return [b.x + b.w / 2, b.y + b.h / 2];
        }),
      };
    };
    const fit = rafThrottle(() => {
      if (cancelled || !stage.getClientRects().length) return;
      stage.style.setProperty("--height-fit", "1");
      if (desk.matches) {
        const available =
          innerHeight -
          (document.querySelector<HTMLElement>(".top")?.offsetHeight ?? 64);
        const excess = hero.offsetHeight - available;
        if (excess > 0)
          stage.style.setProperty(
            "--height-fit",
            String(Math.max(0.85, 1 - excess / h1.offsetHeight)),
          );
      }
      const width = stage.querySelector(".dim-w"),
        font = stage.querySelector(".dim-f");
      if (width) width.textContent = `◂ ${Math.round(stage.clientWidth)} PX ▸`;
      if (font)
        font.textContent = `H1 · UNBOUNDED 800 · ${Math.round(parseFloat(getComputedStyle(h1).fontSize))} / ${Math.round(parseFloat(getComputedStyle(h1.querySelector(".l4")!).fontSize))} PX`;
      measure();
    });
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    addEventListener("resize", fit);
    document.fonts.ready.then(() => {
      if (!cancelled) fit();
    });
    fit();
    const decode = () => {
      if (!enabled) return;
      const start = performance.now(),
        id = ++decodeId;
      cancelAnimationFrame(decodeRaf);
      const tick = (now: number) => {
        if (cancelled || id !== decodeId) return;
        const p = Math.min(1, (now - start) / 1000);
        const text = scrambleFrame(finals.join(""), p);
        chars.forEach((c, i) => {
          c.textContent = [...text][i];
          c.classList.toggle("scr", p < i / chars.length);
        });
        if (p < 1) decodeRaf = requestAnimationFrame(tick);
        else {
          chars.forEach((c, i) => (c.textContent = finals[i]));
          measure();
        }
      };
      decodeRaf = requestAnimationFrame(tick);
    };
    let pointer: [number, number] | null = null,
      visible = false;
    const startTime = performance.now();
    const start = () => {
      if (!enabled || !visible || document.hidden || stop) return;
      stop = frameLoop.add((dt, now) => {
        if (cancelled || !enabled || !visible || document.hidden) {
          stop = null;
          return false;
        }
        if (!geo) return true;
        const real = !!pointer,
          t = (now - startTime) / 1000,
          b = geo.h1;
        const px = real
          ? pointer![0] + scrollX
          : b.x + b.w * (0.5 + 0.46 * Math.sin(t * 0.33));
        const py = real
          ? pointer![1] + scrollY
          : b.y + b.h * (0.42 + 0.36 * Math.sin(t * 0.57 + 1.2));
        chars.forEach((c, i) => {
          const [cx, cy] = geo!.chars[i];
          weights[i].t =
            Math.exp(
              -Math.pow(
                Math.hypot(px - cx, (py - cy) * 0.75) / (real ? 210 : 260),
                2,
              ),
            ) * (real ? 1 : 0.7);
          weights[i].step(dt);
          const k = Math.max(0, Math.min(1, weights[i].x));
          c.style.setProperty("--w", String(Math.round(800 - 520 * k)));
          c.style.setProperty("--lift", `${(-0.07 * k).toFixed(3)}em`);
        });
        radius.t = real ? 230 : 170;
        radius.step(dt);
        l2.style.setProperty("--sr", `${radius.x}px`);
        l2.style.setProperty("--lx", `${px - geo.l2.x}px`);
        l2.style.setProperty("--ly", `${py - geo.l2.y}px`);
        chromes.forEach((c, i) => {
          const r = geo!.chromes[i];
          c.style.setProperty("--sx", `${((px - r.x) / r.w) * 100}%`);
          c.style.setProperty(
            "--cy",
            `${40 + ((py - geo!.hero.y) / geo!.hero.h) * 50}%`,
          );
        });
        tiltX.t = real ? -((py - geo.hero.y) / geo.hero.h - 0.5) * 7 : 0;
        tiltY.t = real ? ((px - geo.hero.x) / geo.hero.w - 0.5) * 9 : 0;
        tiltX.step(dt);
        tiltY.step(dt);
        h1.style.transform = `rotateX(${tiltX.x.toFixed(2)}deg) rotateY(${tiltY.x.toFixed(2)}deg)`;
        if (real) {
          const x = px - geo.hero.x,
            y = py - geo.hero.y;
          hx.style.transform = `translate3d(0,${y}px,0)`;
          hy.style.transform = `translate3d(${x}px,0,0)`;
          hc.style.transform = `translate3d(${x + 14}px,${y + 12}px,0)`;
          hc.textContent = `X ${String(Math.max(0, Math.round(x))).padStart(4, "0")} · Y ${String(Math.max(0, Math.round(y))).padStart(4, "0")}`;
        }
        return true;
      });
    };
    const move = (e: PointerEvent) => {
      if (!enabled || e.pointerType !== "mouse") return;
      pointer = [e.clientX, e.clientY];
      hud.classList.add("on");
    };
    const leave = () => {
      pointer = null;
      hud.classList.remove("on");
    };
    const stopFrames = () => {
      stop?.();
      stop = null;
    };
    const visibility = () => {
      if (document.hidden) stopFrames();
      else start();
    };
    const mode = () => {
      enabled = desk.matches && hasFinePointer() && !reduce.matches;
      if (enabled) start();
      else {
        stopFrames();
        leave();
        h1.style.transform = "";
        chars.forEach((c) => {
          c.style.removeProperty("--w");
          c.style.removeProperty("--lift");
        });
      }
      fit();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) stopFrames();
      else start();
    });
    io.observe(hero);
    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", leave);
    h1.addEventListener("click", decode);
    document.addEventListener("visibilitychange", visibility);
    desk.addEventListener("change", mode);
    reduce.addEventListener("change", mode);
    const works = h1.querySelector<HTMLElement>(".works-wrap")!,
      status = works.querySelector<HTMLElement>(".wstat-t")!,
      bar = works.querySelector<HTMLElement>(".wbar i")!;
    let building = false;
    const build = () => {
      if (building || prefersReducedMotion()) return;
      building = true;
      works.classList.add("busy");
      const steps: [string, number][] = [
        ["BUILD ···", 0.28],
        ["TEST ✓", 0.58],
        ["DEPLOY ✓", 0.86],
        ["200 OK", 1],
      ];
      steps.forEach(([label, p], i) =>
        later(() => {
          status.textContent = label;
          bar.style.transform = `scaleX(${p})`;
        }, i * 420),
      );
      later(() => {
        works.classList.remove("busy");
        later(() => {
          status.textContent = "LIVE · 200 OK";
          bar.style.transform = "scaleX(0)";
          building = false;
        }, 900);
      }, 1880);
    };
    const clickBuild = (e: Event) => {
      e.stopPropagation();
      build();
    };
    works.addEventListener("pointerenter", build);
    works.addEventListener("click", clickBuild);
    stage.classList.add("headline-ready");
    later(decode, 350);
    later(() => {
      stage.classList.add("intro-done");
      fit();
    }, 1700);
    return () => {
      cancelled = true;
      stopFrames();
      cancelAnimationFrame(decodeRaf);
      timers.forEach(clearTimeout);
      ro.disconnect();
      io.disconnect();
      fit.cancel();
      removeEventListener("resize", fit);
      document.removeEventListener("visibilitychange", visibility);
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      h1.removeEventListener("click", decode);
      desk.removeEventListener("change", mode);
      reduce.removeEventListener("change", mode);
      works.removeEventListener("pointerenter", build);
      works.removeEventListener("click", clickBuild);
      chars.forEach((c, i) => {
        c.textContent = finals[i];
        c.style.removeProperty("--w");
        c.style.removeProperty("--lift");
        c.classList.remove("scr");
      });
      h1.style.transform = "";
      ["--sr", "--lx", "--ly"].forEach((name) => l2.style.removeProperty(name));
      chromes.forEach((c) =>
        ["--sx", "--cy"].forEach((name) => c.style.removeProperty(name)),
      );
      [hx, hy, hc].forEach((el) => el.style.removeProperty("transform"));
      stage.style.removeProperty("--height-fit");
      works.classList.remove("busy");
      status.textContent = "LIVE · 200 OK";
      bar.style.transform = "scaleX(0)";
      leave();
      stage.classList.remove("headline-ready", "intro-done");
    };
  }, []);

  return (
    <div className="hstage" ref={ref}>
      <div className="headline-dim mono" aria-hidden>
        <span className="dim-w tnum">— PX</span>
        <i />
        <b className="dim-f tnum">UNBOUNDED 800</b>
      </div>
      <h1
        className="h1x"
        aria-label="Bring an idea. Leave with something that works."
      >
        <span className="line l1" style={lineStyle(0)} aria-hidden>
          <span className="dz">
            <span className="fx">
              {TITLE.split(" ").map((word, i) => (
                <span key={word}>
                  {i > 0 && " "}
                  <span className="word">
                    {[...word].map((c, j) => (
                      <span className="char" key={j}>
                        {c}
                      </span>
                    ))}
                  </span>
                </span>
              ))}
            </span>
          </span>
        </span>
        <span className="line l2 r" style={lineStyle(1)} aria-hidden>
          <span className="dz">
            <span className="fx">Leave with</span>
          </span>
        </span>
        <span className="line l3" style={lineStyle(2)} aria-hidden>
          <span className="dz">
            <span className="fx chrome2">something that</span>
          </span>
        </span>
        <span className="line l4" style={lineStyle(3)} aria-hidden>
          <span className="dz">
            <span className="works-wrap">
              <span className="fx chrome2 works-text">works</span>
              <WorksMetal />
              <span className="wstat mono">
                <i className="led" />
                <span className="wstat-t">LIVE · 200 OK</span>
              </span>
              <span className="wbar">
                <i />
              </span>
            </span>
            <span className="cursor" />
          </span>
        </span>
      </h1>
      <div className="hmeta mono">{meta}</div>
      <div className="hside">{children}</div>
    </div>
  );
}
