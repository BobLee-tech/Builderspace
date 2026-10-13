"use client";
import { useEffect } from "react";
import { hasFinePointer } from "./motion";
import { getSmoothScroller } from "@/lib/smooth-scroll";

/** Only the three effects CSS cannot express; each route owns a reversible context. */
export function useScrollAnimations(pathname: string) {
  useEffect(() => {
    let cancelled = false,
      timer = 0,
      revision = 0;
    let revert = () => {};
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const desk = matchMedia("(min-width: 761px)");
    const main = document.querySelector("main");
    const setup = async () => {
      const run = ++revision;
      revert();
      revert = () => {};
      if (reduce.matches || !desk.matches || !hasFinePointer()) return;
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
      ]);
      await document.fonts.ready;
      if (cancelled || run !== revision) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);
      const splits: SplitText[] = [],
        titles: HTMLElement[] = [];
      const ctx = gsap.context(() => {
        // HeroMetal already owns vertical drift + fade. Only lateral offsets here.
        const hero = [
          ...document.querySelectorAll<HTMLElement>(".hero-poster"),
        ].find((el) => el.getClientRects().length);
        if (hero) {
          [
            [".l1", -6],
            [".l2", 7],
            [".l3", -3],
            [".l4", 10],
          ].forEach(([selector, offset]) => {
            const line = hero.querySelector(String(selector));
            gsap.to(line, {
              xPercent: offset,
              ease: "none",
              scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: 0.6,
              },
            });
          });
        }
        document.querySelectorAll<HTMLElement>("main .h2").forEach((el) => {
          if (!el.getClientRects().length) return;
          const language = [
            ...el.querySelectorAll<HTMLElement>("[data-l]"),
          ].filter((part) => getComputedStyle(part).display !== "none");
          const targets = language.length ? language : [el];
          titles.push(el);
          el.dataset.gsapTitle = "";
          targets.forEach((target) => {
            const split = SplitText.create(target, {
              type: "chars",
              aria: "auto",
              charsClass: "scroll-char",
            });
            splits.push(split);
            gsap.from(split.chars, {
              yPercent: 110,
              opacity: 0,
              rotateX: -60,
              transformOrigin: "50% 100%",
              stagger: 0.05,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top 92%",
                end: "top 62%",
                scrub: 0.6,
              },
            });
          });
        });
        const next = document.querySelector<HTMLElement>(".foot-next");
        if (next)
          gsap.from(next.querySelector(".fn-title"), {
            yPercent: 35,
            opacity: 0.2,
            ease: "none",
            scrollTrigger: {
              trigger: next,
              start: "top bottom",
              end: "top 55%",
              scrub: 0.6,
            },
          });
      });
      revert = () => {
        ctx.revert();
        splits.forEach((split) => split.revert());
        titles.forEach((el) => delete el.dataset.gsapTitle);
      };
      getSmoothScroller()?.resize();
      ScrollTrigger.refresh();
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        void setup();
      }, 80);
    };
    // Streamed content may arrive after the route shell. Ignore our own split DOM,
    // and live clocks/typewriters/hero decoding, which should never rebuild triggers.
    const mo = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            !(
              record.target instanceof Element &&
              record.target.closest(".h2, .h1x")
            ) &&
            [...record.addedNodes, ...record.removedNodes].some(
              (node) =>
                node instanceof Element &&
                (node.matches(".h2") || node.querySelector(".h2")),
            ),
        )
      )
        schedule();
    });
    if (main) mo.observe(main, { childList: true, subtree: true });
    const lang = new MutationObserver(schedule);
    lang.observe(document.documentElement, { attributeFilter: ["data-lang"] });
    const visibility = () => {
      if (!document.hidden) schedule();
    };
    document.addEventListener("visibilitychange", visibility);
    desk.addEventListener("change", schedule);
    reduce.addEventListener("change", schedule);
    void setup();
    return () => {
      cancelled = true;
      revision++;
      clearTimeout(timer);
      mo.disconnect();
      lang.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      desk.removeEventListener("change", schedule);
      reduce.removeEventListener("change", schedule);
      revert();
    };
  }, [pathname]);
}
