"use client";
import { useEffect } from "react";
import { hasFinePointer } from "./motion";
import { getSmoothScroller } from "@/lib/smooth-scroll";

/**
 * Whether React has hydrated `el` yet. Streamed sections can arrive in the DOM
 * well before their client code runs, and splitting a title React still has to
 * hydrate makes hydration fail.
 */
const isHydrated = (el: Element) =>
  Object.keys(el).some((key) => key.startsWith("__reactFiber$"));

/** Effects CSS cannot express; each route owns a reversible context. */
export function useScrollAnimations(pathname: string) {
  useEffect(() => {
    let cancelled = false,
      timer = 0,
      revision = 0,
      // Waits for hydration are capped (~5s) so a stuck boundary can't spin.
      waits = 0;
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
      const unhydrated = [
        ...document.querySelectorAll<HTMLElement>("main .h2"),
      ].some((el) => el.getClientRects().length && !isHydrated(el));
      if (unhydrated && waits++ < 40) {
        timer = window.setTimeout(() => void setup(), 120);
        return;
      }
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
                // Lenis already smooths the scroll; a long scrub on top of it lags.
                scrub: 0.25,
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
            // Plays once on entry instead of following the scroll, so a title
            // is readable as soon as it's on screen.
            gsap.from(split.chars, {
              yPercent: 80,
              opacity: 0,
              rotateX: -45,
              transformOrigin: "50% 100%",
              duration: 0.55,
              stagger: 0.02,
              ease: "expo.out",
              scrollTrigger: {
                trigger: el,
                start: "top 92%",
                once: true,
              },
            });
          });
        });
        // The footer's "next page" title animates itself in FootNext: it
        // streams in its own Suspense boundary, and styling it here before
        // React hydrates it causes a hydration mismatch.
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
      waits = 0;
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
