"use client";

import { useEffect } from "react";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const STAGGER_MS = 80;

/**
 * Site-wide motion: scroll reveals for anything marked `data-rv`, and the
 * pointer-tracked sheen on project cards.
 *
 * Reveals run through the Web Animations API instead of toggling attributes or
 * classes, so React's hydration never sees a DOM change, and nothing is hidden
 * by CSS: without this script, or with reduced motion, the page is just static.
 */
export function Motion() {
  useEffect(() => {
    const stop = [sheen()];
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stop.push(reveals());
    }
    return () => stop.forEach((fn) => fn());
  }, []);

  return null;
}

function reveals() {
  // Elements held at their starting frame until they scroll into view.
  const armed = new Map<Element, Animation[]>();

  const io = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        io.unobserve(target);
        armed.get(target)?.forEach((a) => a.play());
        armed.delete(target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );

  const arm = (el: Element) => {
    if (armed.has(el)) return;
    // Already on screen (or scrolled past): leave it visible, no pop.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    const delay =
      Number(getComputedStyle(el).getPropertyValue("--i") || 0) * STAGGER_MS;
    const hold = (target: Element, from: Keyframe, duration: number) => {
      // `{}` ends on whatever the stylesheet says, so hover and state styles
      // take over cleanly once the animation is dropped.
      const a = target.animate([from, {}], {
        duration,
        delay,
        easing: EASE,
        fill: "both",
      });
      a.pause();
      a.onfinish = () => a.cancel();
      return a;
    };

    const set = [hold(el, { opacity: 0, translate: "0 22px" }, 900)];
    // Section headlines also pull into focus.
    const headline = el.querySelector(".h2");
    if (headline) set.push(hold(headline, { filter: "blur(10px)" }, 1100));

    armed.set(el, set);
    io.observe(el);
  };

  const scan = (scope: ParentNode) =>
    scope.querySelectorAll("[data-rv]").forEach(arm);
  scan(document);

  // Streamed sections and client navigations add reveal targets later.
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches("[data-rv]")) arm(node);
        scan(node);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  return () => {
    io.disconnect();
    mo.disconnect();
    armed.forEach((set) => set.forEach((a) => a.cancel()));
  };
}

function sheen() {
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !(e.target instanceof Element)) return;
    const card = e.target.closest<HTMLElement>(".pcard");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  // This writes inline styles, so wait until streamed cards have hydrated.
  const timer = window.setTimeout(() => {
    document.addEventListener("pointermove", onMove, { passive: true });
  }, 1500);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("pointermove", onMove);
  };
}
