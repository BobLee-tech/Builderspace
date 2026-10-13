"use client";

import { useEffect, useRef } from "react";

/**
 * The porcelain pill behind the nav: sits under the current page's link and
 * slides to preview whichever link the pointer is on.
 */
export function NavPill() {
  const pill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = pill.current;
    const nav = el?.parentElement;
    if (!el || !nav) return;
    nav.classList.add("has-pill");
    const links = () => [...nav.querySelectorAll<HTMLAnchorElement>("a")];
    const current = () =>
      nav.querySelector<HTMLAnchorElement>('a[aria-current="page"]');

    const moveTo = (a: HTMLElement | null) => {
      if (!a || !a.offsetWidth) {
        el.style.width = "0";
        return;
      }
      el.style.width = `${a.offsetWidth}px`;
      el.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    const sync = () => {
      links().forEach((a) => a.classList.remove("peek", "peek-other"));
      moveTo(current());
    };
    const onOver = (e: PointerEvent) => {
      const a = (e.target as Element).closest?.("a");
      if (!a || !nav.contains(a)) return;
      moveTo(a);
      links().forEach((l) => {
        l.classList.toggle("peek", l === a);
        l.classList.toggle("peek-other", l !== a);
      });
    };

    nav.addEventListener("pointerover", onOver);
    nav.addEventListener("pointerleave", sync);
    addEventListener("resize", sync);
    document.fonts?.ready.then(sync);
    // Route changes flip aria-current; language changes resize the labels.
    const mo = new MutationObserver(sync);
    mo.observe(nav, {
      subtree: true,
      childList: true,
      attributeFilter: ["aria-current"],
    });
    mo.observe(document.documentElement, { attributeFilter: ["data-lang"] });
    sync();

    return () => {
      nav.classList.remove("has-pill");
      nav.removeEventListener("pointerover", onOver);
      nav.removeEventListener("pointerleave", sync);
      removeEventListener("resize", sync);
      mo.disconnect();
    };
  }, []);

  return <span className="nav-pill" ref={pill} aria-hidden />;
}
