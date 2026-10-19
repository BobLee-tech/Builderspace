"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Arr } from "@/components/fx/arr";
import { T } from "@/components/t";

/** Matches the event.css breakpoint where the form sits beside the intro. */
const SIDE_BY_SIDE = "(min-width: 961px)";

/**
 * Phones and narrow windows: a bar above the site dock that jumps to the
 * form, hidden while the form is on screen. Wide screens never show it.
 */
export function SignupDock({
  title,
  zh,
  en,
  waitlist,
}: {
  title: ReactNode;
  zh: string;
  en: string;
  waitlist: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = ref.current;
    const form = document.getElementById("signup");
    if (!bar || !form) return;
    const io = new IntersectionObserver(
      ([entry]) => bar.toggleAttribute("data-away", entry.isIntersecting),
      { threshold: 0.15 },
    );
    io.observe(form);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="evp-dock" data-away="">
      <p>
        <b>{title}</b>
        <span className="mute">
          <T zh={zh} en={en} />
        </span>
      </p>
      <a href="#signup" className="btn solid primary">
        {waitlist ? (
          <T zh="候补" en="Waitlist" />
        ) : (
          <T zh="报名" en="Sign up" />
        )}{" "}
        <Arr />
      </a>
    </div>
  );
}

/**
 * Arriving on #signup with the form beside the intro, the page stays at the
 * top (event.css keeps the title in view); this puts the cursor in the
 * first field and flashes the card so it's clear where to start.
 */
export function SignupFocus() {
  useEffect(() => {
    // After the router has written the hash and finished its own scroll.
    const id = requestAnimationFrame(() => {
      if (window.location.hash !== "#signup") return;
      if (!window.matchMedia(SIDE_BY_SIDE).matches) return;
      const panel = document.querySelector<HTMLElement>("#signup .evp-panel");
      panel
        ?.querySelector<HTMLInputElement>("input[name=fullName]")
        ?.focus({ preventScroll: true });
      panel?.classList.add("ping");
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}
